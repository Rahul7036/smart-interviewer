import os
import json
import asyncio
import requests
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

class AIProvider(ABC):
    """Abstract base class for AI providers"""
    
    @abstractmethod
    async def generate_text(self, prompt: str, **kwargs) -> str:
        pass
    
    @abstractmethod
    async def generate_structured_response(self, prompt: str, schema: Dict) -> Dict:
        pass
    
    @abstractmethod
    def validate_config(self, config: Dict) -> bool:
        pass

class GeminiProvider(AIProvider):
    """Google Gemini AI provider"""
    
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
    
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using Gemini API"""
        try:
            url = f"{self.base_url}/models/{self.model}:generateContent"
            headers = {
                "Content-Type": "application/json",
            }
            
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": kwargs.get("temperature", 0.7),
                    "maxOutputTokens": kwargs.get("max_tokens", 2048),
                }
            }
            
            response = requests.post(
                f"{url}?key={self.api_key}",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["candidates"][0]["content"]["parts"][0]["text"]
            else:
                raise Exception(f"Gemini API error: {response.status_code} - {response.text}")
        
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            raise
    
    async def generate_structured_response(self, prompt: str, schema: Dict) -> Dict:
        """Generate structured response using Gemini API"""
        try:
            # Add schema instruction to prompt
            structured_prompt = f"""
            {prompt}
            
            Please respond with a valid JSON object that matches this schema:
            {json.dumps(schema, indent=2)}
            
            Return only the JSON object, no additional text.
            """
            
            response_text = await self.generate_text(structured_prompt)
            
            # Try to parse JSON response
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract JSON from response
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                else:
                    raise Exception("Could not parse structured response as JSON")
        
        except Exception as e:
            logger.error(f"Error generating structured response: {str(e)}")
            raise
    
    def validate_config(self, config: Dict) -> bool:
        """Validate Gemini configuration"""
        return bool(config.get("api_key"))

class OpenAIProvider(AIProvider):
    """OpenAI API provider"""
    
    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.openai.com/v1"
    
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using OpenAI API"""
        try:
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            
            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": kwargs.get("temperature", 0.7),
                "max_tokens": kwargs.get("max_tokens", 2048),
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")
        
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {str(e)}")
            raise
    
    async def generate_structured_response(self, prompt: str, schema: Dict) -> Dict:
        """Generate structured response using OpenAI API"""
        try:
            structured_prompt = f"""
            {prompt}
            
            Please respond with a valid JSON object that matches this schema:
            {json.dumps(schema, indent=2)}
            
            Return only the JSON object, no additional text.
            """
            
            response_text = await self.generate_text(structured_prompt)
            
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                else:
                    raise Exception("Could not parse structured response as JSON")
        
        except Exception as e:
            logger.error(f"Error generating structured response: {str(e)}")
            raise
    
    def validate_config(self, config: Dict) -> bool:
        """Validate OpenAI configuration"""
        return bool(config.get("api_key"))

class AnthropicProvider(AIProvider):
    """Anthropic Claude API provider"""
    
    def __init__(self, api_key: str, model: str = "claude-3-sonnet-20240229"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.anthropic.com/v1"
    
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using Anthropic API"""
        try:
            url = f"{self.base_url}/messages"
            headers = {
                "x-api-key": self.api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01"
            }
            
            payload = {
                "model": self.model,
                "max_tokens": kwargs.get("max_tokens", 2048),
                "messages": [{"role": "user", "content": prompt}]
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return result["content"][0]["text"]
            else:
                raise Exception(f"Anthropic API error: {response.status_code} - {response.text}")
        
        except Exception as e:
            logger.error(f"Error calling Anthropic API: {str(e)}")
            raise
    
    async def generate_structured_response(self, prompt: str, schema: Dict) -> Dict:
        """Generate structured response using Anthropic API"""
        try:
            structured_prompt = f"""
            {prompt}
            
            Please respond with a valid JSON object that matches this schema:
            {json.dumps(schema, indent=2)}
            
            Return only the JSON object, no additional text.
            """
            
            response_text = await self.generate_text(structured_prompt)
            
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                else:
                    raise Exception("Could not parse structured response as JSON")
        
        except Exception as e:
            logger.error(f"Error generating structured response: {str(e)}")
            raise
    
    def validate_config(self, config: Dict) -> bool:
        """Validate Anthropic configuration"""
        return bool(config.get("api_key"))

class AIService:
    """Main AI service that manages different providers"""
    
    def __init__(self):
        self.providers = {
            "gemini": GeminiProvider,
            "openai": OpenAIProvider,
            "anthropic": AnthropicProvider
        }
        self.current_provider = None
        self.current_instance = None
        
        # Load default configuration
        self._load_default_config()
    
    def _load_default_config(self):
        """Load default configuration from environment variables"""
        # Try to load Gemini API key from environment
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            self.configure_provider("gemini", gemini_key)
    
    def get_available_providers(self) -> List[Dict]:
        """Get list of available AI providers"""
        return [
            {
                "name": "gemini",
                "display_name": "Google Gemini",
                "description": "Google's Gemini AI model",
                "default_model": "gemini-2.5-flash"
            },
            {
                "name": "openai",
                "display_name": "OpenAI",
                "description": "OpenAI's GPT models",
                "default_model": "gpt-3.5-turbo"
            },
            {
                "name": "anthropic",
                "display_name": "Anthropic Claude",
                "description": "Anthropic's Claude models",
                "default_model": "claude-3-sonnet-20240229"
            }
        ]
    
    def configure_provider(self, provider: str, api_key: str, model: str = None, settings: Dict = None) -> bool:
        """Configure AI provider"""
        try:
            if provider not in self.providers:
                logger.error(f"Unknown provider: {provider}")
                return False
            
            # Create provider instance
            provider_class = self.providers[provider]
            
            # Set default model if not provided
            if not model:
                provider_info = next(p for p in self.get_available_providers() if p["name"] == provider)
                model = provider_info["default_model"]
            
            # Create instance
            instance = provider_class(api_key, model)
            
            # Validate configuration
            if not instance.validate_config({"api_key": api_key}):
                logger.error(f"Invalid configuration for provider: {provider}")
                return False
            
            # Set as current provider
            self.current_provider = provider
            self.current_instance = instance
            
            logger.info(f"Configured AI provider: {provider} with model: {model}")
            return True
            
        except Exception as e:
            logger.error(f"Error configuring provider {provider}: {str(e)}")
            return False
    
    def get_current_provider(self) -> str:
        """Get current AI provider name"""
        return self.current_provider or "none"
    
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using current provider"""
        if not self.current_instance:
            raise Exception("No AI provider configured")
        
        return await self.current_instance.generate_text(prompt, **kwargs)
    
    async def generate_structured_response(self, prompt: str, schema: Dict) -> Dict:
        """Generate structured response using current provider"""
        if not self.current_instance:
            raise Exception("No AI provider configured")
        
        return await self.current_instance.generate_structured_response(prompt, schema)
