"""Audit logging service."""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from models import AuditLog, AuditAction


class AuditService:
    def __init__(self, db):
        self.db = db
        self.collection = db.audit_logs
    
    async def log(self, 
                  project_id: str,
                  action: AuditAction,
                  user_id: str = "default_user",
                  study_id: Optional[str] = None,
                  details: Optional[Dict[str, Any]] = None):
        """Create an audit log entry."""
        log_entry = AuditLog(
            project_id=project_id,
            study_id=study_id,
            user_id=user_id,
            action=action,
            details=details or {}
        )
        doc = log_entry.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await self.collection.insert_one(doc)
        return log_entry
    
    async def get_logs(self, 
                       project_id: str, 
                       study_id: Optional[str] = None,
                       limit: int = 100):
        """Get audit logs for a project or study."""
        query = {"project_id": project_id}
        if study_id:
            query["study_id"] = study_id
        
        cursor = self.collection.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
        logs = await cursor.to_list(limit)
        return logs
