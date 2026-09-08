# Self-hosted AI inference — setup guide

Private GPU service for the Sales Lead CRM. **Do not deploy this on Vercel** (no GPU, short request limits).

Your CRM backend (Vercel or local) only talks to this box over a private URL + shared secret. Heavy work runs here via `npm run ai:worker`.

---

## What runs on the GPU box

| Process | Port (example) | Job |
|---------|----------------|-----|
| **vLLM** or **Ollama** | `8000` | Chat LLM (OpenAI-compatible `/v1/chat/completions`) |
| **ai-inference** (this FastAPI app) | `8080` | Auth wrapper + `/transcribe` + `/embed` + proxy to LLM |
| **CRM AI worker** | — | Polls Neon `ai_jobs`, calls this service |

```
CRM API (enqueue job) → Neon AIJob
                              ↓
                    ai:worker (same GPU box or worker VM)
                              ↓
              AI_INFERENCE_URL → FastAPI :8080
                     ├─ /v1/chat/completions → Ollama/vLLM :8000
                     ├─ /transcribe          → faster-whisper
                     └─ /embed               → sentence-transformers
```

---

## Step 0 — Decide: RunPod (easiest) vs AWS EC2

| | **RunPod** (recommended to start) | **AWS EC2** |
|--|-----------------------------------|-------------|
| Why | Rent GPU by the hour, templates, less AWS setup | Already in AWS, VPC with Neon/private networking |
| GPU | RTX 4090 / A40 / L4 (~24GB VRAM for 8B models) | `g4dn.xlarge` (T4) or `g5.xlarge` (A10G) |
| Cost | Often cheaper to experiment | Predictable if you already use AWS |

**Model to start:** Llama 3.1 8B Instruct **or** Qwen2.5 7B Instruct (fits one mid GPU). Upgrade to 70B later on bigger hardware.

---

## RunPod only — exact settings + copy-paste

Follow this path if you just want the GPU box live today (Ollama + this FastAPI wrapper + CRM worker).

### A. Deploy the pod (UI)

