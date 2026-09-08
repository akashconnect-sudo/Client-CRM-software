import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { settingsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  requestDesktopPermission,
} from '../utils/notificationPrefs';
import { playNotificationSound } from '../utils/notificationSound';
import SubscriptionCard from '../components/settings/SubscriptionCard';
import AccountProfileCard from '../components/settings/AccountProfileCard';
import TeamNoticeCard from '../components/settings/TeamNoticeCard';
import IvrConnectionCard from '../components/settings/IvrConnectionCard';
import SeatTopUpCard from '../components/settings/SeatTopUpCard';
import { FEATURE_UNLOCK_HINT } from '../constants/workspaceNav';

const FIELDS = [
  { key: 'google_webhook_secret', label: 'Google Ads Webhook Secret', hint: 'Header: x-webhook-secret' },
  { key: 'meta_webhook_token', label: 'Meta Webhook Verify Token', hint: 'Meta subscription verification' },
  { key: 'meta_webhook_secret', label: 'Meta Webhook Secret', hint: 'Validate Meta lead webhooks' },
  { key: 'ivr_api_url', label: 'IVR API Base URL', hint: 'e.g. https://your-ivr.com/api — leave empty for demo calls' },
  { key: 'ivr_api_key', label: 'IVR API Key', hint: 'Bearer / X-API-Key for outbound calls' },
  { key: 'ivr_webhook_secret', label: 'IVR Webhook Secret', hint: 'Header: x-webhook-secret' },
  { key: 'api_base_url', label: 'CRM API Base URL', hint: 'IVR callback URL base, e.g. http://localhost:5000' },
  { key: 'lead_assignment_method', label: 'Lead Assignment', type: 'select', options: ['ROUND_ROBIN', 'MANUAL'] },
];

const AUTOMATION_FIELDS = [
  { key: 'automation_missed_followup', label: 'Missed follow-up alerts', type: 'toggle', hint: 'Notify when follow-ups are overdue' },
  { key: 'automation_followup_reminder', label: 'Follow-up reminders (2h before)', type: 'toggle' },
  { key: 'automation_stale_lead_enabled', label: 'Stale lead alerts', type: 'toggle', hint: 'No call on assigned lead for X days' },
  { key: 'automation_stale_lead_days', label: 'Stale lead after (days)', type: 'number' },
  { key: 'automation_unassigned_lead_alert', label: 'Unassigned leads alert (Managers)', type: 'toggle' },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSuperAdmin } = useAuth();
  const subscriptionRef = useRef(null);
  const [settings, setSettings] = useState({});
  const [superAdmin, setSuperAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [saForm, setSaForm] = useState({ mode: 'new', userId: '', name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saSaving, setSaSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saMessage, setSaMessage] = useState('');
  const [notifPrefs, setNotifPrefs] = useState(getNotificationPrefs());
  const [permStatus, setPermStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const load = () => {
    settingsApi
      .get()
      .then((res) => {
        const d = res.data.data;
        setSuperAdmin(d.superAdmin || null);
        const { superAdmin: _a, hasSuperAdmin: _b, ...rest } = d;
        setSettings(rest);
      })
      .catch(() => setMessage('Could not load settings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (isSuperAdmin) {
      settingsApi.usersForPromotion().then((res) => setUsers(res.data.data)).catch(() => {});
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    const focus = searchParams.get('focus');
    const unlock = searchParams.get('unlock');
    if (focus !== 'subscription' && !unlock) return;
    subscriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await settingsApi.update(settings);
      const d = res.data.data;
      setSuperAdmin(d.superAdmin || null);
      const { superAdmin: _a, hasSuperAdmin: _b, ...rest } = d;
      setSettings(rest);
      setMessage('Settings saved successfully');
    } catch {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSuperAdmin = async (e) => {
    e.preventDefault();
    setSaSaving(true);
    setSaMessage('');
    try {
      const payload =
        saForm.mode === 'promote'
          ? { userId: saForm.userId }
          : { name: saForm.name, email: saForm.email, phone: saForm.phone, password: saForm.password };
      const res = await settingsApi.assignSuperAdmin(payload);
      setSaMessage(res.data.message || 'Super Admin updated');
      setSaForm({ mode: 'new', userId: '', name: '', email: '', phone: '', password: '' });
      load();
      settingsApi.usersForPromotion().then((r) => setUsers(r.data.data));
    } catch (err) {
      setSaMessage(err.response?.data?.message || 'Failed to assign Super Admin');
    } finally {
      setSaSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-enter settings-page w-full max-w-5xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-main mb-6 sm:mb-8 tracking-tight">Settings</h1>

      {searchParams.get('unlock') ? (
        <div className="alert-info mb-4">
          {FEATURE_UNLOCK_HINT[searchParams.get('unlock')]?.title || 'This module'} needs{' '}
          {FEATURE_UNLOCK_HINT[searchParams.get('unlock')]?.need || 'a plan upgrade'}. Change modules or tier below.
        </div>
      ) : null}

      <div ref={subscriptionRef} className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 mb-6 sm:mb-8">
        <SubscriptionCard />
        <AccountProfileCard />
      </div>

      {isSuperAdmin && (
        <div className="mb-6 sm:mb-8 grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <IvrConnectionCard />
          <SeatTopUpCard />
        </div>
      )}

      {isSuperAdmin && <TeamNoticeCard />}

      {isSuperAdmin && (
        <div className="card w-full mb-6 sm:mb-8 border-2 border-primary-500/30">
          <h2 className="text-lg font-semibold text-primary-500 mb-1">Super Admin</h2>
          <p className="text-sm text-muted mb-4">
            Only one Super Admin is allowed. Adding a new one will change the current Super Admin to Manager.
          </p>

          {superAdmin && (
            <div className="rounded-xl p-3 mb-4 text-sm text-main" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <span className="text-muted">Current: </span>
              <strong>{superAdmin.name}</strong> ({superAdmin.email})
            </div>
          )}

          {saMessage && (
            <div className={`mb-4 ${saMessage.toLowerCase().includes('updated') || saMessage.toLowerCase().includes('success') ? 'alert-success' : 'alert-error'}`}>
              {saMessage}
            </div>
          )}

          <form onSubmit={handleSuperAdmin} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                className={saForm.mode === 'new' ? 'tab-pill-active text-sm !py-1.5 !px-3' : 'tab-pill text-sm !py-1.5 !px-3'}
                onClick={() => setSaForm({ ...saForm, mode: 'new' })}
              >
                New Super Admin
              </button>
              <button
                type="button"
                className={saForm.mode === 'promote' ? 'tab-pill-active text-sm !py-1.5 !px-3' : 'tab-pill text-sm !py-1.5 !px-3'}
                onClick={() => setSaForm({ ...saForm, mode: 'promote' })}
              >
                Promote Existing User
              </button>
            </div>

            {saForm.mode === 'promote' ? (
              <select
                className="input"
                value={saForm.userId}
                onChange={(e) => setSaForm({ ...saForm, userId: e.target.value })}
                required
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} — {u.email} ({u.role})</option>
                ))}
              </select>
            ) : (
              <>
                <input className="input" placeholder="Full name" value={saForm.name} onChange={(e) => setSaForm({ ...saForm, name: e.target.value })} required />
                <input className="input" type="email" placeholder="Email" value={saForm.email} onChange={(e) => setSaForm({ ...saForm, email: e.target.value })} required />
                <input className="input" placeholder="Phone" value={saForm.phone} onChange={(e) => setSaForm({ ...saForm, phone: e.target.value })} />
                <input className="input" type="password" placeholder="Password" value={saForm.password} onChange={(e) => setSaForm({ ...saForm, password: e.target.value })} required />
              </>
            )}

            <button type="submit" className="btn-primary" disabled={saSaving}>
              {saSaving ? 'Saving...' : 'Add / Replace Super Admin'}
            </button>
          </form>
        </div>
      )}

      <div className="card w-full mb-6 sm:mb-8 border border-primary-500/20">
        <h2 className="text-lg font-semibold text-main mb-1">🔔 Notifications & alerts</h2>
        <p className="text-sm text-muted mb-6">
          Ring sound + on-screen toast + desktop/mobile browser notifications. Click any alert to open the related lead or page.
        </p>

        <div className="space-y-4">
          {[
            { key: 'soundEnabled', label: 'Notification sound', desc: 'Play tone when new alert arrives' },
            { key: 'toastEnabled', label: 'On-screen popup', desc: 'Toast card top-right while CRM is open' },
            { key: 'desktopEnabled', label: 'Desktop / mobile push', desc: 'System notification when tab in background' },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-default cursor-pointer" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <div>
                <p className="font-medium text-main text-sm">{item.label}</p>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={!!notifPrefs[item.key]}
                onChange={(e) => {
                  const next = { ...notifPrefs, [item.key]: e.target.checked };
                  setNotifPrefs(next);
                  saveNotificationPrefs(next);
                }}
                className="w-5 h-5 accent-primary-600"
              />
            </label>
          ))}

          <div>
            <label className="block text-sm font-medium text-main mb-2">Check for new alerts every (seconds)</label>
            <input
              type="number"
              min={15}
              max={120}
              className="input max-w-[120px]"
              value={notifPrefs.pollIntervalSec}
              onChange={(e) => {
                const next = { ...notifPrefs, pollIntervalSec: parseInt(e.target.value, 10) || 30 };
                setNotifPrefs(next);
                saveNotificationPrefs(next);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={async () => {
                const p = await requestDesktopPermission();
                setPermStatus(p);
              }}
            >
              Enable browser notifications
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => playNotificationSound()}>
              Test sound
            </button>
          </div>
          <p className="text-xs text-muted">
            Browser permission: <strong className="text-main">{permStatus}</strong>
            {permStatus === 'denied' && ' — allow notifications in browser site settings'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="card w-full space-y-5 mb-6 sm:mb-8">
        <h2 className="font-semibold text-main">⚡ Smart automation</h2>
        <p className="text-sm text-muted -mt-3">Less manual work — CRM creates alerts & actions automatically (modern AI-era CRM style).</p>

        {AUTOMATION_FIELDS.map((f) => (
          <div key={f.key}>
            {f.type === 'toggle' ? (
              <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-default cursor-pointer" style={{ backgroundColor: 'var(--surface-hover)' }}>
                <div>
                  <p className="font-medium text-main text-sm">{f.label}</p>
                  {f.hint && <p className="text-xs text-muted">{f.hint}</p>}
                </div>
                <input
                  type="checkbox"
                  checked={settings[f.key] !== 'false'}
                  onChange={(e) => setSettings({ ...settings, [f.key]: e.target.checked ? 'true' : 'false' })}
                  className="w-5 h-5 accent-primary-600"
                />
              </label>
            ) : (
              <>
                <label className="block text-sm font-medium text-main mb-1">{f.label}</label>
                <input
                  type="number"
                  min={1}
                  className="input max-w-[120px]"
                  value={settings[f.key] || '3'}
                  onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                />
              </>
            )}
          </div>
        ))}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save automation'}
        </button>
      </form>

      <form onSubmit={handleSave} className="card w-full space-y-5">
        <h2 className="font-semibold text-main">Integrations</h2>
        {message && (
          <div className={message.includes('success') ? 'alert-success' : 'alert-error'}>
            {message}
          </div>
        )}

        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-main mb-1">{f.label}</label>
            {f.type === 'select' ? (
              <select className="input" value={settings[f.key] || ''} onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}>
                {f.options.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
              </select>
            ) : (
              <input
                className="input"
                type={f.key.includes('secret') || f.key.includes('token') || f.key.includes('key') ? 'password' : 'text'}
                value={settings[f.key] || ''}
                onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
              />
            )}
            {f.hint && <p className="text-xs text-subtle mt-1">{f.hint}</p>}
          </div>
        ))}

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Webhook Endpoints</h3>
          <div className="text-sm text-muted space-y-1 font-mono p-3 rounded-xl border border-default" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <p>POST /api/webhooks/google-leads?companyId=YOUR_ID</p>
            <p>POST /api/webhooks/meta-leads?companyId=YOUR_ID</p>
            <p>POST /api/webhooks/ivr-call-completed?companyId=YOUR_ID</p>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
