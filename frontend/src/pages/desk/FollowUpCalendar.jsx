import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { followUpsApi } from '../../api';
import DeskPage from '../../components/DeskPage';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getApiErrorMessage } from '../../utils/apiError';

function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function FollowUpCalendar() {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      followUpsApi.list({ type: 'today' }),
      followUpsApi.list({ type: 'pending' }),
      followUpsApi.list({ type: 'missed' }),
    ])
      .then(([a, b, c]) => {
        const map = new Map();
        for (const row of [...(a.data.data || []), ...(b.data.data || []), ...(c.data.data || [])]) {
          map.set(row.id, row);
        }
        setItems([...map.values()]);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load calendar')))
      .finally(() => setLoading(false));
  }, []);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const row of items) {
      if (!row.scheduledAt) continue;
      const d = new Date(row.scheduledAt);
      if (d.getFullYear() !== cursor.year || d.getMonth() !== cursor.month) continue;
      const key = d.getDate();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return map;
  }, [items, cursor]);

  const cells = monthMatrix(cursor.year, cursor.month);
  const label = new Date(cursor.year, cursor.month, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const shift = (delta) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <DeskPage
      kicker="Desk"
      title="Calendar"
      subtitle="Follow-ups plotted by scheduled day."
      actions={
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => shift(-1)}>Prev</button>
          <button type="button" className="btn-secondary" onClick={() => shift(1)}>Next</button>
        </div>
      }
    >
      {error ? <div className="alert-error mb-4">{error}</div> : null}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card">
          <p className="font-semibold text-main mb-3">{label}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const rows = day ? byDay.get(day) || [] : [];
              return (
                <div
                  key={`${cursor.month}-${i}`}
                  className="min-h-[72px] rounded-lg p-1.5 text-left"
                  style={{ background: day ? 'var(--surface-hover)' : 'transparent' }}
                >
                  {day ? <p className="text-xs font-semibold text-main">{day}</p> : null}
                  {rows.slice(0, 2).map((row) => (
                    <Link
                      key={row.id}
                      to={row.leadId ? `/leads/${row.leadId}` : '/follow-ups'}
                      className="block text-[10px] truncate mt-0.5"
                      style={{ color: '#c9a227' }}
                    >
                      {row.lead?.customerName || 'Follow-up'}
                    </Link>
                  ))}
                  {rows.length > 2 ? <p className="text-[10px] text-muted">+{rows.length - 2}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DeskPage>
  );
}
