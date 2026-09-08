import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../../api';
import DeskPage from '../../components/DeskPage';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getApiErrorMessage } from '../../utils/apiError';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    reportsApi
      .dashboard()
      .then((res) => setData(res.data.data || null))
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load analytics')))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total customers', value: data?.totalLeads ?? 0 },
    { label: 'Converted', value: data?.convertedLeads ?? data?.conversions ?? '—' },
    { label: 'Conversion', value: data?.conversionRate != null ? `${Number(data.conversionRate).toFixed(1)}%` : '—' },
    { label: 'Calls', value: data?.totalCalls ?? 0 },
    { label: 'Follow-ups today', value: data?.todayFollowUps ?? 0 },
    { label: 'Missed follow-ups', value: data?.missedFollowUps ?? 0 },
  ];

  return (
    <DeskPage
      kicker="Insight"
      title="Analytics"
      subtitle="Workspace snapshot — export detail from Request Reports."
      actions={<Link to="/reports" className="btn-secondary">Request reports</Link>}
    >
      {error ? <div className="alert-error mb-4">{error}</div> : null}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((card) => (
            <div key={card.label} className="stat-card">
              <p className="stat-card__title">{card.label}</p>
              <p className="stat-card__value">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </DeskPage>
  );
}
