"""Deduplication service for identifying and managing duplicate studies."""
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from difflib import SequenceMatcher
import re
import uuid


def generate_id() -> str:
    return str(uuid.uuid4())


def normalize_text(text: str) -> str:
    """Normalize text for comparison by lowercasing and removing special chars."""
    if not text:
        return ""
    # Lowercase
    text = text.lower()
    # Remove special characters except spaces
    text = re.sub(r'[^\w\s]', '', text)
    # Normalize whitespace
    text = ' '.join(text.split())
    return text


def title_similarity(title1: str, title2: str) -> float:
    """Calculate similarity between two titles using SequenceMatcher."""
    if not title1 or not title2:
        return 0.0
    norm1 = normalize_text(title1)
    norm2 = normalize_text(title2)
    return SequenceMatcher(None, norm1, norm2).ratio()


def author_overlap(authors1: List[str], authors2: List[str]) -> float:
    """Calculate overlap between author lists."""
    if not authors1 or not authors2:
        return 0.0

    # Normalize author names
    def normalize_author(name):
        # Extract last name (usually most reliable)
        parts = name.lower().replace('.', '').split()
        return parts[-1] if parts else ""

    set1 = {normalize_author(a) for a in authors1 if a}
    set2 = {normalize_author(a) for a in authors2 if a}

    if not set1 or not set2:
        return 0.0

    intersection = len(set1 & set2)
    union = len(set1 | set2)
    return intersection / union if union > 0 else 0.0


