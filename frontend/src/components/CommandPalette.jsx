import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessFeatureForUser } from '../utils/planAccess';

const BASE_ACTIONS = [
  { id: 'dashboard', label: 'Go to Dashboard', path: '/dashboard', keys: ['home', 'dash'] },
  { id: 'leads', label: 'Open Customers', path: '/leads', keys: ['lead', 'pipeline', 'customer'] },
  { id: 'followups', label: 'Follow-ups', path: '/follow-ups', keys: ['task', 'today'] },
  { id: 'calendar', label: 'Calendar', path: '/calendar', keys: ['cal', 'schedule'] },
  { id: 'interactions', label: 'Interactions', path: '/interactions', keys: ['timeline'] },
  { id: 'gmail', label: 'Gmail Inbox', path: '/inbox/gmail', keys: ['google', 'inbox'] },
  { id: 'rechurn', label: 'Rechurn Customers', path: '/rechurn', keys: ['lost', 'rechurn'] },
  { id: 'whatsapp', label: 'WhatsApp templates', path: '/templates/whatsapp', keys: ['wa', 'template'] },
  { id: 'new-lead', label: 'Create new customer', path: '/leads?action=new', keys: ['add', 'create'] },
];

const ADMIN_ACTIONS = [
  { id: 'allocations', label: 'Allocations', path: '/allocations', keys: ['assign'] },
  { id: 'employees', label: 'Team', path: '/employees', keys: ['team', 'staff'] },
  { id: 'calls', label: 'Call Logs', path: '/calls', keys: ['ivr', 'phone'] },
  { id: 'reports', label: 'Request Reports', path: '/reports', keys: ['export'] },
  { id: 'analytics', label: 'Analytics', path: '/analytics', keys: ['analytics', 'charts'] },
  { id: 'email', label: 'Email templates', path: '/templates/email', keys: ['email', 'template'] },
  { id: 'settings', label: 'Settings', path: '/settings', keys: ['config', 'webhook'] },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const actions = useMemo(() => {
    const list = [...BASE_ACTIONS];
    if (isAdmin) list.push(...ADMIN_ACTIONS);
    return list.filter((a) => {
      const featureMap = {
        dashboard: 'dashboard',
        leads: 'leads',
        followups: 'follow-ups',
        calendar: 'calendar',
        interactions: 'interactions',
        gmail: 'gmailInbox',
        rechurn: 'rechurn',
        whatsapp: 'whatsappTemplates',
        'new-lead': 'leads',
        allocations: 'allocations',
        employees: 'employees',
        calls: 'callBridge',
        reports: 'reports',
        analytics: 'analytics',
        email: 'emailTemplates',
        settings: 'settings',
      };
      const feat = featureMap[a.id];
      if (feat && !canAccessFeatureForUser(user, feat)) return false;
      return true;
    });
  }, [isAdmin, user?.plan]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.keys.some((k) => k.includes(q) || q.includes(k))
    );
  }, [actions, query]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  const run = (path) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  return (
    <div className="cmd-palette-backdrop" onClick={() => setOpen(false)} role="presentation">
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="cmd-palette__head">
          <span>⌘</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to module or action…"
          />
          <kbd>ESC</kbd>
        </div>
        <ul className="cmd-palette__list">
          {filtered.length === 0 ? (
            <li className="cmd-palette__empty">No matches</li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.id}>
                <button type="button" className={i === 0 ? 'is-active' : ''} onClick={() => run(item.path)}>
                  <span>{item.label}</span>
                  <kbd>{item.path}</kbd>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="cmd-palette__hint">Ctrl+K anywhere in the CRM</p>
      </div>
    </div>
  );
}

export function CommandPaletteHint() {
  return (
    <button
      type="button"
      className="cmd-palette-trigger"
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
      title="Command palette (Ctrl+K)"
    >
      <span>⌘K</span>
    </button>
  );
}
