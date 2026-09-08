import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { callsApi, followUpsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import DeskPage from '../../components/DeskPage';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatDate } from '../../utils/constants';
import { userCanAccessIVR, userCanAccessLeads } from '../../utils/planAccess';

export default function Interactions() {
  const { user } = useAuth();
  const hasLeads = userCanAccessLeads(user);
  const hasIvr = userCanAccessIVR(user);
  const [followUps, setFollowUps] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const jobs = [];
    if (hasLeads) {
      jobs.push(
        Promise.all([
          followUpsApi.list({ type: 'pending' }),
          followUpsApi.list({ type: 'today' }),
        ]).then(([pending, today]) => {
          const map = new Map();
          for (const row of [...(pending.data.data || []), ...(today.data.data || [])]) map.set(row.id, row);
          if (!cancelled) setFollowUps([...map.values()]);
        }).catch(() => {
          if (!cancelled) setFollowUps([]);
        })
      );
    }
    if (hasIvr) {
      jobs.push(
        callsApi.list({ limit: 50 }).then((res) => {
          if (!cancelled) setCalls(res.data.data || []);
        }).catch(() => {
          if (!cancelled) setCalls([]);
        })
      );
    }
    Promise.all(jobs)
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load interactions'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasLeads, hasIvr]);

  const timeline = useMemo(() => {
    const items = [
      ...followUps.map((f) => ({
        id: `fu-${f.id}`,
        at: f.scheduledAt || f.createdAt,
        kind: 'Follow-up',
        title: f.lead?.customerName || f.lead?.phone || 'Customer',
        detail: f.remarks || 'Scheduled touchpoint',
        to: f.leadId ? `/leads/${f.leadId}` : '/follow-ups',
      })),
      ...calls.map((c) => ({
        id: `call-${c.id}`,
        at: c.startedAt || c.createdAt,
        kind: c.callType || 'Call',
        title: c.customerPhone || c.lead?.customerName || 'Number',
        detail: c.callStatus || 'Logged',
        to: c.leadId ? `/leads/${c.leadId}` : '/calls',
      })),
    ];
    return items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0, 80);
  }, [followUps, calls]);

  return (
    <DeskPage kicker="Desk" title="Interactions" subtitle="Follow-ups and calls on one timeline.">
      {error ? <div className="alert-error mb-4">{error}</div> : null}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">No interactions yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {timeline.map((row) => (
                <li key={row.id} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-main">
                      <Link to={row.to} className="hover:underline">{row.title}</Link>
                    </p>
                    <p className="text-xs text-muted mt-0.5">{row.kind} · {row.detail}</p>
                  </div>
                  <span className="text-xs text-muted">{formatDate(row.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </DeskPage>
  );
}
