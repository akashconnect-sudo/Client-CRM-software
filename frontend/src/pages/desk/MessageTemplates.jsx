import { useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import DeskPage from '../../components/DeskPage';

const DEFAULTS = {
  whatsapp: [
    { id: 'wa-intro', name: 'Introduction', body: 'Hi {{name}}, this is {{agent}} from our sales desk. Do you have 2 minutes to discuss {{requirement}}?' },
    { id: 'wa-follow', name: 'Follow-up', body: 'Hi {{name}}, just circling back on our last conversation. When is a good time to connect today?' },
    { id: 'wa-offer', name: 'Offer', body: 'Hi {{name}}, sharing the details we discussed. Reply here if you want me to book a callback.' },
  ],
  email: [
    { id: 'em-intro', name: 'Introduction', body: 'Hi {{name}},\n\nThank you for your enquiry{{requirement}}.\n\nI would like to schedule a short call. What time works for you?\n\nRegards,\n{{agent}}' },
    { id: 'em-follow', name: 'Follow-up', body: 'Hi {{name}},\n\nFollowing up on my earlier note. Happy to answer any questions.\n\nRegards,\n{{agent}}' },
  ],
};

function storageKey(channel) {
  return `crm.templates.${channel}`;
}

function loadTemplates(channel) {
  try {
    const raw = localStorage.getItem(storageKey(channel));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULTS[channel] || [];
}

export default function MessageTemplates({ channel }) {
  const toast = useToast();
  const isWa = channel === 'whatsapp';
  const [templates, setTemplates] = useState(() => loadTemplates(channel));
  const [draft, setDraft] = useState({ name: '', body: '' });

  const title = isWa ? 'WhatsApp' : 'Email';

  const persist = (next) => {
    setTemplates(next);
    localStorage.setItem(storageKey(channel), JSON.stringify(next));
  };

  const add = (e) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.body.trim()) return;
    persist([...templates, { id: `${channel}-${Date.now()}`, name: draft.name.trim(), body: draft.body.trim() }]);
    setDraft({ name: '', body: '' });
    toast.success('Template saved on this device');
  };

  const copy = async (body) => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const hint = useMemo(
    () => (isWa ? 'Placeholders: {{name}} {{phone}} {{agent}} {{requirement}}' : 'Uses workspace SMTP when you send from Settings. Copy here for now.'),
    [isWa]
  );

  return (
    <DeskPage kicker="Templates" title={title} subtitle={hint}>
      <form className="card mb-4 grid gap-3" onSubmit={add}>
        <input
          className="input"
          placeholder="Template name"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
        <textarea
          className="input min-h-[120px]"
          placeholder="Message body"
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
        />
        <div>
          <button type="submit" className="btn-primary">Save template</button>
        </div>
      </form>
      <div className="space-y-3">
        {templates.map((tpl) => (
          <article key={tpl.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-main">{tpl.name}</h2>
              <button type="button" className="btn-secondary" onClick={() => copy(tpl.body)}>Copy</button>
            </div>
            <pre className="text-sm text-muted mt-2 whitespace-pre-wrap font-sans">{tpl.body}</pre>
          </article>
        ))}
      </div>
    </DeskPage>
  );
}