1. Open [runpod.io](https://www.runpod.io/) → **Pods** → **+ Deploy**.
2. **GPU:** any with **≥20 GB VRAM** (good picks: **RTX 4090 24GB**, **A40 48GB**, **L40S**). Avoid 8–12GB cards for 8B instruct.
3. **Template:** `RunPod Pytorch 2.1` / `Pytorch` (CUDA already there). Or `Ubuntu` + CUDA if you prefer bare.
4. **Container disk:** **40 GB** minimum (better **60–80 GB** so models fit).
5. **Volume disk (optional):** 40 GB persistent if you want models to survive pod stop/start.
6. **Expose HTTP ports:** add **`8080`** (our FastAPI). Do **not** expose Ollama publicly.
7. **Environment variables** (optional in UI; you can also set later in shell):
   - leave blank for now; we set secrets in `.env` on the machine.
8. Click **Deploy On-Demand** → wait until status is **Running**.
9. Open the pod → **Connect** → **Start Web Terminal** (or SSH if you added a key).
10. Note the **proxy URL** for port 8080 (RunPod shows something like  
    `https://<pod-id>-8080.proxy.runpod.net`). That becomes your `AI_INFERENCE_URL`.

### B. One-shot setup script (paste in Web Terminal)

```bash
# --- 0) basics ---
nvidia-smi
sudo apt-get update -y
sudo apt-get install -y git curl ffmpeg python3-pip python3-venv ca-certificates

# --- 1) Ollama ---
curl -fsSL https://ollama.com/install.sh | sh
# run in background (keep this terminal OR use a second Web Terminal / tmux)
nohup ollama serve > /tmp/ollama.log 2>&1 &
sleep 3
ollama pull llama3.1:8b
# smoke test
curl -s http://127.0.0.1:11434/api/tags | head

# --- 2) CRM ai-inference (clone YOUR repo; replace URL) ---
cd ~
# git clone https://github.com/YOUR_USER/YOUR_CRM.git CRM
# If repo is private, use a deploy key / PAT, or scp the ai-inference folder up.
cd ~/CRM/ai-inference   # adjust path if needed

python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
pip install faster-whisper sentence-transformers

# --- 3) secrets + config ---
SECRET=$(openssl rand -hex 32)
echo "SAVE THIS SECRET FOR CRM BACKEND:"
echo "$SECRET"

cat > .env <<EOF
AI_INTERNAL_SECRET=${SECRET}
AI_STUB_MODE=false
LLM_BASE_URL=http://127.0.0.1:11434/v1
AI_CHAT_MODEL=llama3.1:8b
AI_EMBED_MODEL=BAAI/bge-small-en-v1.5
WHISPER_MODEL=base
EOF

set -a; source .env; set +a

# --- 4) start FastAPI on 8080 ---
nohup uvicorn server:app --host 0.0.0.0 --port 8080 > /tmp/ai-inference.log 2>&1 &
sleep 2
curl -s http://127.0.0.1:8080/health
curl -s http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: ${SECRET}" \
  -d '{"messages":[{"role":"user","content":"Reply with exactly: ok"}]}'
```

If `git clone` is awkward, from your PC (PowerShell) you can upload just this folder:

```powershell
# install scp / use RunPod file manager, or:
# zip ai-inference and upload via RunPod Jupyter / file browser
```

### C. Point CRM at RunPod

Vercel / `backend/.env`:

```env
AI_INFERENCE_URL=https://<pod-id>-8080.proxy.runpod.net
AI_INTERNAL_SECRET=<paste-the-SECRET-from-step-B>
AI_CHAT_MODEL=llama3.1:8b
```

No trailing slash. Redeploy backend after setting Vercel env vars.

Neon (once):

```bash
cd backend
npm run db:migrate-ai
```

### D. AI worker on the same RunPod (recommended)

Second Web Terminal (or `tmux`):

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

cd ~/CRM/backend
npm ci

cat > .env <<EOF
DATABASE_URL="postgresql://...neon.../neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://...neon.../neondb?sslmode=require"
AI_INFERENCE_URL=http://127.0.0.1:8080
AI_INTERNAL_SECRET=<same-SECRET>
AI_CHAT_MODEL=llama3.1:8b
AI_WORKER_POLL_MS=2500
EOF

npx prisma generate
nohup npm run ai:worker > /tmp/ai-worker.log 2>&1 &
tail -f /tmp/ai-worker.log
```

Use your real Neon `DATABASE_URL` / `DIRECT_URL` from local `backend/.env`. Worker talks to inference on **localhost** (faster + private).

### E. Verify from your laptop

```powershell
curl https://<pod-id>-8080.proxy.runpod.net/health
curl https://<pod-id>-8080.proxy.runpod.net/v1/chat/completions `
  -H "Content-Type: application/json" `
  -H "X-Internal-Secret: YOUR_SECRET" `
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}"
```

Then in the CRM (Combo + 6/12 month workspace): open Dashboard → **AI Advisor** → ask “how many leads do I have?”. Worker log should show `ADVISOR_CHAT … → DONE`.

### F. Keep processes alive after disconnect

```bash
sudo apt-get install -y tmux
tmux new -s ai
# pane 1: ollama serve
# pane 2: uvicorn …
# pane 3: npm run ai:worker
# Ctrl+B D to detach
```

Or stop the pod when idle to save money — you’ll need to `ollama pull` again unless you used a **Network Volume** for `/root/.ollama`.

### RunPod cost tip

- Start On-Demand for testing; stop the pod when done.
- Secure Cloud / network volume if you restart often.
- Never leave port **11434** (Ollama) exposed on the proxy.

---

## Step 1 — Create the GPU machine

### Option A — RunPod

Use the **[RunPod only](#runpod-only--exact-settings--copy-paste)** section above.

### Option B — AWS EC2

1. EC2 → Launch instance → AMI: **Deep Learning OSS Nvidia Driver AMI** (Ubuntu) or Ubuntu 22.04 + install CUDA yourself.
2. Instance type: **`g4dn.xlarge`** or **`g5.xlarge`**.
3. Storage: **≥80 GB** gp3.
4. Security group:
   - SSH `22` from your IP only.
   - **TCP 8080** only from your CRM/worker IPs (or a bastion / VPN). **Do not open 8080 to `0.0.0.0/0`.**
5. Launch → SSH in: `ssh -i your.pem ubuntu@<public-ip>`.

---

## Step 2 — System packages (both providers)

```bash
sudo apt update
sudo apt install -y git curl python3-pip python3-venv ffmpeg
nvidia-smi   # must show a GPU
```

If `nvidia-smi` fails on EC2, reboot once after the NVIDIA driver AMI finishes installing.

Clone your CRM (or only copy the `ai-inference` folder):

```bash
git clone <your-crm-repo-url> CRM
cd CRM/ai-inference
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
pip install faster-whisper sentence-transformers torch  # GPU builds as needed
```

---

## Step 3 — Run the LLM (pick **one**: Ollama *or* vLLM)

### Path A — Ollama (simpler for first bring-up)

```bash
curl -fsSL https://ollama.com/install.sh | sh
# Serve on all interfaces so FastAPI on localhost can reach it
OLLAMA_HOST=0.0.0.0:11434 ollama serve &

