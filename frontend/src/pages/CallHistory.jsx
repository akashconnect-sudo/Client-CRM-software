import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { callsApi, employeesApi } from '../api';
import { useAuth } from '../context/AuthContext';
import RecordingPlayer from '../components/RecordingPlayer';
import LoadingSpinner from '../components/LoadingSpinner';
import { SOURCE_LABELS, formatDate, formatDuration } from '../utils/constants';

export default function CallHistory() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [calls, setCalls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    employeeId: '',
    callStatus: searchParams.get('callStatus') || '',
    callType: searchParams.get('callType') || '',
    source: '',
  });

  const load = () => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    callsApi.list(params).then((res) => setCalls(res.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    setFilters((f) => ({
      ...f,
      callStatus: searchParams.get('callStatus') || '',
      callType: searchParams.get('callType') || '',
    }));
  }, [searchParams]);

  useEffect(() => {
    if (isAdmin) employeesApi.list().then((res) => setEmployees(res.data.data));
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [filters.callStatus, filters.callType, filters.employeeId, filters.source]);

  return (
    <div className="page-enter">
      <h1 className="text-xl sm:text-2xl font-bold text-main mb-2">Call Logs</h1>
      <p className="text-sm text-muted mb-6">
        Recordings play inside the CRM. Call logs cannot be deleted.
      </p>

      <div className="card mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <input
          className="input w-full sm:max-w-xs"
          placeholder="Search phone..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        {isAdmin && (
          <select
            className="input max-w-[180px]"
            value={filters.employeeId}
            onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
        <select
          className="input max-w-[140px]"
          value={filters.callStatus}
          onChange={(e) => setFilters({ ...filters, callStatus: e.target.value })}
        >
          <option value="">All Status</option>
          {['ANSWERED', 'MISSED', 'FAILED', 'BUSY'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="input max-w-[140px]"
          value={filters.callType}
          onChange={(e) => setFilters({ ...filters, callType: e.target.value })}
        >
          <option value="">All Direction</option>
          {['INCOMING', 'OUTGOING', 'MISSED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="input max-w-[140px]"
          value={filters.source}
          onChange={(e) => setFilters({ ...filters, source: e.target.value })}
        >
          <option value="">All Sources</option>
          {['GOOGLE_ADS', 'META_ADS', 'MANUAL'].map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </select>
        <button className="btn-secondary w-full sm:w-auto" onClick={load} type="button">
          Filter
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-x-auto -mx-0">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-muted border-b">
                <th className="pb-3 pr-4">Date/Time</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Lead</th>
                <th className="pb-3 pr-4">Employee</th>
                <th className="pb-3 pr-4">Duration</th>
                <th className="pb-3 pr-4">Direction</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Recording</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-b border-default">
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDate(c.callStartTime)}</td>
                  <td className="py-3 pr-4">
                    <div>{c.lead?.customerName || '—'}</div>
                    <div className="text-xs text-muted">{c.customerPhone || ''}</div>
                  </td>
                  <td className="py-3 pr-4">
                    {c.lead ? (
                      <Link to={`/leads/${c.lead.id}`} className="text-primary-600 hover:underline">
                        SNO {c.lead.leadNumber}
                      </Link>
                    ) : (
                      <span className="text-subtle">Unlinked</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">{c.employee?.name || 'Unlinked'}</td>
                  <td className="py-3 pr-4">{formatDuration(c.durationSeconds)}</td>
                  <td className="py-3 pr-4">{c.callType}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`badge ${
                        c.callStatus === 'ANSWERED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {c.callStatus}
                    </span>
                  </td>
                  <td className="py-3">
                    <RecordingPlayer
                      callId={c.id}
                      hasRecordingKey={Boolean(c.recordingKey)}
                      legacyUrl={c.recordingUrl}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {calls.length === 0 && <p className="text-center py-8 text-muted">No calls found</p>}
        </div>
      )}
    </div>
  );
}
