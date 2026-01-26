"""DataXRev - Systematic Review Platform API Server."""
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
import io

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import models
from models import (
    Project, ProjectCreate, ProjectUpdate, ProjectStats,
    Study, StudyCreate, StudyImportBatch, StudyStatus,
    ScreeningDecision, ScreeningStage, ScreeningDecisionCreate,
    ScreeningRecord, ScreeningConflict, ConflictResolution, ConflictStatus,
    ExtractionTemplate, ExtractionTemplateCreate, ExtractionField, ExtractionFieldCreate,
    ExtractedData, ExtractedValue, AIExtractionSuggestion, ValueUpdate,
    StudyScreeningView, AuditLog,
    DuplicateGroup, DeduplicationSettings, DuplicateResolution, NotDuplicateResolution,
    DuplicateStats, PRISMAData
)

# Import services
from services.audit_service import AuditService
from services.screening_service import ScreeningService
from services.extraction_service import ExtractionService
from services.export_service import ExportService
from services.llm_client import LLMClient
from services.import_parsers import parse_import_file, detect_format
from services.ai_screening_service import AIScreeningService
from services.deduplication_service import DeduplicationService

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'dataxrev')]

# Initialize services
audit_service = AuditService(db)
screening_service = ScreeningService(db)

# Initialize LLM client if key available
llm_client = None
emergent_key = os.environ.get('EMERGENT_LLM_KEY')
if emergent_key:
    llm_client = LLMClient(emergent_key)

extraction_service = ExtractionService(db, llm_client)
ai_screening_service = AIScreeningService(db, llm_client)
export_service = ExportService(db)
deduplication_service = DeduplicationService(db)

