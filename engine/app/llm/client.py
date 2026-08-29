"""
LLM client setup — talks to any OpenAI-compatible chat completions endpoint,
so the provider is a config swap, not a code change: a hosted API (OpenAI,
Anthropic-compatible gateways, OpenRouter, Groq, ...) or a local server
(Ollama, LM Studio, vLLM). Configure via three env vars:

  LLM_BASE_URL - e.g. http://host.docker.internal:11434/v1 for Ollama running
                 on the Docker host, or a hosted provider's /v1 URL.
  LLM_API_KEY  - any non-empty string works for most local servers (they
                 don't check it); a real key for hosted providers.
  LLM_MODEL    - a model id the endpoint recognizes (e.g. an `ollama pull`ed
                 tag, or a hosted provider's model id).
"""

import os
from openai import OpenAI

LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:3b")

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=os.getenv("LLM_BASE_URL") or None,
            api_key=os.getenv("LLM_API_KEY") or "not-needed",
        )
    return _client
