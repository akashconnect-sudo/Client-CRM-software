import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildAdvisorState } from '../utils/enterpriseAdvisorEngine';
import { useToast } from '../context/ToastContext';

const STORAGE_KEY = 'crm-advisor-steps';

function loadCompleted() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCompleted(map) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function severityClass(s) {
  if (s === 'critical') return 'advisor-mission--critical';
  if (s === 'warn') return 'advisor-mission--warn';
  if (s === 'good') return 'advisor-mission--good';
  return 'advisor-mission--info';
}

function HealthRing({ score, label }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="advisor-ring" aria-label={`Health score ${score}, ${label}`}>
      <svg viewBox="0 0 120 120" className="advisor-ring-svg">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          className="advisor-ring-progress"
        />
      </svg>
      <div className="advisor-ring-center">
        <span className="advisor-ring-score">{score}</span>
        <span className="advisor-ring-label">{label}</span>
      </div>
    </div>
  );
}

function Sparkline({ trend }) {
  if (!trend?.length) return null;
  const max = Math.max(...trend.map((d) => d.count), 1);
  const w = 120;
  const h = 36;
  const points = trend
    .map((d, i) => {
      const x = (i / (trend.length - 1 || 1)) * w;
      const y = h - (d.count / max) * (h - 4);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="advisor-spark" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function EnterpriseAIAdvisor({ data = {}, followUps = [], employees = [] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const state = useMemo(
    () => buildAdvisorState({ data, followUps, employees }),
    [data, followUps, employees]
  );

  const [activeMissionId, setActiveMissionId] = useState(() => state.missions[0]?.id);
  const [completedSteps, setCompletedSteps] = useState(loadCompleted);
  const [simOpen, setSimOpen] = useState(false);

  useEffect(() => {
    if (!state.missions.some((m) => m.id === activeMissionId)) {
      setActiveMissionId(state.missions[0]?.id);
    }
  }, [state.missions, activeMissionId]);

  const activeMission =
    state.missions.find((m) => m.id === activeMissionId) || state.missions[0];

  const toggleStep = useCallback((missionId, stepId) => {
    setCompletedSteps((prev) => {
      const key = `${missionId}:${stepId}`;
      const next = { ...prev, [key]: !prev[key] };
      saveCompleted(next);
      return next;
    });
  }, []);

  const runStep = useCallback(
    async (step) => {
      if (step.action === 'navigate' && step.to) {
        navigate(step.to);
        return;
      }
      if (step.action === 'copy' && step.text) {
        try {
          await navigator.clipboard.writeText(step.text);
          toast.success('Copied to clipboard');
        } catch {
          toast.error('Could not copy');
        }
        return;
      }
      if (step.action === 'hint') {
        toast.success(step.text);
      }
    },
    [navigate, toast]
  );

  const exportDiagnostic = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state.diagnosticExport, null, 2));
      toast.success('Diagnostic JSON copied');
    } catch {
      toast.error('Export failed');
    }
  };

  const runAllNavigateSteps = () => {
    const nav = activeMission?.steps?.find((s) => s.action === 'navigate');
    if (nav?.to) navigate(nav.to);
    else toast.error('No navigation step for this mission');
  };

  return (
    <section className="advisor" aria-label="Enterprise command advisor">
      <header className="advisor-head">
        <div>
          <p className="advisor-kicker">Enterprise · Command layer</p>
          <h2 className="advisor-title">Pipeline command center</h2>
          <p className="advisor-sub">
            Live signals from your workspace — every tile and mission runs a real action in the CRM.
          </p>
        </div>
        <button type="button" className="advisor-export-btn" onClick={exportDiagnostic}>
          Export diagnostic
        </button>
      </header>

      <div className="advisor-pulse-row">
        <div className="advisor-health">
          <HealthRing score={state.healthScore} label={state.healthLabel} />
          <p className="advisor-health-help">
            <strong>Health {state.healthScore}/100</strong> — pipeline fitness score
            (follow-ups, conversion, and call outcomes). Not lead count.
            {state.healthLabel === 'Watch' && ' Needs attention this week.'}
            {state.healthLabel === 'Critical' && ' Fix overdue work first.'}
            {state.healthLabel === 'Stable' && ' Floor is in good shape.'}
          </p>
        </div>
        <div className="advisor-pulse-meta">
          <div className="advisor-pulse-top">
            <span className="advisor-pulse-title">7-day intake pulse</span>
            <span className="advisor-pulse-total">{state.trendTotal} leads</span>
          </div>
          <Sparkline trend={state.trend} />
          {state.projectedLift > 0 && (
            <button
              type="button"
              className="advisor-sim-btn"
              onClick={() => setSimOpen((o) => !o)}
            >
              {simOpen ? 'Hide' : 'Show'} recovery simulator
            </button>
          )}
          {simOpen && state.projectedLift > 0 && (
            <div className="advisor-sim-panel">
              <p>
                If you clear <strong>{state.missedFollowUps.length}</strong> overdue follow-ups and
                re-engage top NEW leads, model estimates up to{' '}
                <strong>+{state.projectedLift}%</strong> conversion lift over the next cycle.
              </p>
              <button
                type="button"
                className="advisor-sim-go"
                onClick={() => navigate('/follow-ups?type=missed')}
              >
                Start recovery queue →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="advisor-signals" role="list">
        {state.signals.map((sig) => (
          <button
            key={sig.id}
            type="button"
            role="listitem"
            className={`advisor-signal advisor-signal--${sig.tone} ${sig.action ? 'advisor-signal--click' : ''}`}
            disabled={!sig.action}
            onClick={() => sig.action && navigate(sig.action)}
          >
            <span className="advisor-signal-label">{sig.label}</span>
            <span className="advisor-signal-value">
              {sig.value}
              {sig.unit && <small>{sig.unit}</small>}
            </span>
          </button>
        ))}
      </div>

      <div className="advisor-missions-head">
        <h3 className="advisor-missions-title">Active missions</h3>
        <p className="advisor-missions-sub">Select a mission — steps below execute inside your CRM</p>
      </div>

      <div className="advisor-mission-tabs" role="tablist">
        {state.missions.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={activeMission?.id === m.id}
            className={`advisor-mission-tab ${severityClass(m.severity)} ${
              activeMission?.id === m.id ? 'advisor-mission-tab--on' : ''
            }`}
            onClick={() => setActiveMissionId(m.id)}
          >
            <span className="advisor-mission-tab-title">{m.title}</span>
          </button>
        ))}
      </div>

      {activeMission && (
        <div className={`advisor-console ${severityClass(activeMission.severity)}`}>
          <div className="advisor-console-main">
            <p className="advisor-console-summary">{activeMission.summary}</p>
            <p className="advisor-console-impact">{activeMission.impact}</p>

            <ol className="advisor-steps">
              {activeMission.steps.map((step) => {
                const done = completedSteps[`${activeMission.id}:${step.id}`];
                return (
                  <li key={step.id} className={done ? 'advisor-step--done' : ''}>
                    <label className="advisor-step-check">
                      <input
                        type="checkbox"
                        checked={!!done}
                        onChange={() => toggleStep(activeMission.id, step.id)}
                      />
                      <span>{step.label}</span>
                    </label>
                    <button
                      type="button"
                      className="advisor-step-run"
                      onClick={() => runStep(step)}
                    >
                      {step.action === 'navigate' ? 'Go' : step.action === 'copy' ? 'Copy' : 'Tip'}
                    </button>
                  </li>
                );
              })}
            </ol>

            <button type="button" className="advisor-console-primary" onClick={runAllNavigateSteps}>
              Run primary action
            </button>
          </div>

          {activeMission.preview?.length > 0 && (
            <aside className="advisor-queue">
              <p className="advisor-queue-title">Overdue queue (tap to open)</p>
              <ul>
                {activeMission.preview.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="advisor-queue-item" onClick={() => navigate(item.to)}>
                      <span className="advisor-queue-name">{item.label}</span>
                      <span className="advisor-queue-sub">{item.sub}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      )}
    </section>
  );
}
