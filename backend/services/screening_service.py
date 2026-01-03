"""Screening workflow service."""
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from models import (
    Study, StudyStatus, ScreeningRecord, ScreeningDecision, 
    ScreeningStage, ScreeningConflict, ConflictStatus,
    StudyScreeningView, AuditAction
)
from services.audit_service import AuditService


class ScreeningService:
    def __init__(self, db):
        self.db = db
        self.studies = db.studies
        self.screening_records = db.screening_records
        self.conflicts = db.screening_conflicts
        self.audit = AuditService(db)
    
    async def get_pending_studies(self, 
                                   project_id: str, 
                                   stage: ScreeningStage,
                                   reviewer_id: str = "default_user",
                                   limit: int = 50) -> List[StudyScreeningView]:
        """Get studies pending screening for a reviewer."""
        # Determine which status to filter by
        if stage == ScreeningStage.TITLE_ABSTRACT:
            status_filter = [StudyStatus.IMPORTED.value, StudyStatus.TITLE_ABSTRACT_PENDING.value]
        else:
            status_filter = [StudyStatus.FULL_TEXT_PENDING.value]
        
        # Get studies not yet screened by this reviewer at this stage
        pipeline = [
            {"$match": {"project_id": project_id, "status": {"$in": status_filter}}},
            {"$lookup": {
                "from": "screening_records",
                "let": {"study_id": "$id"},
                "pipeline": [
                    {"$match": {
                        "$expr": {
                            "$and": [
                                {"$eq": ["$study_id", "$$study_id"]},
                                {"$eq": ["$stage", stage.value]},
                                {"$eq": ["$reviewer_id", reviewer_id]}
                            ]
                        }
                    }}
                ],
                "as": "my_decisions"
            }},
            {"$match": {"my_decisions": {"$size": 0}}},
            {"$limit": limit}
        ]
        
        cursor = self.studies.aggregate(pipeline)
        studies = await cursor.to_list(limit)
        
        result = []
        for s in studies:
            study = Study(**{k: v for k, v in s.items() if k != '_id' and k != 'my_decisions'})
            
            # Count other decisions
            other_count = await self.screening_records.count_documents({
                "study_id": study.id,
                "stage": stage.value,
                "reviewer_id": {"$ne": reviewer_id}
            })
            
            result.append(StudyScreeningView(
                study=study,
                my_decision=None,
                other_decisions_count=other_count,
                has_conflict=False
            ))
        
        return result
    
    async def record_decision(self,
                              project_id: str,
                              study_id: str,
                              stage: ScreeningStage,
                              decision: ScreeningDecision,
                              reviewer_id: str = "default_user",
                              exclusion_reason: Optional[str] = None,
                              notes: Optional[str] = None) -> Tuple[ScreeningRecord, Optional[ScreeningConflict]]:
        """Record a screening decision and check for conflicts."""
        
        # Validate exclusion reason is provided for exclude decisions
        if decision == ScreeningDecision.EXCLUDE and not exclusion_reason:
            raise ValueError("Exclusion reason is required for exclude decisions")
        
        # Check if reviewer already made a decision
        existing = await self.screening_records.find_one({
            "study_id": study_id,
            "stage": stage.value,
            "reviewer_id": reviewer_id
        })
        if existing:
            raise ValueError("Reviewer has already made a decision for this study at this stage")
        
        # Create screening record
        record = ScreeningRecord(
            study_id=study_id,
            project_id=project_id,
            reviewer_id=reviewer_id,
            stage=stage,
            decision=decision,
            exclusion_reason=exclusion_reason,
            notes=notes
        )
        
        doc = record.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await self.screening_records.insert_one(doc)
        
        # Audit log
        await self.audit.log(
            project_id=project_id,
            study_id=study_id,
            action=AuditAction.SCREENING_DECISION,
            user_id=reviewer_id,
            details={
                "stage": stage.value,
                "decision": decision.value,
                "exclusion_reason": exclusion_reason
            }
        )
        
        # Check for agreement/conflict with other reviewers
        conflict = await self._check_for_conflict(project_id, study_id, stage, record)
        
        return record, conflict
    
    async def _check_for_conflict(self,
                                   project_id: str,
                                   study_id: str,
                                   stage: ScreeningStage,
                                   new_record: ScreeningRecord) -> Optional[ScreeningConflict]:
        """Check if there's a conflict with another reviewer's decision."""
        # Get all decisions for this study at this stage
        cursor = self.screening_records.find({
            "study_id": study_id,
            "stage": stage.value,
            "reviewer_id": {"$ne": new_record.reviewer_id}
        })
        other_decisions = await cursor.to_list(10)
        
        if not other_decisions:
            # Update study status to pending (waiting for second reviewer)
            new_status = StudyStatus.TITLE_ABSTRACT_PENDING if stage == ScreeningStage.TITLE_ABSTRACT else StudyStatus.FULL_TEXT_PENDING
            await self.studies.update_one(
                {"id": study_id},
                {"$set": {"status": new_status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return None
        
        # Check for agreement
        other_record = ScreeningRecord(**{k: v for k, v in other_decisions[0].items() if k != '_id'})
        
        # Agreement logic: both include, both exclude, or both maybe
        if new_record.decision == other_record.decision:
            # Agreement - update study status
            if new_record.decision == ScreeningDecision.INCLUDE:
                if stage == ScreeningStage.TITLE_ABSTRACT:
                    new_status = StudyStatus.FULL_TEXT_PENDING
                else:
                    new_status = StudyStatus.INCLUDED
            elif new_record.decision == ScreeningDecision.EXCLUDE:
                new_status = StudyStatus.EXCLUDED
            else:  # MAYBE - treat as conflict for adjudication
                return await self._create_conflict(project_id, study_id, stage, other_record, new_record)
            
            await self.studies.update_one(
                {"id": study_id},
                {"$set": {"status": new_status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return None
        else:
            # Conflict - create conflict record
            return await self._create_conflict(project_id, study_id, stage, other_record, new_record)
    
    async def _create_conflict(self,
                                project_id: str,
                                study_id: str,
                                stage: ScreeningStage,
                                record1: ScreeningRecord,
                                record2: ScreeningRecord) -> ScreeningConflict:
        """Create a conflict record for adjudication."""
        conflict = ScreeningConflict(
            study_id=study_id,
            project_id=project_id,
            stage=stage,
            reviewer1_id=record1.reviewer_id,
            reviewer1_decision=record1.decision,
            reviewer2_id=record2.reviewer_id,
            reviewer2_decision=record2.decision
        )
        
        doc = conflict.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc['resolved_at']:
            doc['resolved_at'] = doc['resolved_at'].isoformat()
        await self.conflicts.insert_one(doc)
        
        # Audit log
        await self.audit.log(
            project_id=project_id,
            study_id=study_id,
            action=AuditAction.CONFLICT_CREATED,
            details={
                "stage": stage.value,
                "reviewer1": record1.reviewer_id,
                "decision1": record1.decision.value,
                "reviewer2": record2.reviewer_id,
                "decision2": record2.decision.value
            }
        )
        
        return conflict
    
    async def get_conflicts(self, 
                            project_id: str, 
                            stage: Optional[ScreeningStage] = None,
                            status: ConflictStatus = ConflictStatus.PENDING) -> List[dict]:
        """Get conflicts for a project."""
        query = {"project_id": project_id, "status": status.value}
        if stage:
            query["stage"] = stage.value
        
        cursor = self.conflicts.find(query, {"_id": 0})
        conflicts = await cursor.to_list(100)
        return conflicts
    
    async def resolve_conflict(self,
                               conflict_id: str,
                               final_decision: ScreeningDecision,
                               resolver_id: str = "default_user",
                               resolution_notes: Optional[str] = None) -> ScreeningConflict:
        """Resolve a screening conflict."""
        conflict_doc = await self.conflicts.find_one({"id": conflict_id})
        if not conflict_doc:
            raise ValueError("Conflict not found")
        
        conflict = ScreeningConflict(**{k: v for k, v in conflict_doc.items() if k != '_id'})
        
        if conflict.status == ConflictStatus.RESOLVED:
            raise ValueError("Conflict is already resolved")
        
        now = datetime.now(timezone.utc)
        
        # Update conflict
        await self.conflicts.update_one(
            {"id": conflict_id},
            {"$set": {
                "status": ConflictStatus.RESOLVED.value,
                "resolved_by": resolver_id,
                "final_decision": final_decision.value,
                "resolution_notes": resolution_notes,
                "resolved_at": now.isoformat()
            }}
        )
        
        # Update study status based on final decision
        if final_decision == ScreeningDecision.INCLUDE:
            if conflict.stage == ScreeningStage.TITLE_ABSTRACT:
                new_status = StudyStatus.FULL_TEXT_PENDING
            else:
                new_status = StudyStatus.INCLUDED
        else:
            new_status = StudyStatus.EXCLUDED
        
        await self.studies.update_one(
            {"id": conflict.study_id},
            {"$set": {"status": new_status.value, "updated_at": now.isoformat()}}
        )
        
        # Audit log
        await self.audit.log(
            project_id=conflict.project_id,
            study_id=conflict.study_id,
            action=AuditAction.CONFLICT_RESOLVED,
            user_id=resolver_id,
            details={
                "conflict_id": conflict_id,
                "final_decision": final_decision.value,
                "resolution_notes": resolution_notes
            }
        )
        
        # Return updated conflict
        updated_doc = await self.conflicts.find_one({"id": conflict_id}, {"_id": 0})
        return ScreeningConflict(**updated_doc)
