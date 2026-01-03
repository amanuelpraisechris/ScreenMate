"""Simple LLM client wrapper for AI extraction using Emergent integrations."""
import os
import logging
import uuid
from typing import Optional

logger = logging.getLogger(__name__)


class LLMClient:
    """Client for AI text generation using Emergent integrations."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get('EMERGENT_LLM_KEY')
    
    async def generate(self, prompt: str, model: str = "gpt-4o-mini", provider: str = "openai") -> str:
        """Generate text using the LLM."""
        if not self.api_key:
            raise ValueError("No API key configured for LLM")
        
        try:
            from emergentintegrations.llm.openai import LlmChat
            
            # Create a new chat instance for each request
            session_id = str(uuid.uuid4())
            system_message = "You are a helpful assistant for systematic review screening and data extraction. Always respond with valid JSON when asked."
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=system_message
            ).with_model(provider, model)
            
            response = await chat.send_message(prompt)
            return response
        except ImportError as e:
            logger.error(f"emergentintegrations not installed: {e}")
            raise ValueError("LLM integration not available")
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise
