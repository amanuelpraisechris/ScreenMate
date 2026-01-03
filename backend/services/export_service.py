"""Export service for generating CSV exports."""
import csv
import io
from datetime import datetime, timezone
from typing import List, Optional
from models import AuditAction
from services.audit_service import AuditService


class ExportService:
    def __init__(self, db):
        self.db = db
        self.projects = db.projects
        self.studies = db.studies
        self.screening_records = db.screening_records
        self.extracted_data = db.extracted_data
        self.templates = db.extraction_templates
        self.audit = AuditService(db)
    
    async def export_screening_decisions(self, project_id: str, 
                                          stage: Optional[str] = None) -> str:
        """Export screening decisions to CSV."""
        # Build query
        query = {"project_id": project_id}
        if stage:
            query["stage"] = stage
        
        # Get all studies
        studies_cursor = self.studies.find({"project_id": project_id}, {"_id": 0})
        studies = {s['id']: s for s in await studies_cursor.to_list(10000)}
        
        # Get all screening records
        records_cursor = self.screening_records.find(query, {"_id": 0})
        records = await records_cursor.to_list(100000)
        
        # Group by study
        study_decisions = {}
        for record in records:
            study_id = record['study_id']
            if study_id not in study_decisions:
                study_decisions[study_id] = []
            study_decisions[study_id].append(record)
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'Study ID', 'Title', 'Authors', 'Year', 'Journal', 'DOI',
            'Status', 'Stage', 
            'Reviewer 1', 'Decision 1', 'Exclusion Reason 1',
            'Reviewer 2', 'Decision 2', 'Exclusion Reason 2',
            'Final Decision'
        ])
        
        # Data rows
        for study_id, study in studies.items():
            decisions = study_decisions.get(study_id, [])
            
            # Sort decisions by stage and then by reviewer
            ta_decisions = [d for d in decisions if d.get('stage') == 'title_abstract']
            ft_decisions = [d for d in decisions if d.get('stage') == 'full_text']
            
            for stage_name, stage_decisions in [('title_abstract', ta_decisions), ('full_text', ft_decisions)]:
                if not stage_decisions and stage:
                    continue
                
                row = [
                    study_id,
                    study.get('title', ''),
                    ', '.join(study.get('authors', []) or []),
                    study.get('year', ''),
                    study.get('journal', ''),
                    study.get('doi', ''),
                    study.get('status', ''),
                    stage_name
                ]
                
                # Add up to 2 reviewer decisions
                for i in range(2):
                    if i < len(stage_decisions):
                        d = stage_decisions[i]
                        row.extend([
                            d.get('reviewer_id', ''),
                            d.get('decision', ''),
                            d.get('exclusion_reason', '')
                        ])
                    else:
                        row.extend(['', '', ''])
                
                # Final decision (based on agreement or conflict resolution)
                final = ''
                if len(stage_decisions) >= 2:
                    if stage_decisions[0].get('decision') == stage_decisions[1].get('decision'):
                        final = stage_decisions[0].get('decision', '')
                    else:
                        final = 'CONFLICT'
                elif len(stage_decisions) == 1:
                    final = 'PENDING_SECOND_REVIEWER'
                
                row.append(final)
                writer.writerow(row)
        
        # Log export
        await self.audit.log(
            project_id=project_id,
            action=AuditAction.EXPORT_CREATED,
            details={"type": "screening_decisions", "stage": stage}
        )
        
        return output.getvalue()
    
    async def export_extraction_data(self, project_id: str, 
                                      template_id: Optional[str] = None) -> str:
        """Export extracted data to CSV with evidence anchors."""
        # Build query
        query = {"project_id": project_id}
        if template_id:
            query["template_id"] = template_id
        
        # Get studies
        studies_cursor = self.studies.find({"project_id": project_id}, {"_id": 0})
        studies = {s['id']: s for s in await studies_cursor.to_list(10000)}
        
        # Get template
        template = None
        if template_id:
            template = await self.templates.find_one({"id": template_id}, {"_id": 0})
        else:
            # Get first template for project
            template = await self.templates.find_one({"project_id": project_id}, {"_id": 0})
        
        if not template:
            return "No extraction template found"
        
        # Get extracted data
        extractions_cursor = self.extracted_data.find(query, {"_id": 0})
        extractions = await extractions_cursor.to_list(10000)
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Build header
        header = ['Study ID', 'Title', 'Authors', 'Year', 'Status']
        
        # Add field columns (value, quote, page for each field)
        fields = template.get('fields', [])
        for field in fields:
            field_name = field.get('name', '')
            header.extend([
                f"{field_name}",
                f"{field_name}_Quote",
                f"{field_name}_Page",
                f"{field_name}_Verified",
                f"{field_name}_Verified_By"
            ])
        
        writer.writerow(header)
        
        # Create extraction lookup
        extraction_by_study = {e['study_id']: e for e in extractions}
        
        # Data rows
        for study_id, study in studies.items():
            if study.get('status') not in ['included', 'full_text_screened']:
                continue
            
            row = [
                study_id,
                study.get('title', ''),
                ', '.join(study.get('authors', []) or []),
                study.get('year', ''),
                study.get('status', '')
            ]
            
            extraction = extraction_by_study.get(study_id)
            values_by_field = {}
            if extraction:
                for v in extraction.get('values', []):
                    values_by_field[v.get('field_id')] = v
            
            for field in fields:
                field_id = field.get('id')
                v = values_by_field.get(field_id, {})
                row.extend([
                    v.get('value', ''),
                    v.get('quote', ''),
                    v.get('page', ''),
                    'Yes' if v.get('is_verified') else 'No',
                    v.get('verified_by', '')
                ])
            
            writer.writerow(row)
        
        # Log export
        await self.audit.log(
            project_id=project_id,
            action=AuditAction.EXPORT_CREATED,
            details={"type": "extraction_data", "template_id": template_id}
        )
        
        return output.getvalue()
