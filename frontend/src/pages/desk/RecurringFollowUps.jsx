import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { followUpsApi } from '../../api';
import DeskPage from '../../components/DeskPage';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatDate } from '../../utils/constants';

export default function RecurringFollowUps() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    followUpsApi
      .list({ type: 'pending' })
      .then((res) => setItems(res.data.data || []))
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load follow-ups')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DeskPage
      kicker="Desk"
      title="Recurring Follow-Ups"
      subtitle="Upcoming scheduled touchpoints — complete them from Follow-up Radar or the lead profile."
      actions={<Link to="/follow-ups?type=pending" className="btn-secondary">Open radar</Link>}
    >
      {error ? <div className="alert-error mb-4">{error}</div> : null}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-x-auto">
          {!items.length ? (
            <p className="text-sm text-muted">No upcoming follow-ups scheduled.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-default">
                    <td className="py-2.5 pr-3">
                      <Link className="text-main font-medium hover:underline" to={row.leadId ? `/leads/${row.leadId}` : '/follow-ups'}>
                        {row.lead?.customerName || row.lead?.phone || 'Customer'}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-muted">{formatDate(row.scheduledAt)}</td>
                    <td className="py-2.5 text-muted">{row.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </DeskPage>
  );
}
