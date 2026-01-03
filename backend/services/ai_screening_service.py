"""AI-assisted screening service."""
import os
import json
import logging
from typing import Optional, Dict, Any
from models import ScreeningDecision, AuditAction
from services.audit_service import AuditService

logger = logging.getLogger(__name__)


class AIScreeningService:
    """Service for AI-assisted screening suggestions."""
    
    def __init__(self, db, llm_client=None):
        self.db = db
        self.studies = db.studies
        self.ai_suggestions = db.ai_screening_suggestions
        self.audit = AuditService(db)
        self.llm_client = llm_client
    
    async def get_ai_suggestion(self, study_id: str, project_id: str, 
                                 criteria: Optional[str] = None) -> Dict[str, Any]:
        """Get AI suggestion for screening a study.
        
        Returns:
            {
                "decision": "include" | "exclude" | "maybe",
                "confidence": 0.0-1.0,
                "reasoning": "explanation",
                "relevant_criteria": ["criterion1", "criterion2"]
            }
        """
        # Check for cached suggestion
        existing = await self.ai_suggestions.find_one({
            "study_id": study_id,
            "project_id": project_id
        }, {"_id": 0})
        
        if existing:
            return existing
        
        # Get study details
        study = await self.studies.find_one({"id": study_id}, {"_id": 0})
        if not study:
            raise ValueError("Study not found")
        
        if not self.llm_client:
            # Return placeholder if no LLM
            return {
                "study_id": study_id,
                "project_id": project_id,
                "decision": "maybe",
                "confidence": 0.0,
                "reasoning": "AI screening not available - no LLM configured",
                "relevant_criteria": [],
                "is_available": False
            }
        
        # Build prompt
        title = study.get('title', '')
        abstract = study.get('abstract', '')
        
        criteria_text = criteria or "Include studies that are relevant to the research question. Exclude studies that are not original research, reviews, or not relevant."
        
        prompt = f"""You are a systematic review screening assistant. Your task is to help screen studies for inclusion/exclusion.

STUDY TO SCREEN:
Title: {title}

Abstract: {abstract}

SCREENING CRITERIA:
{criteria_text}

INSTRUCTIONS:
1. Carefully read the title and abstract
2. Evaluate against the screening criteria
3. Provide a preliminary recommendation
4. Be conservative - when uncertain, recommend "maybe" for human review

Respond with ONLY valid JSON in this exact format:
{{
    "decision": "include" | "exclude" | "maybe",
    "confidence": 0.0 to 1.0,
    "reasoning": "Brief explanation of your recommendation (2-3 sentences)",
    "relevant_criteria": ["list of criteria that led to this decision"]
}}

IMPORTANT: 
- If the abstract is missing or too short, recommend "maybe"
- If there's any uncertainty, recommend "maybe"
- Never auto-include or auto-exclude without clear evidence"""

        try:
            response = await self.llm_client.generate(prompt)
            
            # Parse response
            response_text = response.strip()
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1])
            
            result = json.loads(response_text)
            
            # Validate and normalize
            decision = result.get('decision', 'maybe').lower()
            if decision not in ['include', 'exclude', 'maybe']:
                decision = 'maybe'
            
            suggestion = {
                "study_id": study_id,
                "project_id": project_id,
                "decision": decision,
                "confidence": min(1.0, max(0.0, float(result.get('confidence', 0.5)))),
                "reasoning": result.get('reasoning', ''),
                "relevant_criteria": result.get('relevant_criteria', []),
                "is_available": True
            }
            
            # Cache the suggestion
            await self.ai_suggestions.insert_one(suggestion)
            
            # Audit log
            await self.audit.log(
                project_id=project_id,
                study_id=study_id,
                action=AuditAction.EXTRACTION_AI_SUGGESTED,
                details={"type": "screening_suggestion", "decision": decision, "confidence": suggestion['confidence']}
            )
            
            return suggestion
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            return {
                "study_id": study_id,
                "project_id": project_id,
                "decision": "maybe",
                "confidence": 0.0,
                "reasoning": "Failed to parse AI response",
                "relevant_criteria": [],
                "is_available": False
            }
        except Exception as e:
            logger.error(f"AI screening suggestion failed: {e}")
            return {
                "study_id": study_id,
                "project_id": project_id,
                "decision": "maybe",
                "confidence": 0.0,
                "reasoning": f"AI error: {str(e)}",
                "relevant_criteria": [],
                "is_available": False
            }
    
    async def get_batch_suggestions(self, project_id: str, study_ids: list, 
                                     criteria: Optional[str] = None) -> Dict[str, Dict]:
        """Get AI suggestions for multiple studies."""
        results = {}
        for study_id in study_ids:
            try:
                suggestion = await self.get_ai_suggestion(study_id, project_id, criteria)
                results[study_id] = suggestion
            except Exception as e:
                logger.error(f"Failed to get suggestion for {study_id}: {e}")
                results[study_id] = {
                    "study_id": study_id,
                    "decision": "maybe",
                    "confidence": 0.0,
                    "reasoning": str(e),
                    "is_available": False
                }
        return results