# Pull an instruct model (one of these)
ollama pull llama3.1:8b
# or: ollama pull qwen2.5:7b
```

Ollama’s OpenAI-compatible API is usually:

`http://127.0.0.1:11434/v1`

Test:

```bash
curl http://127.0.0.1:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.1:8b","messages":[{"role":"user","content":"ping"}]}'
```

### Path B — vLLM (better throughput for production)

```bash
pip install vllm
# Example — Llama 3.1 8B (Hugging Face access may be required)
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Meta-Llama-3.1-8B-Instruct \
  --host 127.0.0.1 \
  --port 8000 \
  --dtype auto
```

Or Qwen:

```bash
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --host 127.0.0.1 \
  --port 8000
```

Base URL for our wrapper: `http://127.0.0.1:8000/v1`

---

## Step 4 — Configure & start `ai-inference` (this FastAPI app)

```bash
cd ~/CRM/ai-inference
source .venv/bin/activate
cp .env.example .env
nano .env
```

Set something like:

```env
AI_INTERNAL_SECRET=long-random-string-same-as-crm-backend
AI_STUB_MODE=false

# Ollama:
LLM_BASE_URL=http://127.0.0.1:11434/v1
AI_CHAT_MODEL=llama3.1:8b

# OR vLLM:
# LLM_BASE_URL=http://127.0.0.1:8000/v1
# AI_CHAT_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct

AI_EMBED_MODEL=BAAI/bge-small-en-v1.5
WHISPER_MODEL=base
```

Generate a secret:

```bash
openssl rand -hex 32
```

Start the API (bind to private interface / all if RunPod proxy protects it):

```bash
export $(grep -v '^#' .env | xargs)
uvicorn server:app --host 0.0.0.0 --port 8080
```

Keep it alive with **systemd**, **tmux**, or **Docker restart**.

Health check:

```bash
curl http://127.0.0.1:8080/health
```

Chat through the wrapper (must send secret):

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: YOUR_SECRET" \
  -d '{"messages":[{"role":"user","content":"Say hello in one short sentence."}]}'
```

---

## Step 5 — Wire the CRM backend

On Vercel / local `backend` env:

```env
AI_INFERENCE_URL=https://YOUR-RUNPOD-OR-EC2-HOST:8080
AI_INTERNAL_SECRET=same-secret-as-ai-inference
AI_CHAT_MODEL=llama3.1:8b
AI_EMBED_MODEL=bge-small-en
```

Also on Neon:

```bash
cd backend
npm run db:migrate-ai
```

AI features unlock only for **Combo (LEADS+IVR) + 6 or 12 month** plans.

---

## Step 6 — Run the AI worker (required)

LLM/transcription is too slow for a normal Vercel request. Jobs sit in Postgres; a worker must process them.

**Best:** run the worker on the **same GPU box** (or a small always-on VM that can reach Neon + inference).

```bash
# On GPU box — Node 20+, clone backend, set DATABASE_URL + AI_* env
cd ~/CRM/backend
npm ci
# .env: DATABASE_URL, DIRECT_URL, AI_INFERENCE_URL=http://127.0.0.1:8080, AI_INTERNAL_SECRET=...
npm run ai:worker
```

You should see logs like: `[ai-worker] ADVISOR_CHAT <id> → DONE`.

---

## Step 7 — Security checklist

- [ ] `AI_STUB_MODE=false` in production  
- [ ] Same `AI_INTERNAL_SECRET` on CRM + inference; never commit it  
- [ ] Port **8080** not open to the whole internet (SG / RunPod firewall / reverse proxy + IP allowlist)  
- [ ] Prefer private networking (VPC / Tailscale / Cloudflare Tunnel) if CRM is on Vercel  
- [ ] Do **not** expose Ollama/vLLM ports publicly — only FastAPI with the secret  
- [ ] Worker + inference process supervised (systemd / Docker)

---

## Quick local smoke test (no GPU)

Windows / laptop stub (fake replies, tests plumbing only):

```powershell
cd ai-inference
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
$env:AI_STUB_MODE="true"
$env:AI_INTERNAL_SECRET="dev-secret"
uvicorn server:app --port 8080
```

CRM `.env`: `AI_INFERENCE_URL=http://127.0.0.1:8080`, `AI_INTERNAL_SECRET=dev-secret`, then `npm run ai:worker`.

---

## Suggested order for you

1. Local stub + worker → confirm Advisor / Suggest message / jobs work  
2. RunPod + Ollama 8B + FastAPI (`AI_STUB_MODE=false`)  
3. Point production CRM env at RunPod URL + secret  
4. Later: swap Ollama → vLLM, upgrade Whisper size, bigger model
