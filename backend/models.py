"""Data models for the systematic review platform."""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime, timezone
import uuid


def generate_id() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Enums
class StudyStatus(str, Enum):
    IMPORTED = "imported"
    TITLE_ABSTRACT_PENDING = "title_abstract_pending"
    TITLE_ABSTRACT_SCREENED = "title_abstract_screened"
    FULL_TEXT_PENDING = "full_text_pending"
    FULL_TEXT_SCREENED = "full_text_screened"
    INCLUDED = "included"
    EXCLUDED = "excluded"


class ScreeningDecision(str, Enum):
    INCLUDE = "include"
    EXCLUDE = "exclude"
    MAYBE = "maybe"


class ScreeningStage(str, Enum):
    TITLE_ABSTRACT = "title_abstract"
    FULL_TEXT = "full_text"


class ExtractionFieldType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    CATEGORY = "category"


class ConflictStatus(str, Enum):
    PENDING = "pending"
    RESOLVED = "resolved"


# Project Models
class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    owner_id: str = "default_user"  # For now, single user
    settings: Dict[str, Any] = Field(default_factory=dict)
    study_count: int = 0
    screened_count: int = 0
    included_count: int = 0
    excluded_count: int = 0


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


# Study Models
class Study(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    project_id: str
    title: str
    abstract: Optional[str] = None
    authors: Optional[List[str]] = None
    year: Optional[int] = None
    journal: Optional[str] = None
    doi: Optional[str] = None
    pmid: Optional[str] = None
    source: Optional[str] = None  # e.g., "PubMed", "ERIC", "manual"
    status: StudyStatus = StudyStatus.IMPORTED
    pdf_url: Optional[str] = None
    pdf_text: Optional[str] = None  # Extracted text from PDF
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class StudyCreate(BaseModel):
    title: str
    abstract: Optional[str] = None
    authors: Optional[List[str]] = None
    year: Optional[int] = None
    journal: Optional[str] = None
    doi: Optional[str] = None
    pmid: Optional[str] = None
    source: Optional[str] = "manual"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class StudyImportBatch(BaseModel):
    studies: List[StudyCreate]


# Screening Models
class ScreeningRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    study_id: str
    project_id: str
    reviewer_id: str = "default_user"
    stage: ScreeningStage
    decision: ScreeningDecision
    exclusion_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class ScreeningDecisionCreate(BaseModel):
    decision: ScreeningDecision
    exclusion_reason: Optional[str] = None
    notes: Optional[str] = None


class ScreeningConflict(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    study_id: str
    project_id: str
    stage: ScreeningStage
    reviewer1_id: str
    reviewer1_decision: ScreeningDecision
    reviewer2_id: str
    reviewer2_decision: ScreeningDecision
    status: ConflictStatus = ConflictStatus.PENDING
    resolved_by: Optional[str] = None
    final_decision: Optional[ScreeningDecision] = None
    resolution_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    resolved_at: Optional[datetime] = None


class ConflictResolution(BaseModel):
    final_decision: ScreeningDecision
    resolution_notes: Optional[str] = None


# Extraction Models
class ExtractionField(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    name: str
    field_type: ExtractionFieldType
    instruction: str  # Short instruction for AI/reviewer
    options: Optional[List[str]] = None  # For category type
    required: bool = False
    order: int = 0


class ExtractionFieldCreate(BaseModel):
    name: str
    field_type: ExtractionFieldType
    instruction: str
    options: Optional[List[str]] = None
    required: bool = False
    order: int = 0


class ExtractionTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    project_id: str
    name: str
    description: Optional[str] = None
    fields: List[ExtractionField] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ExtractionTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    fields: List[ExtractionFieldCreate] = Field(default_factory=list)


class ExtractedValue(BaseModel):
    """A single extracted data point with evidence anchoring."""
    model_config = ConfigDict(extra="ignore")
    
    field_id: str
    field_name: str
    value: Optional[str] = None
    quote: Optional[str] = None  # Evidence quote from document
    page: Optional[int] = None  # Page number
    is_found: bool = False
    is_ai_suggested: bool = False
    is_verified: bool = False  # Human verified
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    notes: Optional[str] = None


class AIExtractionSuggestion(BaseModel):
    """AI suggestion for a single field."""
    value: Optional[str] = None
    quote: Optional[str] = None
    page: Optional[int] = None
    is_found: bool = False
    confidence: Optional[float] = None


class ExtractedData(BaseModel):
    """All extracted data for a study."""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    study_id: str
    project_id: str
    template_id: str
    values: List[ExtractedValue] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    is_complete: bool = False
    extracted_by: str = "default_user"


class ValueUpdate(BaseModel):
    """Update a single extracted value."""
    field_id: str
    value: Optional[str] = None
    quote: Optional[str] = None
    page: Optional[int] = None
    is_found: bool = True
    notes: Optional[str] = None


# Audit Log Models
class AuditAction(str, Enum):
    STUDY_IMPORTED = "study_imported"
    SCREENING_DECISION = "screening_decision"
    CONFLICT_CREATED = "conflict_created"
    CONFLICT_RESOLVED = "conflict_resolved"
    EXTRACTION_AI_SUGGESTED = "extraction_ai_suggested"
    EXTRACTION_VALUE_ACCEPTED = "extraction_value_accepted"
    EXTRACTION_VALUE_EDITED = "extraction_value_edited"
    EXTRACTION_VALUE_REJECTED = "extraction_value_rejected"
    PDF_UPLOADED = "pdf_uploaded"
    EXPORT_CREATED = "export_created"


class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    project_id: str
    study_id: Optional[str] = None
    user_id: str = "default_user"
    action: AuditAction
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=utc_now)


# Response Models
class StudyScreeningView(BaseModel):
    """Study view for screening interface."""
    study: Study
    my_decision: Optional[ScreeningRecord] = None
    other_decisions_count: int = 0
    has_conflict: bool = False


class ProjectStats(BaseModel):
    total_studies: int = 0
    imported: int = 0
    title_abstract_pending: int = 0
    title_abstract_screened: int = 0
    full_text_pending: int = 0
    full_text_screened: int = 0
    included: int = 0
    excluded: int = 0
    conflicts_pending: int = 0
