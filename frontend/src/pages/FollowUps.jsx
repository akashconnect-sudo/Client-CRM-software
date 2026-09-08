import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { followUpsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDate } from '../utils/constants';
import { userCanAccessAI } from '../utils/planAccess';

function followUpUrgency(scheduledAt, tab) {
  if (tab === 'missed') return { label: 'Overdue', className: 'urgency urgency--critical' };
  const hours = (new Date(scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hours < 0) return { label: 'Late', className: 'urgency urgency--critical' };
  if (hours < 4) return { label: 'Urgent', className: 'urgency urgency--high' };
  if (hours < 24) return { label: 'Today', className: 'urgency urgency--medium' };
  return { label: 'Scheduled', className: 'urgency urgency--low' };
}

const TABS = [
  { key: 'today', label: "Today's Follow-ups" },
  { key: 'pending', label: 'Pending' },
  { key: 'missed', label: 'Missed' },
];

export default function FollowUps() {
  try {
  const { isAdmin, user } = useAuth();
  const canAI = userCanAccessAI(user);
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get('type') || 'today';
  const [followUps, setFollowUps] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      followUpsApi.list({ type }),
      followUpsApi.dashboard(),
    ])
      .then(([listRes, dashRes]) => {
        setFollowUps(listRes.data.data);
        setDashboard(dashRes.data.data);
      })
      .catch((err) => {
        const msg = getApiErrorMessage(err, 'Failed to load follow-ups');
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [type]);

  const complete = async (id) => {
    try {
      await followUpsApi.complete(id);
      setFollowUps((prev) => prev.filter((f) => f.id !== id));
      toast.success('Follow-up completed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not complete'));
    }
  };

  return (
    <div className="page-enter">
      <h1 className="text-2xl font-bold text-main mb-2 tracking-tight">Follow-up Radar</h1>
      <p className="text-sm text-muted mb-8">Urgency-ranked touchpoints — missed items surface first.</p>

      {dashboard && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { key: 'today', count: dashboard.today, label: 'Today', color: 'text-primary-600' },
            { key: 'pending', count: dashboard.pending, label: 'Pending', color: 'text-amber-600' },
            { key: 'missed', count: dashboard.missed, label: 'Missed', color: 'text-red-600' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSearchParams({ type: item.key })}
              className={`card text-center w-full transition-all hover:border-primary-500/50 active:scale-[0.98] ${
                type === item.key ? 'ring-2 ring-primary-500 border-primary-500/50' : ''
              }`}
            >
              <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
              <p className="text-sm text-muted">{item.label}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSearchParams({ type: t.key })}
            className={type === t.key ? 'tab-pill-active' : 'tab-pill'}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        error ? (
          <div className="text-center py-12 text-red-600 card font-medium">{error}</div>
        ) : Array.isArray(followUps) && followUps.length === 0 ? (
          <div className="text-center py-12 text-muted card">No follow-ups found or you do not have access to this feature in your plan.</div>
        ) : !Array.isArray(followUps) ? (
          <div className="text-center py-12 text-red-600 card font-medium">Unexpected error: followUps data is not an array.</div>
        ) : (
          <div className="space-y-3">
            {followUps.map((f) => {
              const urgency = followUpUrgency(f.scheduledAt, type);
              return (
              <div key={f.id} className="card flex flex-wrap items-center justify-between gap-4 follow-up-card">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={urgency.className}>{urgency.label}</span>
                    <Link to={`/leads/${f.lead.id}`} className="font-semibold text-primary-600 hover:underline">
                      {f.lead.customerName}
                    </Link>
                  </div>
                  <p className="text-sm text-muted">{f.lead.phone} &middot; {formatDate(f.scheduledAt)}</p>
                  {f.remarks && <p className="text-sm mt-1">{f.remarks}</p>}
                  {isAdmin && <p className="text-xs text-subtle">Employee: {f.employee?.name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {canAI && (
                    <Link
                      to={`/leads/${f.lead.id}?suggest=1`}
                      className="btn-secondary text-sm no-underline"
                    >
                      Suggest message
                    </Link>
                  )}
                  <button className="btn-primary text-sm" onClick={() => complete(f.id)}>Mark Complete</button>
                </div>
              </div>
            );})}
          </div>
        )
      )}
    </div>
  );
  } catch (err) {
    console.error('FollowUps page error:', err);
    return <div className="text-center py-12 text-red-600 card font-medium">Error: {err.message || String(err)}</div>;
  }
}