class DeduplicationService:
    def __init__(self, db):
        self.db = db

    async def find_duplicates(
        self,
        project_id: str,
        title_threshold: float = 0.85,
        check_doi: bool = True,
        check_pmid: bool = True,
        check_title: bool = True,
        check_authors: bool = True,
        author_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Find potential duplicate studies in a project.

        Returns a list of duplicate groups, where each group contains
        studies that are potential duplicates of each other.
        """
        # Get all studies for the project
        cursor = self.db.studies.find(
            {"project_id": project_id},
            {"_id": 0, "id": 1, "title": 1, "authors": 1, "year": 1,
             "doi": 1, "pmid": 1, "journal": 1, "source": 1, "status": 1}
        )
        studies = await cursor.to_list(10000)

        if len(studies) < 2:
            return []

        # Build lookup indexes for exact matches
        doi_index: Dict[str, List[str]] = {}
        pmid_index: Dict[str, List[str]] = {}

        for study in studies:
            if study.get('doi'):
                doi_normalized = study['doi'].lower().strip()
                if doi_normalized not in doi_index:
                    doi_index[doi_normalized] = []
                doi_index[doi_normalized].append(study['id'])

            if study.get('pmid'):
                pmid_normalized = str(study['pmid']).strip()
                if pmid_normalized not in pmid_index:
                    pmid_index[pmid_normalized] = []
                pmid_index[pmid_normalized].append(study['id'])

        # Track which studies have been grouped
        grouped_study_ids = set()
        duplicate_groups = []

        # Find DOI-based duplicates
        if check_doi:
            for doi, study_ids in doi_index.items():
                if len(study_ids) > 1:
                    group = {
                        "id": generate_id(),
                        "match_type": "doi",
                        "confidence": 1.0,
                        "doi": doi,
                        "study_ids": study_ids,
                        "studies": [s for s in studies if s['id'] in study_ids]
                    }
                    duplicate_groups.append(group)
                    grouped_study_ids.update(study_ids)

        # Find PMID-based duplicates
        if check_pmid:
            for pmid, study_ids in pmid_index.items():
                if len(study_ids) > 1:
                    # Skip if already grouped by DOI
                    ungrouped = [sid for sid in study_ids if sid not in grouped_study_ids]
                    if len(ungrouped) > 1:
                        group = {
                            "id": generate_id(),
                            "match_type": "pmid",
                            "confidence": 1.0,
                            "pmid": pmid,
                            "study_ids": ungrouped,
                            "studies": [s for s in studies if s['id'] in ungrouped]
                        }
                        duplicate_groups.append(group)
                        grouped_study_ids.update(ungrouped)

        # Find title-based duplicates (fuzzy matching)
        if check_title:
            ungrouped_studies = [s for s in studies if s['id'] not in grouped_study_ids]

            # Compare each pair of ungrouped studies
            processed_pairs = set()
            title_groups: Dict[str, List[Dict]] = {}  # Primary study ID -> group

            for i, study1 in enumerate(ungrouped_studies):
                if study1['id'] in grouped_study_ids:
                    continue

                for study2 in ungrouped_studies[i+1:]:
                    if study2['id'] in grouped_study_ids:
                        continue

                    pair_key = tuple(sorted([study1['id'], study2['id']]))
                    if pair_key in processed_pairs:
                        continue
                    processed_pairs.add(pair_key)

                    # Calculate title similarity
                    sim = title_similarity(study1.get('title', ''), study2.get('title', ''))

                    if sim >= title_threshold:
                        # Additional validation: check year if available
                        year_match = True
                        if study1.get('year') and study2.get('year'):
                            year_match = study1['year'] == study2['year']

                        # Check author overlap if enabled
                        author_sim = 0.0
                        if check_authors:
                            author_sim = author_overlap(
                                study1.get('authors', []),
                                study2.get('authors', [])
                            )

                        # Require either year match or author overlap for fuzzy title matches
                        if year_match or (check_authors and author_sim >= author_threshold):
                            # Add to existing group or create new one
                            group_found = False
                            for group_id, group in title_groups.items():
                                if study1['id'] in [s['id'] for s in group['studies']]:
                                    if study2['id'] not in [s['id'] for s in group['studies']]:
                                        group['studies'].append(study2)
                                        group['study_ids'].append(study2['id'])
                                        group['confidence'] = min(group['confidence'], sim)
                                    group_found = True
                                    break
                                elif study2['id'] in [s['id'] for s in group['studies']]:
                                    if study1['id'] not in [s['id'] for s in group['studies']]:
                                        group['studies'].append(study1)
                                        group['study_ids'].append(study1['id'])
                                        group['confidence'] = min(group['confidence'], sim)
                                    group_found = True
                                    break

                            if not group_found:
                                group_id = generate_id()
                                title_groups[group_id] = {
                                    "id": group_id,
                                    "match_type": "title_similarity",
                                    "confidence": sim,
                                    "study_ids": [study1['id'], study2['id']],
                                    "studies": [study1, study2],
                                    "author_overlap": author_sim if check_authors else None
                                }

                            grouped_study_ids.add(study1['id'])
                            grouped_study_ids.add(study2['id'])

            duplicate_groups.extend(title_groups.values())

        # Sort groups by confidence (highest first)
        duplicate_groups.sort(key=lambda x: x['confidence'], reverse=True)

        return duplicate_groups

    async def mark_as_duplicate(
        self,
        project_id: str,
        study_ids: List[str],
        primary_study_id: str,
        user_id: str = "default_user"
    ) -> Dict[str, Any]:
        """
        Mark studies as duplicates, keeping one as primary.

        The primary study is kept, and others are marked as duplicates
        with a reference to the primary.
        """
        if primary_study_id not in study_ids:
            raise ValueError("Primary study must be in the list of study IDs")

        if len(study_ids) < 2:
            raise ValueError("Need at least 2 studies to mark as duplicates")

        # Verify all studies exist and belong to the project
        for study_id in study_ids:
            study = await self.db.studies.find_one({
                "id": study_id,
                "project_id": project_id
            })
            if not study:
                raise ValueError(f"Study {study_id} not found in project")

        # Create duplicate record
        duplicate_record = {
            "id": generate_id(),
            "project_id": project_id,
            "primary_study_id": primary_study_id,
            "duplicate_study_ids": [sid for sid in study_ids if sid != primary_study_id],
            "all_study_ids": study_ids,
            "resolved_by": user_id,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "action": "marked_duplicate"
        }

        await self.db.duplicate_records.insert_one(duplicate_record)

        # Update duplicate studies with reference to primary
        duplicate_ids = [sid for sid in study_ids if sid != primary_study_id]
        await self.db.studies.update_many(
            {"id": {"$in": duplicate_ids}, "project_id": project_id},
            {"$set": {
                "is_duplicate": True,
                "duplicate_of": primary_study_id,
                "status": "excluded",
                "metadata.exclusion_reason": "duplicate",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        # Update project stats
        await self.db.projects.update_one(
            {"id": project_id},
            {"$inc": {"duplicates_removed": len(duplicate_ids)}}
        )

        return {
            "duplicate_record": duplicate_record,
            "duplicates_marked": len(duplicate_ids),
            "primary_study_id": primary_study_id
        }

    async def mark_not_duplicate(
        self,
        project_id: str,
        study_ids: List[str],
        user_id: str = "default_user"
    ) -> Dict[str, Any]:
        """
        Mark a group of studies as NOT duplicates (false positive).

        This prevents them from showing up as duplicates in future scans.
        """
        # Create a "not duplicate" record
        not_duplicate_record = {
            "id": generate_id(),
            "project_id": project_id,
            "study_ids": study_ids,
            "resolved_by": user_id,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "action": "marked_not_duplicate"
        }

        await self.db.not_duplicate_records.insert_one(not_duplicate_record)

        return {
            "record": not_duplicate_record,
            "studies_cleared": len(study_ids)
        }

    async def get_duplicate_stats(self, project_id: str) -> Dict[str, Any]:
        """Get deduplication statistics for a project."""
        # Count total studies
        total_studies = await self.db.studies.count_documents({"project_id": project_id})

        # Count studies marked as duplicates
        duplicates_removed = await self.db.studies.count_documents({
            "project_id": project_id,
            "is_duplicate": True
        })

        # Count duplicate records (resolution actions)
        duplicate_records = await self.db.duplicate_records.count_documents({
            "project_id": project_id
        })

        # Count not-duplicate records (false positives marked)
        not_duplicate_records = await self.db.not_duplicate_records.count_documents({
            "project_id": project_id
        })

        return {
            "total_studies": total_studies,
            "duplicates_removed": duplicates_removed,
            "unique_studies": total_studies - duplicates_removed,
            "duplicate_groups_resolved": duplicate_records,
            "false_positives_marked": not_duplicate_records
        }

    async def get_resolved_duplicates(
        self,
        project_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get history of resolved duplicate groups."""
        cursor = self.db.duplicate_records.find(
            {"project_id": project_id},
            {"_id": 0}
        ).sort("resolved_at", -1).limit(limit)

        records = await cursor.to_list(limit)

        # Enrich with study details
        for record in records:
            study_ids = record.get('all_study_ids', [])
            studies = await self.db.studies.find(
                {"id": {"$in": study_ids}},
                {"_id": 0, "id": 1, "title": 1, "authors": 1, "year": 1, "source": 1}
            ).to_list(len(study_ids))
            record['studies'] = studies

        return records

    async def undo_duplicate_marking(
        self,
        project_id: str,
        duplicate_record_id: str,
        user_id: str = "default_user"
    ) -> Dict[str, Any]:
        """Undo a duplicate marking decision."""
        # Find the duplicate record
        record = await self.db.duplicate_records.find_one({
            "id": duplicate_record_id,
            "project_id": project_id
        })

        if not record:
            raise ValueError("Duplicate record not found")

        duplicate_ids = record.get('duplicate_study_ids', [])

        # Restore duplicate studies
        await self.db.studies.update_many(
            {"id": {"$in": duplicate_ids}, "project_id": project_id},
            {"$set": {
                "is_duplicate": False,
                "status": "imported",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {
                "duplicate_of": "",
                "metadata.exclusion_reason": ""
            }}
        )

        # Remove the duplicate record
        await self.db.duplicate_records.delete_one({"id": duplicate_record_id})

        # Update project stats
        await self.db.projects.update_one(
            {"id": project_id},
            {"$inc": {"duplicates_removed": -len(duplicate_ids)}}
        )

        return {
            "restored_count": len(duplicate_ids),
            "restored_study_ids": duplicate_ids
        }

    async def auto_deduplicate(
        self,
        project_id: str,
        title_threshold: float = 0.95,
        user_id: str = "default_user"
    ) -> Dict[str, Any]:
        """
        Automatically remove high-confidence duplicates.

        Only removes exact DOI/PMID matches and very high title similarity matches.
        Returns summary of actions taken.
        """
        # Find duplicates with high confidence
        duplicates = await self.find_duplicates(
            project_id=project_id,
            title_threshold=title_threshold,
            check_doi=True,
            check_pmid=True,
            check_title=True,
            check_authors=True
        )

        auto_resolved = 0
        manual_review_needed = 0

        for group in duplicates:
            # Auto-resolve only high-confidence matches
            if group['confidence'] >= 0.95:
                # Keep the study with most metadata as primary
                studies = group['studies']

                # Score each study by completeness
                def completeness_score(s):
                    score = 0
                    if s.get('doi'): score += 2
                    if s.get('pmid'): score += 2
                    if s.get('abstract'): score += 1
                    if s.get('authors'): score += len(s['authors'])
                    if s.get('year'): score += 1
                    return score

                studies_scored = sorted(studies, key=completeness_score, reverse=True)
                primary_id = studies_scored[0]['id']

                await self.mark_as_duplicate(
                    project_id=project_id,
                    study_ids=group['study_ids'],
                    primary_study_id=primary_id,
                    user_id=user_id
                )
                auto_resolved += 1
            else:
                manual_review_needed += 1

        return {
            "total_groups_found": len(duplicates),
            "auto_resolved": auto_resolved,
            "manual_review_needed": manual_review_needed
        }
