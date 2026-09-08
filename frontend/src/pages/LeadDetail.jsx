import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { leadsApi, employeesApi, callsApi, aiApi, pollAiJob } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import StatusBadge from '../components/StatusBadge';
import AudioPlayer from '../components/AudioPlayer';
import LoadingSpinner from '../components/LoadingSpinner';
import LeadPulseBadge from '../components/leads/LeadPulseBadge';
import { LEAD_STATUSES, SOURCE_LABELS, formatDate, formatDuration } from '../utils/constants';
import { userCanAccessAI } from '../utils/planAccess';

export default function LeadDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const canAI = userCanAccessAI(user);
  const [lead, setLead] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [note, setNote] = useState('');
  const [followUp, setFollowUp] = useState({ scheduledAt: '', remarks: '' });
  const [assignId, setAssignId] = useState('');
  const [calling, setCalling] = useState(false);
  const [callMsg, setCallMsg] = useState('');
  const [draft, setDraft] = useState('');
  const [draftBusy, setDraftBusy] = useState(false);

  const load = () => leadsApi.get(id).then((res) => setLead(res.data.data));

  useEffect(() => {
    load();
    if (isAdmin) employeesApi.list().then((res) => setEmployees(res.data.data)).catch(() => {});
  }, [id, isAdmin]);

  useEffect(() => {
    if (lead?.assignedToId) setAssignId(lead.assignedToId);
  }, [lead?.assignedToId]);

  const handleNote = async () => {
    if (!note.trim()) return;
    try {
      await leadsApi.addNote(id, note);
      setNote('');
      toast.success('Note added');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to add note'));
    }
  };

  const handleFollowUp = async () => {
    if (!followUp.scheduledAt) {
      toast.error('Select follow-up date & time');
      return;
    }
    try {
      await leadsApi.addFollowUp(id, followUp);
      setFollowUp({ scheduledAt: '', remarks: '' });
      toast.success('Follow-up scheduled');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to schedule follow-up'));
    }
  };

  const handleAssign = async () => {
    if (!assignId) {
      toast.error('Select an employee');
      return;
    }
    try {
      await leadsApi.assign(id, assignId);
      toast.success('Lead assigned');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Assign failed'));
    }
  };

  const handleStatus = async (status) => {
    try {
      await leadsApi.update(id, { status });
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    }
  };

  const handleCall = async () => {
    setCalling(true);
    setCallMsg('');
    try {
      const res = await callsApi.initiate({ leadId: id, customerPhone: lead.phone });
      setCallMsg(res.data.message || 'Call started');
      load();
    } catch (err) {
      setCallMsg(err.response?.data?.message || 'Call failed');
    } finally {
      setCalling(false);
    }
  };

  const handleSuggestMessage = async () => {
    setDraftBusy(true);
    try {
      const res = await aiApi.suggestFollowUp(id);
      const job = await pollAiJob(res.data?.data?.jobId);
      if (job.status === 'FAILED') throw new Error(job.error || 'Draft failed');
      setDraft(job.result?.draft || '');
      toast.success('Draft ready — review before sending');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not draft message'));
    } finally {
      setDraftBusy(false);
    }
  };

  useEffect(() => {
    if (!canAI || !lead || searchParams.get('suggest') !== '1' || draftBusy || draft) return;
    setSearchParams({}, { replace: true });
    handleSuggestMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAI, lead?.id, searchParams]);

  if (!lead) return <LoadingSpinner />;

  return (
    <div className="page-enter">
      <Link to="/leads" className="text-primary-500 text-sm hover:underline mb-4 inline-block transition-colors">&larr; Back to Leads</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-main tracking-tight">{lead.customerName}</h1>
          <p className="text-muted">SNO {lead.leadNumber} &middot; {SOURCE_LABELS[lead.source]}</p>
          <div className="mt-2">
            <LeadPulseBadge lead={lead} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={handleCall}
              disabled={calling}
              className="btn-primary flex items-center gap-2"
            >
              {calling ? 'Calling...' : '📞 Call via IVR'}
            </button>
          )}
          <StatusBadge status={lead.status} />
        </div>
      </div>
      {isAdmin && callMsg && <p className="text-sm text-main mb-4 alert-info">{callMsg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted">Phone</span><p className="font-medium text-main">{lead.phone}</p></div>
            <div><span className="text-muted">Email</span><p className="font-medium">{lead.email || '-'}</p></div>
            <div><span className="text-muted">City</span><p className="font-medium">{lead.city || '-'}</p></div>
            <div><span className="text-muted">Assigned To</span><p className="font-medium">{lead.assignedTo?.name || 'Unassigned'}</p></div>
            <div><span className="text-muted">Campaign</span><p className="font-medium">{lead.campaignName || '-'}</p></div>
            <div><span className="text-muted">Follow-up</span><p className="font-medium">{formatDate(lead.followUpDate)}</p></div>
            <div className="col-span-2"><span className="text-muted">Requirement</span><p className="font-medium mt-1">{lead.requirement || '-'}</p></div>
          </div>

          {isAdmin && (
            <div className="card">
              <h2 className="font-semibold mb-4 text-main">Call History & Recordings</h2>
              {lead.callLogs?.length === 0 ? (
                <p className="text-muted text-sm">No calls yet</p>
              ) : (
                <div className="space-y-4">
                  {lead.callLogs.map((c) => (
                    <div key={c.id} className="border rounded-lg p-4 flex flex-wrap justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {c.callType} &middot; {c.callStatus}
                          {c.sentimentLabel && (
                            <span className={`ml-2 text-xs font-semibold sentiment-pill sentiment-pill--${String(c.sentimentLabel).toLowerCase()}`}>
                              {c.sentimentLabel}
                              {c.sentimentScore != null ? ` · ${Math.round(Number(c.sentimentScore) * 100)}%` : ''}
                            </span>
                          )}
                          {c.sourceMode === 'EXTERNAL_IVR' && c.provider && (
                            <span className="ml-2 text-xs font-normal text-muted">via {c.provider}</span>
                          )}
                        </p>
                        <p className="text-sm text-muted">{formatDate(c.callStartTime)} &middot; {formatDuration(c.durationSeconds)}</p>
                        <p className="text-sm">Agent: {c.employee?.name || 'Unknown'}</p>
                        {c.summary && (
                          <p className="text-sm mt-2 text-main"><span className="text-muted">AI summary:</span> {c.summary}</p>
                        )}
                        {c.transcript && (
                          <details className="mt-2 text-sm">
                            <summary className="cursor-pointer text-muted">Transcript</summary>
                            <p className="mt-1 whitespace-pre-wrap text-main">{c.transcript}</p>
                          </details>
                        )}
                      </div>
                      <AudioPlayer url={c.recordingUrl} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h2 className="font-semibold mb-4 text-main">Timeline</h2>
            <div className="space-y-3">
              {(lead.timeline || []).map((a) => (
                <div key={a.id} className="flex gap-3 text-sm border-l-2 border-primary-200 pl-4">
                  <div>
                    <p className="font-medium">{a.type.replace(/_/g, ' ')}</p>
                    <p className="text-muted">{a.description}</p>
                    <p className="text-xs text-subtle">{formatDate(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {isAdmin && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-main">Assign Lead</h3>
              <select className="input" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
                <option value="">Select employee</option>
                {employees.filter((e) => e.status === 'ACTIVE').map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <button className="btn-primary w-full" onClick={handleAssign} disabled={!assignId}>Assign</button>
            </div>
          )}

          <div className="card space-y-3">
            <h3 className="font-semibold text-main">Update Status</h3>
            <select className="input" value={lead.status} onChange={(e) => handleStatus(e.target.value)}>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div className="card space-y-3">
            <h3 className="font-semibold text-main">Add Note</h3>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-primary w-full" onClick={handleNote}>Save Note</button>
            {lead.notes?.map((n) => (
              <div key={n.id} className="text-sm border-t pt-2">
                <p>{n.content}</p>
                <p className="text-xs text-subtle">{n.author?.name} &middot; {formatDate(n.createdAt)}</p>
              </div>
            ))}
          </div>

          <div className="card space-y-3">
            <h3 className="font-semibold text-main">Schedule Follow-up</h3>
            <input type="datetime-local" className="input" value={followUp.scheduledAt}
              onChange={(e) => setFollowUp({ ...followUp, scheduledAt: e.target.value })} />
            <textarea className="input" rows={2} placeholder="Remarks" value={followUp.remarks}
              onChange={(e) => setFollowUp({ ...followUp, remarks: e.target.value })} />
            <button className="btn-primary w-full" onClick={handleFollowUp}>Schedule</button>
            {canAI && (
              <>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={handleSuggestMessage}
                  disabled={draftBusy}
                >
                  {draftBusy ? 'Drafting…' : 'Suggest message'}
                </button>
                {draft && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted">Review & edit — never auto-sent</p>
                    <textarea
                      className="input"
                      rows={5}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-secondary w-full"
                      onClick={() => {
                        navigator.clipboard?.writeText(draft);
                        toast.success('Copied — paste into your channel and send manually');
                      }}
                    >
                      Copy draft
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
