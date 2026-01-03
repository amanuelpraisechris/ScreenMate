# DataXRev API Contracts

## Overview
This document captures the API contracts between frontend and backend for the systematic review platform.

## API Base URL
- Backend: `REACT_APP_BACKEND_URL/api`
- All endpoints prefixed with `/api`

---

## Projects API

### POST /api/projects
Create a new review project.

**Request:**
```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime",
  "owner_id": "string",
  "study_count": 0,
  "screened_count": 0,
  "included_count": 0,
  "excluded_count": 0
}
```

### GET /api/projects
List all projects.

### GET /api/projects/{project_id}
Get project by ID.

### GET /api/projects/{project_id}/stats
Get project statistics.

**Response:**
```json
{
  "total_studies": 0,
  "imported": 0,
  "title_abstract_pending": 0,
  "title_abstract_screened": 0,
  "full_text_pending": 0,
  "full_text_screened": 0,
  "included": 0,
  "excluded": 0,
  "conflicts_pending": 0
}
```

---

## Studies API

### POST /api/projects/{project_id}/studies
Create a single study.

**Request:**
```json
{
  "title": "string (required)",
  "abstract": "string",
  "authors": ["string"],
  "year": 2024,
  "journal": "string",
  "doi": "string",
  "pmid": "string",
  "source": "manual"
}
```

### POST /api/projects/{project_id}/studies/import
Batch import studies.

**Request:**
```json
{
  "studies": [StudyCreate, ...]
}
```

**Response:**
```json
{
  "imported_count": 5,
  "study_ids": ["uuid", ...]
}
```

### GET /api/projects/{project_id}/studies
List studies with optional filtering.

**Query params:** `status`, `limit`, `skip`

### POST /api/projects/{project_id}/studies/{study_id}/pdf
Upload PDF file.

---

## Screening API

### GET /api/projects/{project_id}/screening/{stage}/pending
Get studies pending screening.

**Path params:** `stage` = "title_abstract" | "full_text"
**Query params:** `reviewer_id`, `limit`

**Response:**
```json
[
  {
    "study": Study,
    "other_decisions_count": 1
  }
]
```

### POST /api/projects/{project_id}/studies/{study_id}/screening/{stage}
Record a screening decision.

**Request:**
```json
{
  "decision": "include" | "exclude" | "maybe",
  "exclusion_reason": "string (required if exclude)",
  "notes": "string"
}
```

**Response:**
```json
{
  "record": ScreeningRecord,
  "conflict_created": false,
  "conflict": null
}
```

---

## Conflicts API

### GET /api/projects/{project_id}/conflicts
Get screening conflicts.

**Query params:** `stage`, `status`

### POST /api/projects/{project_id}/conflicts/{conflict_id}/resolve
Resolve a conflict.

**Request:**
```json
{
  "final_decision": "include" | "exclude",
  "resolution_notes": "string"
}
```

---

## Extraction Templates API

### POST /api/projects/{project_id}/templates
Create extraction template.

**Request:**
```json
{
  "name": "string",
  "description": "string",
  "fields": [
    {
      "name": "Sample Size",
      "field_type": "number",
      "instruction": "Extract the total sample size",
      "options": null,
      "required": true,
      "order": 0
    }
  ]
}
```

### GET /api/projects/{project_id}/templates
List templates.

### GET /api/projects/{project_id}/templates/{template_id}
Get template by ID.

---

## Data Extraction API

### GET /api/projects/{project_id}/studies/{study_id}/extraction/{template_id}
Get or create extraction data for a study.

**Response:**
```json
{
  "id": "uuid",
  "study_id": "uuid",
  "project_id": "uuid",
  "template_id": "uuid",
  "values": [
    {
      "field_id": "uuid",
      "field_name": "Sample Size",
      "value": null,
      "quote": null,
      "page": null,
      "is_found": false,
      "is_ai_suggested": false,
      "is_verified": false,
      "verified_by": null,
      "verified_at": null
    }
  ],
  "is_complete": false
}
```

### POST /api/projects/{project_id}/studies/{study_id}/extraction/{template_id}/fields/{field_id}/suggest
Get AI suggestion for a field.

**Response:**
```json
{
  "value": "200",
  "quote": "A total of 200 participants were randomized",
  "page": 3,
  "is_found": true,
  "confidence": 0.95
}
```

### POST /api/projects/{project_id}/extractions/{extraction_id}/fields/{field_id}/accept
Accept AI suggestion.

**Request:** AIExtractionSuggestion

### PUT /api/projects/{project_id}/extractions/{extraction_id}/fields/{field_id}
Update field value manually.

**Request:**
```json
{
  "field_id": "uuid",
  "value": "string",
  "quote": "string (required if is_found)",
  "page": 3,
  "is_found": true,
  "notes": "string"
}
```

### POST /api/projects/{project_id}/extractions/{extraction_id}/fields/{field_id}/not-found
Mark field as not found.

---

## Audit Logs API

### GET /api/projects/{project_id}/audit-logs
Get audit logs.

**Query params:** `study_id`, `limit`

---

## Export API

### GET /api/projects/{project_id}/export/screening
Export screening decisions as CSV.

**Query params:** `stage`

### GET /api/projects/{project_id}/export/extraction
Export extraction data as CSV.

**Query params:** `template_id`

---

## Study Status Flow

```
imported → title_abstract_pending → title_abstract_screened
         ↓ (if excluded)            ↓ (if included)
         excluded                   full_text_pending → full_text_screened
                                                      ↓ (if excluded)
                                                      excluded
                                                      ↓ (if included)
                                                      included
```

## Conflict Detection

1. Two reviewers make decisions on same study/stage
2. If decisions match: auto-advance study status
3. If decisions differ: create ScreeningConflict for adjudication
4. Adjudicator resolves with final_decision

## AI Extraction Rules

1. AI suggestions are NEVER auto-accepted
2. Every accepted value MUST have:
   - `quote`: exact text from document
   - `page`: page number (if available)
3. Users can:
   - Accept suggestion as-is
   - Edit and save
   - Mark as "Not found"
4. All actions create audit log entries
