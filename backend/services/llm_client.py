"""Simple LLM client wrapper for AI extraction using Emergent integrations."""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class LLMClient:
    """Client for AI text generation using Emergent integrations."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get('EMERGENT_LLM_KEY')
        self._client = None
    
    async def generate(self, prompt: str, model: str = "gpt-4o-mini") -> str:
        """Generate text using the LLM."""
        if not self.api_key:
            raise ValueError("No API key configured for LLM")
        
        try:
            # Lazy import to avoid issues if not installed
            from emergentintegrations.llm.openai import generate_text
            
            response = await generate_text(
                api_key=self.api_key,
                prompt=prompt,
                model=model
            )
            return response
        except ImportError:
            logger.error("emergentintegrations not installed")
            raise ValueError("LLM integration not available")
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise
