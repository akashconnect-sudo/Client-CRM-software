import { useEffect, useState } from 'react';
import { ivrApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { userCanAccessIVR } from '../../utils/planAccess';

const PROVIDER_FIELDS = {
  EXOTEL: [
    { key: 'apiKey', label: 'API Key / Sid' },
    { key: 'apiSecret', label: 'API Token' },
    { key: 'instanceId', label: 'Subdomain / Account Sid' },
  ],
  KNOWLARITY: [
    { key: 'apiKey', label: 'API Key' },
    { key: 'apiSecret', label: 'API Secret (optional)' },
    { key: 'instanceId', label: 'Channel / Number ID' },
  ],
  OZONETEL: [
    { key: 'apiKey', label: 'API Key' },
    { key: 'apiSecret', label: 'API Secret' },
    { key: 'instanceId', label: 'Username / Campaign' },
  ],
  MYOPERATOR: [
    { key: 'apiKey', label: 'API Token' },
    { key: 'instanceId', label: 'Company ID' },
  ],
  AMAZON_CONNECT: [
    { key: 'instanceId', label: 'Connect Instance ID / ARN' },
    { key: 'apiKey', label: 'Access key (optional)' },
    { key: 'apiSecret', label: 'Secret key (optional)' },
  ],
  OTHER: [
    { key: 'apiKey', label: 'API Key' },
    { key: 'apiSecret', label: 'API Secret' },
    { key: 'instanceId', label: 'Account / Instance ID' },
  ],
};

export default function IvrConnectionCard() {
  const { user, isSuperAdmin } = useAuth();
  const [meta, setMeta] = useState(null);
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({ provider: 'EXOTEL', apiKey: '', apiSecret: '', instanceId: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [rotatedSecret, setRotatedSecret] = useState('');

  const load = () => {
    ivrApi
      .getIntegration()
      .then((res) => setMeta(res.data.data))
      .catch(() => setMeta(null));
    ivrApi.providers().then((res) => setProviders(res.data.data || [])).catch(() => {});
    ivrApi
      .webhookInfo()
      .then((res) => setWebhookInfo(res.data.data))
      .catch(() => setWebhookInfo(null));
  };

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  const integration = meta?.integration;
  const hasIvrModule = meta?.hasIvrModule;
  const fields = PROVIDER_FIELDS[form.provider] || PROVIDER_FIELDS.OTHER;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const res = await ivrApi.saveIntegration(form);
      setMeta((m) => ({ ...m, integration: res.data.data }));
      setMessage('Saved. Paste the webhook URL into your IVR vendor, then Test Connection.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setMessage('');
    try {
      await ivrApi.testIntegration();
      setMessage('Connection verified — Call Bridge will show external calls.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Test failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-main">IVR Connection</h2>
        <p className="text-sm text-muted mt-1">
          Native Amazon Connect (IVR module) or connect your own provider for Leads-only desks.
        </p>
      </div>

      {hasIvrModule && (
        <div className="rounded-xl border border-default p-4 space-y-3" style={{ background: 'var(--surface-hover)' }}>
          <div>
            <p className="text-sm font-medium text-main">Native IVR · Amazon Connect</p>
            <p className="text-xs text-muted mt-1">
              Status: {integration?.mode === 'NATIVE' ? integration?.status || 'CONNECTED' : 'Available with IVR module'}
              {webhookInfo?.hasSecret ? ' · webhook secret configured' : ' · rotate a secret before going live'}
            </p>
          </div>
          {webhookInfo && (
            <div className="text-xs space-y-1 break-all">
              <p className="text-muted">Company ID</p>
              <code className="text-main">{webhookInfo.companyId}</code>
              <p className="text-muted mt-2">Webhook URL</p>
              <code className="text-main">{webhookInfo.webhookUrl}</code>
              <p className="text-muted mt-2">
                Headers: <code>x-company-id</code>, <code>x-webhook-secret</code>
              </p>
            </div>
          )}
          {rotatedSecret ? (
            <div className="rounded-lg border border-amber-500/40 p-3 text-xs">
              <p className="text-amber-400 font-medium mb-1">Copy this secret now — it will not be shown again</p>
              <code className="text-main break-all">{rotatedSecret}</code>
            </div>
          ) : null}
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage('');
              setRotatedSecret('');
              try {
                const res = await ivrApi.rotateWebhookSecret();
                setRotatedSecret(res.data.data.webhookSecret);
                setMessage('Webhook secret rotated. Put it in the Lambda COMPANY_MAP.');
                load();
              } catch (err) {
                setMessage(err.response?.data?.message || 'Rotate failed');
              } finally {
                setBusy(false);
              }
            }}
          >
            Rotate webhook secret
          </button>
        </div>
      )}

      {(!hasIvrModule || integration?.mode === 'EXTERNAL') && (
        <form onSubmit={save} className="space-y-3">
          <p className="text-sm font-medium text-main">Connect your own IVR (BYO)</p>
          <label className="block text-xs text-muted">
            Provider
            <select
              className="input mt-1 w-full"
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
            >
              {(providers.length ? providers : Object.keys(PROVIDER_FIELDS)).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          {fields.map((field) => (
            <label key={field.key} className="block text-xs text-muted">
              {field.label}
              <input
                className="input mt-1 w-full"
                type={field.key.includes('Secret') || field.key === 'apiSecret' ? 'password' : 'text'}
                value={form[field.key] || ''}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                placeholder={integration?.[`has${field.key[0].toUpperCase()}${field.key.slice(1)}`] ? '•••• saved' : ''}
              />
            </label>
          ))}
          {integration?.webhookUrl && (
            <div className="rounded-lg border border-default p-3 text-xs break-all">
              <p className="text-muted mb-1">Inbound webhook URL (paste in vendor dashboard)</p>
              <code className="text-main">{integration.webhookUrl}</code>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              Save connection
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={test}>
              Test connection
            </button>
          </div>
          {integration?.status && (
            <p className="text-xs text-muted">
              Status: <strong className="text-main">{integration.status}</strong>
              {integration.lastError ? ` — ${integration.lastError}` : ''}
            </p>
          )}
        </form>
      )}

      {message && <p className="text-sm text-muted">{message}</p>}
      {userCanAccessIVR(user) && (
        <p className="text-xs text-subtle">Call Bridge is available for this workspace.</p>
      )}
    </section>
  );
}
