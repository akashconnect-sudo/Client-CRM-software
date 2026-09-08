"""
ai-inference — private LLM gateway for the CRM.

Same contract as production (RunPod): /v1/chat/completions, /transcribe, /embed.
Local: Ollama on this machine. Production: point LLM_BASE_URL at vLLM/Ollama on GPU box.
"""

from __future__ import annotations

import hashlib
import math
import os
import tempfile
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

# Load .env next to this file when present
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

APP_SECRET = os.getenv("AI_INTERNAL_SECRET", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://127.0.0.1:11434/v1").rstrip("/")
LLM_MODEL = os.getenv("AI_CHAT_MODEL", "llama3.2:1b")
EMBED_MODEL_NAME = os.getenv("AI_EMBED_MODEL", "nomic-embed-text")
EMBED_DIM = int(os.getenv("AI_EMBED_DIM", "768"))
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "tiny")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")  # cpu | cuda
STUB_MODE = os.getenv("AI_STUB_MODE", "false").lower() == "true"

app = FastAPI(title="CRM ai-inference", version="0.2.0")


def require_secret(x_internal_secret: str | None):
    if not APP_SECRET:
        return
    if not x_internal_secret or x_internal_secret != APP_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


class ChatRequest(BaseModel):
    model: str | None = None
    messages: list[dict[str, Any]]
    temperature: float = 0.2
    max_tokens: int = 800


class TranscribeRequest(BaseModel):
    audioUrl: str
    language: str = "en"


class EmbedRequest(BaseModel):
    texts: list[str] = Field(default_factory=list)


@app.get("/health")
async def health():
    llm_ok = False
    detail = None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{LLM_BASE_URL.replace('/v1', '')}/api/tags")
            llm_ok = r.status_code < 400
    except Exception as exc:  # noqa: BLE001
        detail = str(exc)[:200]
    return {
        "ok": True,
        "stub": STUB_MODE,
        "llm": LLM_BASE_URL,
        "model": LLM_MODEL,
        "embedModel": EMBED_MODEL_NAME,
        "llmReachable": llm_ok,
        "detail": detail,
        "mode": "local-real" if not STUB_MODE else "stub",
    }


@app.post("/v1/chat/completions")
async def chat_completions(
    body: ChatRequest,
    x_internal_secret: str | None = Header(default=None),
):
    require_secret(x_internal_secret)
    if STUB_MODE:
        last = next((m.get("content") for m in reversed(body.messages) if m.get("role") == "user"), "")
        return {
            "id": "stub-chat",
            "object": "chat.completion",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": f"[stub] {str(last)[:200]}",
                    },
                    "finish_reason": "stop",
                }
            ],
        }

    payload = {
        "model": body.model or LLM_MODEL,
        "messages": body.messages,
        "temperature": body.temperature,
        "max_tokens": body.max_tokens,
    }
    async with httpx.AsyncClient(timeout=300.0) as client:
        r = await client.post(f"{LLM_BASE_URL}/chat/completions", json=payload)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=r.text[:800])
        return r.json()


@app.post("/transcribe")
async def transcribe(
    body: TranscribeRequest,
    x_internal_secret: str | None = Header(default=None),
):
    require_secret(x_internal_secret)
    if STUB_MODE:
        return {"text": f"[stub transcript for {body.audioUrl[:80]}]", "language": body.language}

    try:
        from faster_whisper import WhisperModel  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=501,
            detail="faster-whisper not installed. pip install faster-whisper",
        ) from exc

    async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as client:
        audio = await client.get(body.audioUrl)
        if audio.status_code >= 400:
            raise HTTPException(status_code=400, detail="Could not download audioUrl")

    compute = "int8" if WHISPER_DEVICE == "cpu" else "float16"
    with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as tmp:
        tmp.write(audio.content)
        path = tmp.name
    try:
        model = WhisperModel(WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=compute)
        segments, info = model.transcribe(path, language=body.language or None)
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return {"text": text, "language": getattr(info, "language", body.language)}
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def _hash_embed(text: str, dim: int) -> list[float]:
    """Deterministic unit vector — only used if Ollama embed fails (keeps RAG pipeline alive)."""
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    vals = []
    seed = digest
    while len(vals) < dim:
        seed = hashlib.sha256(seed).digest()
        for b in seed:
            vals.append((b / 255.0) * 2 - 1)
            if len(vals) >= dim:
                break
    norm = math.sqrt(sum(v * v for v in vals)) or 1.0
    return [v / norm for v in vals]


@app.post("/embed")
async def embed(
    body: EmbedRequest,
    x_internal_secret: str | None = Header(default=None),
):
    require_secret(x_internal_secret)
    texts = body.texts or []
    if STUB_MODE:
        return {
            "embeddings": [_hash_embed(t, 384) for t in texts],
            "model": "stub-hash-384",
        }

    # Prefer Ollama native embeddings (same stack as chat — no extra PyTorch)
    ollama_root = LLM_BASE_URL.replace("/v1", "")
    embeddings: list[list[float]] = []
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            for t in texts:
                r = await client.post(
                    f"{ollama_root}/api/embeddings",
                    json={"model": EMBED_MODEL_NAME, "prompt": t},
                )
                if r.status_code >= 400:
                    raise HTTPException(status_code=502, detail=r.text[:500])
                data = r.json()
                vec = data.get("embedding")
                if not vec:
                    raise HTTPException(status_code=502, detail="No embedding in Ollama response")
                embeddings.append(vec)
        return {"embeddings": embeddings, "model": EMBED_MODEL_NAME}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        # Fallback keeps CRM jobs moving on low-RAM machines
        return {
            "embeddings": [_hash_embed(t, EMBED_DIM) for t in texts],
            "model": f"hash-fallback-{EMBED_DIM}",
            "warning": str(exc)[:200],
        }
