#!/usr/bin/env bash
# Bootstrap CRM ai-inference on a RunPod Pytorch GPU pod.
# Run ON the pod (SSH / Web Terminal) as root.
set -euo pipefail

SECRET="${AI_INTERNAL_SECRET:-}"
if [[ -z "$SECRET" ]]; then
  SECRET="$(openssl rand -hex 32)"
fi

echo "==> GPU check"
nvidia-smi

echo "==> Packages"
apt-get update -y
apt-get install -y git curl ffmpeg python3-pip python3-venv ca-certificates

echo "==> Ollama"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
mkdir -p /workspace/ollama
export OLLAMA_HOST=0.0.0.0
export OLLAMA_MODELS=/workspace/ollama
pkill -f "ollama serve" 2>/dev/null || true
nohup ollama serve >/workspace/ollama.log 2>&1 &
sleep 4
ollama pull llama3.1:8b

APP_DIR=/workspace/CRM/ai-inference
mkdir -p /workspace/CRM
if [[ ! -f "$APP_DIR/server.py" ]]; then
  echo "ERROR: $APP_DIR/server.py missing."
  echo "Upload ai-inference/ to /workspace/CRM/ai-inference first (scp or RunPod file manager)."
  exit 1
fi

cd "$APP_DIR"
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
pip install faster-whisper sentence-transformers

cat > .env <<EOF
AI_INTERNAL_SECRET=${SECRET}
AI_STUB_MODE=false
LLM_BASE_URL=http://127.0.0.1:11434/v1
AI_CHAT_MODEL=llama3.1:8b
AI_EMBED_MODEL=BAAI/bge-small-en-v1.5
WHISPER_MODEL=base
EOF

set -a; source .env; set +a
pkill -f "uvicorn server:app" 2>/dev/null || true
nohup uvicorn server:app --host 0.0.0.0 --port 8080 >/workspace/ai-inference.log 2>&1 &
sleep 3

echo "==> Health"
curl -s http://127.0.0.1:8080/health || true
echo
curl -s http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: ${SECRET}" \
  -d '{"messages":[{"role":"user","content":"Reply with exactly: ok"}]}' || true
echo
echo "=============================================="
echo "AI_INTERNAL_SECRET=${SECRET}"
echo "Put this in CRM / Vercel:"
echo "  AI_INFERENCE_URL=https://<POD_ID>-8080.proxy.runpod.net"
echo "  AI_INTERNAL_SECRET=${SECRET}"
echo "  AI_CHAT_MODEL=llama3.1:8b"
echo "=============================================="
