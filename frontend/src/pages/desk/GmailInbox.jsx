import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leadsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import DeskPage from '../../components/DeskPage';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatDate } from '../../utils/constants';

export default function GmailInbox() {
  const { isAdmin } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    leadsApi
      .list({ source: 'GOOGLE_ADS', limit: 5000, page: 1 })
      .then((res) => setLeads(Array.isArray(res.data.data) ? res.data.data : []))
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load Google leads')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DeskPage
      kicker="Inbox"
      title="Gmail Inbox"
      subtitle="Google Ads lead intake — same records as Customers, filtered to Google."
      actions={isAdmin ? <Link to="/settings" className="btn-secondary">Webhook setup</Link> : null}
    >
      {error ? <div className="alert-error mb-4">{error}</div> : null}
      <div className="alert-info mb-4">
        New Google form / Ads leads land here via the workspace webhook. Connect the URL from Settings.
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-x-auto">
          {!leads.length ? (
            <p className="text-sm text-muted">No Google Ads leads yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Received</th>
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
                    <td className="py-2.5 text-muted">{formatDate(lead.createdAt)}</td>
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
