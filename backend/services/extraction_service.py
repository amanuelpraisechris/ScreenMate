"""AI-assisted extraction service."""
import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from models import (
    ExtractionTemplate, ExtractionField, ExtractedData, ExtractedValue,
    AIExtractionSuggestion, AuditAction, ExtractionFieldType
)
from services.audit_service import AuditService

logger = logging.getLogger(__name__)


class ExtractionService:
    def __init__(self, db, llm_client=None):
        self.db = db
        self.templates = db.extraction_templates
        self.extracted_data = db.extracted_data
        self.studies = db.studies
        self.audit = AuditService(db)
        self.llm_client = llm_client
    
    # Template Management
    async def create_template(self, project_id: str, name: str, 
                              description: Optional[str] = None,
                              fields: List[dict] = None) -> ExtractionTemplate:
        """Create an extraction template for a project."""
        template_fields = []
        if fields:
            for i, f in enumerate(fields):
                field = ExtractionField(
                    name=f['name'],
                    field_type=f['field_type'],
                    instruction=f['instruction'],
                    options=f.get('options'),
                    required=f.get('required', False),
                    order=f.get('order', i)
                )
                template_fields.append(field)
        
        template = ExtractionTemplate(
            project_id=project_id,
            name=name,
            description=description,
            fields=template_fields
        )
        
        doc = template.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        # Convert field models to dicts
        doc['fields'] = [f.model_dump() for f in template_fields]
        
        await self.templates.insert_one(doc)
        return template
    
    async def get_template(self, template_id: str) -> Optional[ExtractionTemplate]:
        """Get an extraction template by ID."""
        doc = await self.templates.find_one({"id": template_id}, {"_id": 0})
        if doc:
            return ExtractionTemplate(**doc)
        return None
    
    async def get_project_templates(self, project_id: str) -> List[ExtractionTemplate]:
        """Get all templates for a project."""
        cursor = self.templates.find({"project_id": project_id}, {"_id": 0})
        docs = await cursor.to_list(100)
        return [ExtractionTemplate(**d) for d in docs]
    
    async def update_template(self, template_id: str, 
                              name: Optional[str] = None,
                              description: Optional[str] = None,
                              fields: Optional[List[dict]] = None) -> ExtractionTemplate:
        """Update an extraction template."""
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description
        if fields is not None:
            template_fields = []
            for i, f in enumerate(fields):
                field = ExtractionField(
                    id=f.get('id'),
                    name=f['name'],
                    field_type=f['field_type'],
                    instruction=f['instruction'],
                    options=f.get('options'),
                    required=f.get('required', False),
                    order=f.get('order', i)
                )
                template_fields.append(field.model_dump())
            update_data["fields"] = template_fields
        
        await self.templates.update_one({"id": template_id}, {"$set": update_data})
        return await self.get_template(template_id)
    
    # Extraction Management
    async def get_or_create_extraction(self, study_id: str, project_id: str, 
                                        template_id: str) -> ExtractedData:
        """Get existing extraction data or create new empty one."""
        existing = await self.extracted_data.find_one({
            "study_id": study_id,
            "template_id": template_id
        }, {"_id": 0})
        
        if existing:
            return ExtractedData(**existing)
        
        # Get template to initialize empty values
        template = await self.get_template(template_id)
        if not template:
            raise ValueError("Template not found")
        
        values = []
        for field in template.fields:
            values.append(ExtractedValue(
                field_id=field.id,
                field_name=field.name,
                value=None,
                quote=None,
                page=None,
                is_found=False,
                is_ai_suggested=False,
                is_verified=False
            ))
        
        extraction = ExtractedData(
            study_id=study_id,
            project_id=project_id,
            template_id=template_id,
            values=values
        )
        
        doc = extraction.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        doc['values'] = [v.model_dump() for v in values]
        for v in doc['values']:
            if v.get('verified_at'):
                v['verified_at'] = v['verified_at'].isoformat()
        
        await self.extracted_data.insert_one(doc)
        return extraction
    
    async def get_extraction(self, extraction_id: str) -> Optional[ExtractedData]:
        """Get extraction data by ID."""
        doc = await self.extracted_data.find_one({"id": extraction_id}, {"_id": 0})
        if doc:
            return ExtractedData(**doc)
        return None
    
    async def get_study_extraction(self, study_id: str, template_id: str) -> Optional[ExtractedData]:
        """Get extraction data for a study."""
        doc = await self.extracted_data.find_one({
            "study_id": study_id,
            "template_id": template_id
        }, {"_id": 0})
        if doc:
            return ExtractedData(**doc)
        return None
    
    # AI Suggestion
    async def suggest_with_ai(self, study_id: str, template_id: str, 
                               field_id: str) -> AIExtractionSuggestion:
        """Use AI to suggest a value for a field."""
        # Get study
        study_doc = await self.studies.find_one({"id": study_id}, {"_id": 0})
        if not study_doc:
            raise ValueError("Study not found")
        
        # Get template and field
        template = await self.get_template(template_id)
        if not template:
            raise ValueError("Template not found")
        
        field = None
        for f in template.fields:
            if f.id == field_id:
                field = f
                break
        
        if not field:
            raise ValueError("Field not found in template")
        
        # Get text to analyze (PDF text or abstract)
        text_to_analyze = study_doc.get('pdf_text') or study_doc.get('abstract') or ''
        
        if not text_to_analyze:
            return AIExtractionSuggestion(
                value=None,
                quote=None,
                page=None,
                is_found=False,
                confidence=0.0
            )
        
        # Call AI for extraction
        suggestion = await self._call_ai_extraction(text_to_analyze, field, study_doc)
        
        # Get extraction record and update with AI suggestion
        extraction = await self.get_or_create_extraction(study_id, study_doc.get('project_id', ''), template_id)
        
        # Log the AI suggestion
        await self.audit.log(
            project_id=study_doc.get('project_id', ''),
            study_id=study_id,
            action=AuditAction.EXTRACTION_AI_SUGGESTED,
            details={
                "field_id": field_id,
                "field_name": field.name,
                "suggestion": suggestion.model_dump()
            }
        )
        
        return suggestion
    
    async def _call_ai_extraction(self, text: str, field: ExtractionField, 
                                   study: dict) -> AIExtractionSuggestion:
        """Call AI to extract a value. Returns structured suggestion."""
        if not self.llm_client:
            # Return empty suggestion if no LLM client
            logger.warning("No LLM client configured for AI extraction")
            return AIExtractionSuggestion(
                value=None,
                quote=None,
                page=None,
                is_found=False,
                confidence=0.0
            )
        
        # Build prompt based on field type
        field_type_instructions = {
            ExtractionFieldType.TEXT: "Extract the text value exactly as it appears.",
            ExtractionFieldType.NUMBER: "Extract only the numeric value.",
            ExtractionFieldType.CATEGORY: f"Choose from these categories only: {', '.join(field.options or [])}"
        }
        
        prompt = f"""You are a systematic review data extractor. Your task is to extract specific information from scientific text.

FIELD TO EXTRACT: {field.name}
FIELD TYPE: {field.field_type.value}
INSTRUCTION: {field.instruction}
{field_type_instructions.get(field.field_type, '')}

RULES:
1. Only extract information that is EXPLICITLY stated in the text
2. NEVER guess or infer information that is not clearly stated
3. If the information is not found, respond with is_found: false
4. Always provide the exact quote from the text as evidence
5. If page numbers are available in the text, include them

TEXT TO ANALYZE:
{text[:8000]}  # Limit text length

Respond with ONLY valid JSON in this exact format:
{{
  "value": "the extracted value or null if not found",
  "quote": "exact quote from text supporting this value or null",
  "page": page_number_as_integer_or_null,
  "is_found": true_or_false,
  "confidence": 0.0_to_1.0
}}"""
        
        try:
            response = await self.llm_client.generate(prompt)
            
            # Parse JSON response
            # Try to extract JSON from response
            response_text = response.strip()
            if response_text.startswith('```'):
                # Remove markdown code blocks
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1])
            
            result = json.loads(response_text)
            
            return AIExtractionSuggestion(
                value=result.get('value'),
                quote=result.get('quote'),
                page=result.get('page'),
                is_found=result.get('is_found', False),
                confidence=result.get('confidence', 0.5)
            )
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            return AIExtractionSuggestion(
                value=None,
                quote=None,
                page=None,
                is_found=False,
                confidence=0.0
            )
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            return AIExtractionSuggestion(
                value=None,
                quote=None,
                page=None,
                is_found=False,
                confidence=0.0
            )
    
    # Value Updates
    async def accept_ai_suggestion(self, extraction_id: str, field_id: str,
                                    suggestion: AIExtractionSuggestion,
                                    user_id: str = "default_user") -> ExtractedData:
        """Accept an AI suggestion for a field."""
        extraction = await self.get_extraction(extraction_id)
        if not extraction:
            raise ValueError("Extraction not found")
        
        now = datetime.now(timezone.utc)
        
        # Update the value
        values_to_update = []
        for v in extraction.values:
            v_dict = v.model_dump() if hasattr(v, 'model_dump') else dict(v)
            if v_dict['field_id'] == field_id:
                v_dict['value'] = suggestion.value
                v_dict['quote'] = suggestion.quote
                v_dict['page'] = suggestion.page
                v_dict['is_found'] = suggestion.is_found
                v_dict['is_ai_suggested'] = True
                v_dict['is_verified'] = True
                v_dict['verified_by'] = user_id
                v_dict['verified_at'] = now.isoformat()
            values_to_update.append(v_dict)
        
        await self.extracted_data.update_one(
            {"id": extraction_id},
            {"$set": {
                "values": values_to_update,
                "updated_at": now.isoformat()
            }}
        )
        
        # Audit log
        await self.audit.log(
            project_id=extraction.project_id,
            study_id=extraction.study_id,
            action=AuditAction.EXTRACTION_VALUE_ACCEPTED,
            user_id=user_id,
            details={
                "field_id": field_id,
                "value": suggestion.value,
                "quote": suggestion.quote,
                "page": suggestion.page,
                "was_ai_suggested": True
            }
        )
        
        return await self.get_extraction(extraction_id)
    
    async def update_value(self, extraction_id: str, field_id: str,
                           value: Optional[str], quote: Optional[str] = None,
                           page: Optional[int] = None, is_found: bool = True,
                           notes: Optional[str] = None,
                           user_id: str = "default_user") -> ExtractedData:
        """Manually update an extraction value."""
        extraction = await self.get_extraction(extraction_id)
        if not extraction:
            raise ValueError("Extraction not found")
        
        # Validate: if is_found is True, value and quote must be provided
        if is_found and (not value or not quote):
            raise ValueError("Value and quote are required when marking as found")
        
        now = datetime.now(timezone.utc)
        
        # Track if this was previously AI suggested
        was_ai_suggested = False
        previous_value = None
        
        values_to_update = []
        for v in extraction.values:
            v_dict = v.model_dump() if hasattr(v, 'model_dump') else dict(v)
            if v_dict['field_id'] == field_id:
                was_ai_suggested = v_dict.get('is_ai_suggested', False)
                previous_value = v_dict.get('value')
                v_dict['value'] = value
                v_dict['quote'] = quote
                v_dict['page'] = page
                v_dict['is_found'] = is_found
                v_dict['is_verified'] = True
                v_dict['verified_by'] = user_id
                v_dict['verified_at'] = now.isoformat()
                v_dict['notes'] = notes
            values_to_update.append(v_dict)
        
        await self.extracted_data.update_one(
            {"id": extraction_id},
            {"$set": {
                "values": values_to_update,
                "updated_at": now.isoformat()
            }}
        )
        
        # Audit log
        action = AuditAction.EXTRACTION_VALUE_EDITED if previous_value else AuditAction.EXTRACTION_VALUE_ACCEPTED
        await self.audit.log(
            project_id=extraction.project_id,
            study_id=extraction.study_id,
            action=action,
            user_id=user_id,
            details={
                "field_id": field_id,
                "value": value,
                "quote": quote,
                "page": page,
                "is_found": is_found,
                "was_ai_suggested": was_ai_suggested,
                "previous_value": previous_value
            }
        )
        
        return await self.get_extraction(extraction_id)
    
    async def mark_not_found(self, extraction_id: str, field_id: str,
                              notes: Optional[str] = None,
                              user_id: str = "default_user") -> ExtractedData:
        """Mark a field as 'not found' in the document."""
        return await self.update_value(
            extraction_id=extraction_id,
            field_id=field_id,
            value=None,
            quote=None,
            page=None,
            is_found=False,
            notes=notes,
            user_id=user_id
        )
    
    async def check_extraction_complete(self, extraction_id: str) -> bool:
        """Check if all required fields are verified."""
        extraction = await self.get_extraction(extraction_id)
        if not extraction:
            return False
        
        template = await self.get_template(extraction.template_id)
        if not template:
            return False
        
        required_field_ids = {f.id for f in template.fields if f.required}
        
        for v in extraction.values:
            v_dict = v.model_dump() if hasattr(v, 'model_dump') else dict(v)
            if v_dict['field_id'] in required_field_ids:
                if not v_dict.get('is_verified'):
                    return False
        
        return True