# Create FastAPI app
app = FastAPI(title="DataXRev API", version="1.0.0")

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Helper functions
def serialize_datetime(obj):
    """Convert datetime to ISO string for MongoDB storage."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def deserialize_doc(doc):
    """Remove MongoDB _id and convert datetime strings."""
    if doc and '_id' in doc:
        del doc['_id']
    return doc


# ============== Health Check ==============
@api_router.get("/")
async def root():
    return {"message": "DataXRev API is running", "version": "1.0.0"}


@api_router.get("/health")
async def health():
    return {"status": "healthy", "database": "connected"}


# ============== Projects ==============
@api_router.post("/projects", response_model=dict)
async def create_project(project_data: ProjectCreate):
    """Create a new review project."""
    project = Project(
        name=project_data.name,
        description=project_data.description
    )
    doc = project.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.projects.insert_one(doc)
    return deserialize_doc(doc)


@api_router.get("/projects", response_model=List[dict])
async def list_projects():
    """List all projects."""
    cursor = db.projects.find({}, {"_id": 0})
    projects = await cursor.to_list(100)
    return projects


@api_router.get("/projects/{project_id}", response_model=dict)
async def get_project(project_id: str):
    """Get a project by ID."""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@api_router.patch("/projects/{project_id}", response_model=dict)
async def update_project(project_id: str, update_data: ProjectUpdate):
    """Update a project."""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.projects.update_one(
        {"id": project_id},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return await get_project(project_id)


@api_router.get("/projects/{project_id}/stats", response_model=ProjectStats)
async def get_project_stats(project_id: str):
    """Get statistics for a project."""
    # Count studies by status
    pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    cursor = db.studies.aggregate(pipeline)
    status_counts = {r['_id']: r['count'] async for r in cursor}

    # Count pending conflicts
    conflicts_pending = await db.screening_conflicts.count_documents({
        "project_id": project_id,
        "status": ConflictStatus.PENDING.value
    })

    # Count duplicates removed
    duplicates_removed = await db.studies.count_documents({
        "project_id": project_id,
        "is_duplicate": True
    })

    return ProjectStats(
        total_studies=sum(status_counts.values()),
        imported=status_counts.get(StudyStatus.IMPORTED.value, 0),
        title_abstract_pending=status_counts.get(StudyStatus.TITLE_ABSTRACT_PENDING.value, 0),
        title_abstract_screened=status_counts.get(StudyStatus.TITLE_ABSTRACT_SCREENED.value, 0),
        full_text_pending=status_counts.get(StudyStatus.FULL_TEXT_PENDING.value, 0),
        full_text_screened=status_counts.get(StudyStatus.FULL_TEXT_SCREENED.value, 0),
        included=status_counts.get(StudyStatus.INCLUDED.value, 0),
        excluded=status_counts.get(StudyStatus.EXCLUDED.value, 0),
        conflicts_pending=conflicts_pending,
        duplicates_removed=duplicates_removed
    )


@api_router.get("/projects/{project_id}/agreement-metrics")
async def get_agreement_metrics(project_id: str):
    """Get detailed agreement metrics for screening."""
    # Get all screening records for the project
    records = await db.screening_records.find(
        {"project_id": project_id},
        {"_id": 0}
    ).to_list(10000)
    
    # Group by study and stage
    study_decisions = {}
    for record in records:
        key = (record['study_id'], record['stage'])
        if key not in study_decisions:
            study_decisions[key] = []
        study_decisions[key].append(record)
    
    # Calculate agreement metrics
    ta_agreements = 0
    ta_disagreements = 0
    ta_single_reviewer = 0
    ft_agreements = 0
    ft_disagreements = 0
    ft_single_reviewer = 0
    
    reviewer_stats = {}
    
    for (study_id, stage), decisions in study_decisions.items():
        if len(decisions) >= 2:
            # Check agreement
            d1, d2 = decisions[0]['decision'], decisions[1]['decision']
            agreed = d1 == d2
            
            if stage == 'title_abstract':
                if agreed:
                    ta_agreements += 1
                else:
                    ta_disagreements += 1
            else:
                if agreed:
                    ft_agreements += 1
                else:
                    ft_disagreements += 1
        else:
            if stage == 'title_abstract':
                ta_single_reviewer += 1
            else:
                ft_single_reviewer += 1
        
        # Track per-reviewer stats
        for d in decisions:
            rid = d['reviewer_id']
            if rid not in reviewer_stats:
                reviewer_stats[rid] = {'total': 0, 'include': 0, 'exclude': 0, 'maybe': 0}
            reviewer_stats[rid]['total'] += 1
            reviewer_stats[rid][d['decision']] += 1
    
    # Calculate agreement rates
    ta_total_dual = ta_agreements + ta_disagreements
    ft_total_dual = ft_agreements + ft_disagreements
    
    ta_agreement_rate = (ta_agreements / ta_total_dual * 100) if ta_total_dual > 0 else None
    ft_agreement_rate = (ft_agreements / ft_total_dual * 100) if ft_total_dual > 0 else None
    
    # Get AI suggestion stats
    ai_suggestions = await db.ai_screening_suggestions.find(
        {"project_id": project_id},
        {"_id": 0}
    ).to_list(10000)
    
    ai_stats = {
        "total_suggestions": len(ai_suggestions),
        "include": sum(1 for s in ai_suggestions if s.get('decision') == 'include'),
        "exclude": sum(1 for s in ai_suggestions if s.get('decision') == 'exclude'),
        "maybe": sum(1 for s in ai_suggestions if s.get('decision') == 'maybe'),
        "avg_confidence": sum(s.get('confidence', 0) for s in ai_suggestions) / len(ai_suggestions) if ai_suggestions else 0
    }
    
    # Calculate AI-Human agreement (where both exist)
    ai_human_agreement = 0
    ai_human_total = 0
    for suggestion in ai_suggestions:
        study_id = suggestion['study_id']
        # Find human decision for this study
        human_decisions = [r for r in records if r['study_id'] == study_id and r['stage'] == 'title_abstract']
        if human_decisions:
            ai_decision = suggestion.get('decision')
            # Check if any human agreed with AI
            for hd in human_decisions:
                ai_human_total += 1
                if hd['decision'] == ai_decision:
                    ai_human_agreement += 1
    
    ai_human_agreement_rate = (ai_human_agreement / ai_human_total * 100) if ai_human_total > 0 else None
    
    return {
        "title_abstract": {
            "agreements": ta_agreements,
            "disagreements": ta_disagreements,
            "single_reviewer": ta_single_reviewer,
            "agreement_rate": round(ta_agreement_rate, 1) if ta_agreement_rate else None
        },
        "full_text": {
            "agreements": ft_agreements,
            "disagreements": ft_disagreements,
            "single_reviewer": ft_single_reviewer,
            "agreement_rate": round(ft_agreement_rate, 1) if ft_agreement_rate else None
        },
        "ai_screening": {
            **ai_stats,
            "ai_human_agreement_rate": round(ai_human_agreement_rate, 1) if ai_human_agreement_rate else None
        },
        "reviewer_stats": reviewer_stats,
        "conflicts_resolved": await db.screening_conflicts.count_documents({
            "project_id": project_id,
            "status": ConflictStatus.RESOLVED.value
        }),
        "conflicts_pending": await db.screening_conflicts.count_documents({
            "project_id": project_id,
            "status": ConflictStatus.PENDING.value
        })
    }


# ============== Studies ==============
@api_router.post("/projects/{project_id}/studies", response_model=dict)
async def create_study(project_id: str, study_data: StudyCreate):
    """Create a single study in a project."""
    # Verify project exists
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    study = Study(
        project_id=project_id,
        title=study_data.title,
        abstract=study_data.abstract,
        authors=study_data.authors,
        year=study_data.year,
        journal=study_data.journal,
        doi=study_data.doi,
        pmid=study_data.pmid,
        source=study_data.source,
        metadata=study_data.metadata
    )
    
    doc = study.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.studies.insert_one(doc)
    
    # Update project study count
    await db.projects.update_one(
        {"id": project_id},
        {"$inc": {"study_count": 1}}
    )
    
    return deserialize_doc(doc)


@api_router.post("/projects/{project_id}/studies/import", response_model=dict)
async def import_studies(project_id: str, batch: StudyImportBatch):
    """Import multiple studies into a project."""
    # Verify project exists
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    imported_count = 0
    imported_ids = []
    
    for study_data in batch.studies:
        study = Study(
            project_id=project_id,
            title=study_data.title,
            abstract=study_data.abstract,
            authors=study_data.authors,
            year=study_data.year,
            journal=study_data.journal,
            doi=study_data.doi,
            pmid=study_data.pmid,
            source=study_data.source,
            metadata=study_data.metadata
        )
        
        doc = study.model_dump()
        doc['created_at'] = serialize_datetime(doc['created_at'])
        doc['updated_at'] = serialize_datetime(doc['updated_at'])
        
        await db.studies.insert_one(doc)
        imported_count += 1
        imported_ids.append(study.id)
    
    # Update project study count
    await db.projects.update_one(
        {"id": project_id},
        {"$inc": {"study_count": imported_count}}
    )
    
    return {
        "imported_count": imported_count,
        "study_ids": imported_ids
    }


@api_router.post("/projects/{project_id}/studies/import-file", response_model=dict)
async def import_studies_from_file(project_id: str, file: UploadFile = File(...)):
    """Import studies from various file formats (RIS, EndNote, PubMed XML, BibTeX, CSV)."""
    # Verify project exists
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Read file content
    content = await file.read()
    
    # Try to decode as text
    try:
        text_content = content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            text_content = content.decode('latin-1')
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Could not decode file. Please use UTF-8 encoding.")
    
    # Detect format and parse
    filename = file.filename or ''
    detected_format = detect_format(text_content, filename)
    
    if detected_format == 'unknown':
        raise HTTPException(
            status_code=400, 
            detail="Could not detect file format. Supported formats: RIS, EndNote XML, PubMed XML, NBIB, BibTeX, CSV"
        )
    
    # Parse studies
    parsed_studies = parse_import_file(text_content, filename)
    
    if not parsed_studies:
        raise HTTPException(status_code=400, detail="No studies found in file. Please check the file format.")
    
    # Import studies
    imported_count = 0
    imported_ids = []
    duplicates_skipped = 0
    
    for study_data in parsed_studies:
        # Check for duplicates by DOI or PMID or title
        duplicate_query = {"project_id": project_id}
        if study_data.get('doi'):
            existing = await db.studies.find_one({**duplicate_query, "doi": study_data['doi']})
            if existing:
                duplicates_skipped += 1
                continue
        if study_data.get('pmid'):
            existing = await db.studies.find_one({**duplicate_query, "pmid": study_data['pmid']})
            if existing:
                duplicates_skipped += 1
                continue
        
        # Create study
        study = Study(
            project_id=project_id,
            title=study_data.get('title', 'Untitled'),
            abstract=study_data.get('abstract'),
            authors=study_data.get('authors'),
            year=study_data.get('year'),
            journal=study_data.get('journal'),
            doi=study_data.get('doi'),
            pmid=study_data.get('pmid'),
            source=study_data.get('source', detected_format),
            metadata={k: v for k, v in study_data.items() if k not in ['title', 'abstract', 'authors', 'year', 'journal', 'doi', 'pmid', 'source']}
        )
        
        doc = study.model_dump()
        doc['created_at'] = serialize_datetime(doc['created_at'])
        doc['updated_at'] = serialize_datetime(doc['updated_at'])
        
        await db.studies.insert_one(doc)
        imported_count += 1
        imported_ids.append(study.id)
    
    # Update project study count
    if imported_count > 0:
        await db.projects.update_one(
            {"id": project_id},
            {"$inc": {"study_count": imported_count}}
        )
    
    return {
        "imported_count": imported_count,
        "duplicates_skipped": duplicates_skipped,
        "detected_format": detected_format,
        "study_ids": imported_ids
    }


@api_router.get("/projects/{project_id}/studies", response_model=List[dict])
async def list_studies(
    project_id: str,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=500),
    skip: int = 0
):
    """List studies in a project with optional filtering."""
    query = {"project_id": project_id}
    if status:
        query["status"] = status
    
    cursor = db.studies.find(query, {"_id": 0}).skip(skip).limit(limit)
    studies = await cursor.to_list(limit)
    return studies


@api_router.get("/projects/{project_id}/studies/{study_id}", response_model=dict)
async def get_study(project_id: str, study_id: str):
    """Get a study by ID."""
    study = await db.studies.find_one(
        {"id": study_id, "project_id": project_id},
        {"_id": 0}
    )
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    return study


@api_router.post("/projects/{project_id}/studies/{study_id}/pdf")
async def upload_pdf(project_id: str, study_id: str, file: UploadFile = File(...)):
    """Upload a PDF for a study."""
    # Verify study exists
    study = await db.studies.find_one({"id": study_id, "project_id": project_id})
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    # Read PDF content
    content = await file.read()
    
    # Save PDF to uploads directory
    uploads_dir = ROOT_DIR / "uploads" / project_id
    uploads_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = uploads_dir / f"{study_id}.pdf"
    
    with open(pdf_path, "wb") as f:
        f.write(content)
    
    # Extract text from PDF (basic extraction)
    pdf_text = ""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(str(pdf_path))
        for page in doc:
            pdf_text += page.get_text()
        doc.close()
    except Exception as e:
        logger.warning(f"Could not extract PDF text: {e}")
    
    # Update study with PDF info
    await db.studies.update_one(
        {"id": study_id},
        {"$set": {
            "pdf_url": str(pdf_path),
            "pdf_text": pdf_text,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Audit log
    await audit_service.log(
        project_id=project_id,
        study_id=study_id,
        action="pdf_uploaded",
        details={"filename": file.filename, "size": len(content)}
    )
    
    return {"message": "PDF uploaded successfully", "text_extracted": len(pdf_text) > 0}


# ============== Screening ==============
@api_router.get("/projects/{project_id}/screening/{stage}/pending")
async def get_pending_screening(
    project_id: str,
    stage: ScreeningStage,
    reviewer_id: str = "default_user",
    limit: int = 50
):
    """Get studies pending screening for a reviewer."""
    studies = await screening_service.get_pending_studies(
        project_id=project_id,
        stage=stage,
        reviewer_id=reviewer_id,
        limit=limit
    )
    return [{"study": s.study.model_dump(), "other_decisions_count": s.other_decisions_count} for s in studies]


@api_router.post("/projects/{project_id}/studies/{study_id}/screening/{stage}")
async def record_screening_decision(
    project_id: str,
    study_id: str,
    stage: ScreeningStage,
    decision_data: ScreeningDecisionCreate,
    reviewer_id: str = "default_user"
):
    """Record a screening decision for a study."""
    try:
        record, conflict = await screening_service.record_decision(
            project_id=project_id,
            study_id=study_id,
            stage=stage,
            decision=decision_data.decision,
            reviewer_id=reviewer_id,
            exclusion_reason=decision_data.exclusion_reason,
            notes=decision_data.notes
        )
        
        return {
            "record": record.model_dump(),
            "conflict_created": conflict is not None,
            "conflict": conflict.model_dump() if conflict else None
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.get("/projects/{project_id}/studies/{study_id}/screening")
async def get_study_screening_history(project_id: str, study_id: str):
    """Get all screening decisions for a study."""
    cursor = db.screening_records.find(
        {"study_id": study_id, "project_id": project_id},
        {"_id": 0}
    )
    records = await cursor.to_list(20)
    return records


@api_router.post("/projects/{project_id}/studies/{study_id}/ai-screening-suggestion")
async def get_ai_screening_suggestion(
    project_id: str,
    study_id: str,
    criteria: Optional[str] = None
):
    """Get AI suggestion for screening a study."""
    if not llm_client:
        raise HTTPException(
            status_code=503,
            detail="AI screening not available - no LLM key configured"
        )
    
    try:
        suggestion = await ai_screening_service.get_ai_suggestion(
            study_id=study_id,
            project_id=project_id,
            criteria=criteria
        )
        return suggestion
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/projects/{project_id}/ai-screening-batch")
async def get_batch_ai_suggestions(
    project_id: str,
    study_ids: List[str],
    criteria: Optional[str] = None
):
    """Get AI suggestions for multiple studies."""
    if not llm_client:
        raise HTTPException(
            status_code=503,
            detail="AI screening not available - no LLM key configured"
        )
    
    try:
        suggestions = await ai_screening_service.get_batch_suggestions(
            project_id=project_id,
            study_ids=study_ids,
            criteria=criteria
        )
        return suggestions
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== Conflicts ==============
@api_router.get("/projects/{project_id}/conflicts")
async def get_conflicts(
    project_id: str,
    stage: Optional[ScreeningStage] = None,
    status: ConflictStatus = ConflictStatus.PENDING
):
    """Get screening conflicts for a project."""
    conflicts = await screening_service.get_conflicts(
        project_id=project_id,
        stage=stage,
        status=status
    )
    return conflicts


@api_router.post("/projects/{project_id}/conflicts/{conflict_id}/resolve")
async def resolve_conflict(
    project_id: str,
    conflict_id: str,
    resolution: ConflictResolution,
    resolver_id: str = "default_user"
):
    """Resolve a screening conflict."""
    try:
        conflict = await screening_service.resolve_conflict(
            conflict_id=conflict_id,
            final_decision=resolution.final_decision,
            resolver_id=resolver_id,
            resolution_notes=resolution.resolution_notes
        )
        return conflict.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== Extraction Templates ==============
@api_router.post("/projects/{project_id}/templates")
async def create_extraction_template(project_id: str, template_data: ExtractionTemplateCreate):
    """Create an extraction template."""
    template = await extraction_service.create_template(
        project_id=project_id,
        name=template_data.name,
        description=template_data.description,
        fields=[f.model_dump() for f in template_data.fields]
    )
    return template.model_dump()


@api_router.get("/projects/{project_id}/templates")
async def list_templates(project_id: str):
    """List extraction templates for a project."""
    templates = await extraction_service.get_project_templates(project_id)
    return [t.model_dump() for t in templates]


@api_router.get("/projects/{project_id}/templates/{template_id}")
async def get_template(project_id: str, template_id: str):
    """Get an extraction template."""
    template = await extraction_service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template.model_dump()


@api_router.put("/projects/{project_id}/templates/{template_id}")
async def update_template(project_id: str, template_id: str, template_data: ExtractionTemplateCreate):
    """Update an extraction template."""
    template = await extraction_service.update_template(
        template_id=template_id,
        name=template_data.name,
        description=template_data.description,
        fields=[f.model_dump() for f in template_data.fields]
    )
    return template.model_dump()


# ============== Data Extraction ==============
@api_router.get("/projects/{project_id}/studies/{study_id}/extraction/{template_id}")
async def get_study_extraction(project_id: str, study_id: str, template_id: str):
    """Get or initialize extraction data for a study."""
    extraction = await extraction_service.get_or_create_extraction(
        study_id=study_id,
        project_id=project_id,
        template_id=template_id
    )
    return extraction.model_dump()


@api_router.post("/projects/{project_id}/studies/{study_id}/extraction/{template_id}/fields/{field_id}/suggest")
async def suggest_field_value(project_id: str, study_id: str, template_id: str, field_id: str):
    """Get AI suggestion for a field value."""
    if not llm_client:
        raise HTTPException(status_code=503, detail="AI extraction not available - no LLM key configured")
    
    try:
        suggestion = await extraction_service.suggest_with_ai(
            study_id=study_id,
            template_id=template_id,
            field_id=field_id
        )
        return suggestion.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/projects/{project_id}/extractions/{extraction_id}/fields/{field_id}/accept")
async def accept_ai_suggestion(
    project_id: str,
    extraction_id: str,
    field_id: str,
    suggestion: AIExtractionSuggestion,
    user_id: str = "default_user"
):
    """Accept an AI suggestion for a field."""
    try:
        extraction = await extraction_service.accept_ai_suggestion(
            extraction_id=extraction_id,
            field_id=field_id,
            suggestion=suggestion,
            user_id=user_id
        )
        return extraction.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.put("/projects/{project_id}/extractions/{extraction_id}/fields/{field_id}")
async def update_field_value(
    project_id: str,
    extraction_id: str,
    field_id: str,
    value_data: ValueUpdate,
    user_id: str = "default_user"
):
    """Manually update a field value."""
    try:
        extraction = await extraction_service.update_value(
            extraction_id=extraction_id,
            field_id=field_id,
            value=value_data.value,
            quote=value_data.quote,
            page=value_data.page,
            is_found=value_data.is_found,
            notes=value_data.notes,
            user_id=user_id
        )
        return extraction.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/projects/{project_id}/extractions/{extraction_id}/fields/{field_id}/not-found")
async def mark_field_not_found(
    project_id: str,
    extraction_id: str,
    field_id: str,
    notes: Optional[str] = None,
    user_id: str = "default_user"
):
    """Mark a field as not found in the document."""
    try:
        extraction = await extraction_service.mark_not_found(
            extraction_id=extraction_id,
            field_id=field_id,
            notes=notes,
            user_id=user_id
        )
        return extraction.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== Audit Logs ==============
@api_router.get("/projects/{project_id}/audit-logs")
async def get_audit_logs(
    project_id: str,
    study_id: Optional[str] = None,
    limit: int = 100
):
    """Get audit logs for a project."""
    logs = await audit_service.get_logs(
        project_id=project_id,
        study_id=study_id,
        limit=limit
    )
    return logs


# ============== Exports ==============
@api_router.get("/projects/{project_id}/export/screening")
async def export_screening(
    project_id: str,
    stage: Optional[str] = None
):
    """Export screening decisions to CSV."""
    csv_content = await export_service.export_screening_decisions(
        project_id=project_id,
        stage=stage
    )
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=screening_export_{project_id}.csv"}
    )


@api_router.get("/projects/{project_id}/export/extraction")
async def export_extraction(
    project_id: str,
    template_id: Optional[str] = None
):
    """Export extraction data to CSV."""
    csv_content = await export_service.export_extraction_data(
        project_id=project_id,
        template_id=template_id
    )
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=extraction_export_{project_id}.csv"}
    )


# ============== Deduplication ==============
@api_router.get("/projects/{project_id}/duplicates")
async def find_duplicates(
    project_id: str,
    title_threshold: float = Query(default=0.85, ge=0.5, le=1.0),
    check_doi: bool = True,
    check_pmid: bool = True,
    check_title: bool = True,
    check_authors: bool = True,
    author_threshold: float = Query(default=0.5, ge=0.0, le=1.0)
):
    """Find potential duplicate studies in a project."""
    duplicates = await deduplication_service.find_duplicates(
        project_id=project_id,
        title_threshold=title_threshold,
        check_doi=check_doi,
        check_pmid=check_pmid,
        check_title=check_title,
        check_authors=check_authors,
        author_threshold=author_threshold
    )
    return duplicates


@api_router.post("/projects/{project_id}/duplicates/resolve")
async def resolve_duplicates(
    project_id: str,
    resolution: DuplicateResolution,
    user_id: str = "default_user"
):
    """Mark studies as duplicates, keeping one as primary."""
    try:
        result = await deduplication_service.mark_as_duplicate(
            project_id=project_id,
            study_ids=resolution.study_ids,
            primary_study_id=resolution.primary_study_id,
            user_id=user_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/projects/{project_id}/duplicates/not-duplicate")
async def mark_not_duplicate(
    project_id: str,
    resolution: NotDuplicateResolution,
    user_id: str = "default_user"
):
    """Mark studies as NOT duplicates (false positive)."""
    result = await deduplication_service.mark_not_duplicate(
        project_id=project_id,
        study_ids=resolution.study_ids,
        user_id=user_id
    )
    return result


@api_router.get("/projects/{project_id}/duplicates/stats", response_model=DuplicateStats)
async def get_duplicate_stats(project_id: str):
    """Get deduplication statistics for a project."""
    stats = await deduplication_service.get_duplicate_stats(project_id)
    return stats


@api_router.get("/projects/{project_id}/duplicates/history")
async def get_duplicate_history(project_id: str, limit: int = 100):
    """Get history of resolved duplicate groups."""
    history = await deduplication_service.get_resolved_duplicates(
        project_id=project_id,
        limit=limit
    )
    return history


@api_router.post("/projects/{project_id}/duplicates/{record_id}/undo")
async def undo_duplicate_marking(
    project_id: str,
    record_id: str,
    user_id: str = "default_user"
):
    """Undo a duplicate marking decision."""
    try:
        result = await deduplication_service.undo_duplicate_marking(
            project_id=project_id,
            duplicate_record_id=record_id,
            user_id=user_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/projects/{project_id}/duplicates/auto")
async def auto_deduplicate(
    project_id: str,
    title_threshold: float = Query(default=0.95, ge=0.9, le=1.0),
    user_id: str = "default_user"
):
    """Automatically remove high-confidence duplicates."""
    result = await deduplication_service.auto_deduplicate(
        project_id=project_id,
        title_threshold=title_threshold,
        user_id=user_id
    )
    return result


# ============== PRISMA Flow Diagram ==============
@api_router.get("/projects/{project_id}/prisma", response_model=PRISMAData)
async def get_prisma_data(project_id: str):
    """Get PRISMA 2020 flow diagram data for a project."""
    # Verify project exists
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get study counts by status
    pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    cursor = db.studies.aggregate(pipeline)
    status_counts = {r['_id']: r['count'] async for r in cursor}

    # Get study counts by source
    source_pipeline = [
        {"$match": {"project_id": project_id, "is_duplicate": {"$ne": True}}},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]
    source_cursor = db.studies.aggregate(source_pipeline)
    source_counts = {r['_id'] or 'unknown': r['count'] async for r in source_cursor}

    # Get duplicate stats
    duplicate_stats = await deduplication_service.get_duplicate_stats(project_id)
    duplicates_removed = duplicate_stats['duplicates_removed']

    # Get total studies including duplicates
    total_studies = await db.studies.count_documents({"project_id": project_id})

    # Calculate PRISMA values
    # Total identified = all studies ever imported (including duplicates)
    records_identified_total = total_studies

    # Split by source type (databases vs other)
    database_sources = {'pubmed', 'scopus', 'web of science', 'embase', 'cochrane',
                       'cinahl', 'psycinfo', 'eric', 'medline', 'database'}
    records_from_databases = sum(
        count for source, count in source_counts.items()
        if source and source.lower() in database_sources
    )
    records_from_other = records_identified_total - records_from_databases - duplicates_removed

    # Get exclusion reasons from screening records
    exclusion_pipeline = [
        {"$match": {"project_id": project_id, "decision": "exclude"}},
        {"$group": {"_id": "$exclusion_reason", "count": {"$sum": 1}}}
    ]
    exclusion_cursor = db.screening_records.aggregate(exclusion_pipeline)
    exclusion_reasons = {r['_id'] or 'Not specified': r['count'] async for r in exclusion_cursor}

    # Calculate screening numbers
    title_abstract_excluded = status_counts.get(StudyStatus.EXCLUDED.value, 0)

    # Studies that made it past title/abstract screening
    passed_ta_screening = (
        status_counts.get(StudyStatus.TITLE_ABSTRACT_SCREENED.value, 0) +
        status_counts.get(StudyStatus.FULL_TEXT_PENDING.value, 0) +
        status_counts.get(StudyStatus.FULL_TEXT_SCREENED.value, 0) +
        status_counts.get(StudyStatus.INCLUDED.value, 0)
    )

    # Full text assessed
    full_text_assessed = (
        status_counts.get(StudyStatus.FULL_TEXT_SCREENED.value, 0) +
        status_counts.get(StudyStatus.INCLUDED.value, 0)
    )

    # Get full-text specific exclusions
    ft_exclusion_pipeline = [
        {"$match": {"project_id": project_id, "stage": "full_text", "decision": "exclude"}},
        {"$group": {"_id": "$exclusion_reason", "count": {"$sum": 1}}}
    ]
    ft_exclusion_cursor = db.screening_records.aggregate(ft_exclusion_pipeline)
    ft_exclusion_reasons = {r['_id'] or 'Not specified': r['count'] async for r in ft_exclusion_cursor}

    # Records screened = total after duplicates removed
    records_after_duplicates = total_studies - duplicates_removed

    # Title/abstract exclusions
    ta_exclusion_pipeline = [
        {"$match": {"project_id": project_id, "stage": "title_abstract", "decision": "exclude"}},
        {"$group": {"_id": None, "count": {"$sum": 1}}}
    ]
    ta_exclusion_cursor = db.screening_records.aggregate(ta_exclusion_pipeline)
    ta_exclusion_result = await ta_exclusion_cursor.to_list(1)
    ta_excluded = ta_exclusion_result[0]['count'] if ta_exclusion_result else 0

    return PRISMAData(
        # Identification
        records_identified_databases=records_from_databases,
        records_identified_registers=0,  # Could be expanded to track registers separately
        records_identified_other=records_from_other if records_from_other > 0 else 0,
        records_removed_before_screening=duplicates_removed,
        duplicates_removed=duplicates_removed,
        records_marked_ineligible=0,
        records_removed_other_reasons=0,

        # Screening
        records_screened=records_after_duplicates,
        records_excluded_screening=ta_excluded,

        # Retrieval
        reports_sought_retrieval=passed_ta_screening,
        reports_not_retrieved=status_counts.get(StudyStatus.FULL_TEXT_PENDING.value, 0),

        # Eligibility
        reports_assessed_eligibility=full_text_assessed,
        reports_excluded_eligibility=len([s for s in ft_exclusion_reasons.values()]),
        exclusion_reasons=ft_exclusion_reasons,

        # Included
        studies_included_review=status_counts.get(StudyStatus.INCLUDED.value, 0),
        reports_included_review=status_counts.get(StudyStatus.INCLUDED.value, 0),

        # Sources
        sources=source_counts
    )


# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Create indexes on startup."""
    # Studies indexes
    await db.studies.create_index("project_id")
    await db.studies.create_index("status")
    await db.studies.create_index([("project_id", 1), ("status", 1)])
    await db.studies.create_index([("project_id", 1), ("is_duplicate", 1)])
    await db.studies.create_index([("project_id", 1), ("doi", 1)])
    await db.studies.create_index([("project_id", 1), ("pmid", 1)])

    # Screening records indexes
    await db.screening_records.create_index("study_id")
    await db.screening_records.create_index([("study_id", 1), ("stage", 1), ("reviewer_id", 1)])

    # Conflicts indexes
    await db.screening_conflicts.create_index("project_id")
    await db.screening_conflicts.create_index([("project_id", 1), ("status", 1)])

    # Extraction indexes
    await db.extraction_templates.create_index("project_id")
    await db.extracted_data.create_index([("study_id", 1), ("template_id", 1)])

    # Audit logs indexes
    await db.audit_logs.create_index([("project_id", 1), ("timestamp", -1)])

    # Deduplication indexes
    await db.duplicate_records.create_index("project_id")
    await db.duplicate_records.create_index([("project_id", 1), ("resolved_at", -1)])
    await db.not_duplicate_records.create_index("project_id")

    logger.info("Database indexes created")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
