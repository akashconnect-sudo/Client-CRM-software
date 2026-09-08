import { useEffect, useRef, useState } from 'react';
import { aiApi, pollAiJob } from '../api';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * Compact AI Advisor chat for Command Center (Combo 6/12 only).
 * Answers come from async AIJob + worker (self-hosted LLM).
 */
export default function AiAdvisorChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Ask about hot leads, follow-ups, or conversion. I query your workspace data only — never other companies.',
    },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput('');
    setError('');
    setBusy(true);
    const nextHistory = [...messages, { role: 'user', content: question }];
    setMessages(nextHistory);
    try {
      const res = await aiApi.askAdvisor({
        question,
        history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
      });
      const jobId = res.data?.data?.jobId;
      const job = await pollAiJob(jobId);
      if (job.status === 'FAILED') {
        throw new Error(job.error || 'AI job failed');
      }
      const reply = job.result?.reply || 'No reply generated.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'AI Advisor unavailable'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`ai-chat ${open ? 'ai-chat--open' : ''}`}>
      {!open ? (
        <button type="button" className="ai-chat__fab" onClick={() => setOpen(true)}>
          AI Advisor
        </button>
      ) : (
        <div className="ai-chat__panel">
          <header className="ai-chat__head">
            <div>
              <strong>AI Advisor</strong>
              <p>Self-hosted · your workspace only</p>
            </div>
            <button type="button" className="ai-chat__close" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </header>
          <div className="ai-chat__msgs">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`ai-chat__bubble ai-chat__bubble--${m.role}`}>
                {m.content}
              </div>
            ))}
            {busy && <div className="ai-chat__bubble ai-chat__bubble--assistant">Thinking…</div>}
            <div ref={bottomRef} />
          </div>
          {error && <p className="ai-chat__err">{error}</p>}
          <form
            className="ai-chat__form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. How many hot leads this week?"
              disabled={busy}
            />
            <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
