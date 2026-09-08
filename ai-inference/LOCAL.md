# Local AI (production-parity)

Project root: **E:\\CRM**  
Heavy runtime (Ollama/models/venv): **D:\\crm-ai-stack** (keeps C: free).

## Start

```powershell
powershell -ExecutionPolicy Bypass -File D:\crm-ai-stack\start-crm-ai.ps1
```

Or from repo: `E:\CRM\ai-inference\start-local.ps1`

## What runs

| Service | URL |
|---------|-----|
| Ollama (real LLM) | `http://127.0.0.1:11434` |
| ai-inference gateway | `http://127.0.0.1:8090` |
| CRM AI worker | polls Neon `ai_jobs` (cwd `E:\CRM\backend`) |

- Model: `llama3.2:1b` (fits ~8GB RAM, no NVIDIA). Same OpenAI-compatible API as RunPod.
- Upgrade later: `ollama pull llama3.1:8b` + set `AI_CHAT_MODEL` when you have GPU/16GB+.
- Backend `.env` already has `AI_INFERENCE_URL` + secret.

## After start

1. Restart CRM API from `E:\CRM\backend` (`npm run dev`) so it picks up AI env.
2. Combo + 6/12 month workspace → Dashboard **AI Advisor**.
