import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi, leadsApi } from '../../api';
import DeskPage from '../../components/DeskPage';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getApiErrorMessage } from '../../utils/apiError';

export default function Allocations() {
  const [employees, setEmployees] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([employeesApi.list(), leadsApi.list({ limit: 5000, page: 1 })])
      .then(([empRes, leadRes]) => {
        setEmployees(empRes.data.data || []);
        setLeads(Array.isArray(leadRes.data.data) ? leadRes.data.data : []);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load allocations')))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const counts = new Map();
    let unassigned = 0;
    for (const lead of leads) {
      if (!lead.assignedToId) {
        unassigned += 1;
        continue;
      }
      counts.set(lead.assignedToId, (counts.get(lead.assignedToId) || 0) + 1);
    }
    return {
      unassigned,
      people: employees.map((emp) => ({
        ...emp,
        leadCount: counts.get(emp.id) || 0,
      })),
    };
  }, [employees, leads]);

  return (
    <DeskPage
      kicker="Desk"
      title="Allocations"
      subtitle="Who owns which customers — assign unassigned leads from the pipeline."
      actions={
        <Link to="/leads" className="btn-secondary">Open customers</Link>
      }
    >
      {error ? <div className="alert-error mb-4">{error}</div> : null}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <Link to="/leads" className="stat-card block">
            <p className="stat-card__title">Unassigned</p>
            <p className="stat-card__value">{rows.unassigned}</p>
            <p className="stat-card__sub">Waiting for an owner</p>
          </Link>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-3">Teammate</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Assigned</th>
                  <th className="py-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.people.map((emp) => (
                  <tr key={emp.id} className="border-t border-default">
                    <td className="py-2.5 pr-3 text-main font-medium">{emp.name}</td>
                    <td className="py-2.5 pr-3 text-muted">{String(emp.role || '').replace(/_/g, ' ')}</td>
                    <td className="py-2.5 pr-3">{emp.leadCount}</td>
                    <td className="py-2.5">
                      <Link className="text-primary-400 hover:underline" to={`/leads?assignedToId=${emp.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.people.length ? <p className="text-sm text-muted py-4">No teammates yet. Add them under Team.</p> : null}
          </div>
        </div>
      )}
    </DeskPage>
  );
}
