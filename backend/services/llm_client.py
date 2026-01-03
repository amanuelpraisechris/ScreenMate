"""Simple LLM client wrapper for AI extraction using Emergent integrations."""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class LLMClient:
    """Client for AI text generation using Emergent integrations."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get('EMERGENT_LLM_KEY')
        self._chat = None
    
    def _get_chat(self):
        """Lazy initialization of chat client."""
        if self._chat is None:
            from emergentintegrations.llm.openai import LlmChat
            self._chat = LlmChat(api_key=self.api_key).with_model("gpt-4o-mini")
        return self._chat
    
    async def generate(self, prompt: str, model: str = "gpt-4o-mini") -> str:
        """Generate text using the LLM."""
        if not self.api_key:
            raise ValueError("No API key configured for LLM")
        
        try:
            from emergentintegrations.llm.openai import LlmChat
            
            # Create a new chat instance for each request to avoid state issues
            chat = LlmChat(api_key=self.api_key).with_model(model)
            response = await chat.send_message(prompt)
            return response
        except ImportError as e:
            logger.error(f"emergentintegrations not installed: {e}")
            raise ValueError("LLM integration not available")
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise
