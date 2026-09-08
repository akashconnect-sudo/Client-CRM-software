import { computeLeadPulse } from '../../utils/leadPulseScore';

export default function LeadPulseBadge({ lead, compact = false }) {
  const pulse = computeLeadPulse(lead);
  const reasoning = lead?.pulseReasoning?.trim();
  const title = reasoning
    ? `Pulse ${pulse.score} — ${pulse.label}. ${reasoning}`
    : `Pulse ${pulse.score} — ${pulse.label}`;

  if (compact) {
    return (
      <span
        className="lead-pulse-badge lead-pulse-badge--compact"
        style={{ '--pulse-color': pulse.color }}
        title={title}
      >
        {pulse.score}
      </span>
    );
  }
  return (
    <div className="lead-pulse-badge" style={{ '--pulse-color': pulse.color }} title={title}>
      <span className="lead-pulse-badge__score">{pulse.score}</span>
      <span className="lead-pulse-badge__label">{pulse.label}</span>
      {reasoning && <span className="lead-pulse-badge__why">{reasoning}</span>}
    </div>
  );
}
