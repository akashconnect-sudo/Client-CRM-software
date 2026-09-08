import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leadsApi } from '../../api';
import DeskPage from '../../components/DeskPage';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatDate } from '../../utils/constants';

export default function RechurnCustomers() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      leadsApi.list({ status: 'LOST', limit: 5000, page: 1 }),
      leadsApi.list({ status: 'NOT_INTERESTED', limit: 5000, page: 1 }),
    ])
      .then(([lost, skip]) => {
        const a = Array.isArray(lost.data.data) ? lost.data.data : [];
        const b = Array.isArray(skip.data.data) ? skip.data.data : [];
        const map = new Map();
        for (const row of [...a, ...b]) map.set(row.id, row);
        setLeads([...map.values()]);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load rechurn list')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DeskPage
      kicker="Desk"
      title="Rechurn Customers"
      subtitle="Lost and not-interested records — reopen them from the customer profile."
    >
      {error ? <div className="alert-error mb-4">{error}</div> : null}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-x-auto">
          {!leads.length ? (
            <p className="text-sm text-muted">No lost or not-interested customers.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-default">
                    <td className="py-2.5 pr-3">
                      <Link className="text-main font-medium hover:underline" to={`/leads/${lead.id}`}>
                        {lead.customerName || '—'}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-muted">{lead.phone || '—'}</td>
                    <td className="py-2.5 pr-3"><StatusBadge status={lead.status} /></td>
                    <td className="py-2.5 text-muted">{formatDate(lead.updatedAt || lead.createdAt)}</td>
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
