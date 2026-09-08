function formatLabel(value) {
  return value?.replace(/_/g, ' ') || 'Unknown';
}

function shortDate(value) {
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function buildAdvisorState({ data = {}, followUps = [], employees = [] }) {
  const now = new Date();
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const pendingFollowUps = followUps.filter(
    (f) => !f.isCompleted && new Date(f.scheduledAt) >= now
  );
  const missedFollowUps = followUps.filter(
    (f) => !f.isCompleted && new Date(f.scheduledAt) < now
  );
  const overdueList = missedFollowUps.slice(0, 8);

  const conversionRate = Number(data.conversionRate || 0);
  const answeredCalls = Number(data.answeredCalls || 0);
  const missedCalls = Number(data.missedCalls || 0);
  const totalLeads = Number(data.totalLeads || 0);
  const newLeads = Number(data.newLeads || 0);

  const sourceBreakdown = [...(data.sourceBreakdown || [])].sort((a, b) => b.count - a.count);
  const topSource = sourceBreakdown[0];

  const trend = data.leadsLast7Days || [];
  const trendTotal = trend.reduce((s, d) => s + (d.count || 0), 0);

  let healthScore = 72;
  healthScore -= Math.min(30, missedFollowUps.length * 4);
  healthScore -= conversionRate < 20 ? 18 : conversionRate < 35 ? 10 : 0;
  healthScore -= missedCalls > answeredCalls ? 12 : 0;
  healthScore -= newLeads > 20 && conversionRate < 15 ? 8 : 0;
  healthScore += pendingFollowUps.length > 0 && missedFollowUps.length === 0 ? 6 : 0;
  healthScore = Math.max(8, Math.min(98, Math.round(healthScore)));

  const healthLabel =
    healthScore >= 75 ? 'Stable' : healthScore >= 50 ? 'Watch' : 'Critical';

  const perf = data.employeePerformance || [];
  const busiest = [...perf].sort((a, b) => (b.leads || 0) - (a.leads || 0))[0];
  const idlest = [...perf].sort((a, b) => (a.leads || 0) - (b.leads || 0))[0];

  const missions = [];

  if (missedFollowUps.length > 0) {
    missions.push({
      id: 'recover-followups',
      severity: 'critical',
      title: 'Recover overdue follow-ups',
      summary: `${missedFollowUps.length} scheduled touchpoint${missedFollowUps.length > 1 ? 's' : ''} slipped past due.`,
      impact: `Clearing these could lift pipeline velocity within 48h.`,
      steps: [
        { id: 's1', label: 'Open missed queue', action: 'navigate', to: '/follow-ups?type=missed' },
        {
          id: 's2',
          label: 'Copy recovery opener',
          action: 'copy',
          text: 'Hi — we had a follow-up scheduled and I wanted to reconnect before the opportunity goes cold. Do you have 2 minutes today?',
        },
        { id: 's3', label: 'Mark first item done after call', action: 'hint', text: 'Use Complete on each row in Follow-ups.' },
      ],
      preview: overdueList.map((f) => ({
        id: f.id,
        label: f.lead?.customerName || 'Lead',
        sub: shortDate(f.scheduledAt),
        to: f.lead?.id ? `/leads/${f.lead.id}` : '/follow-ups?type=missed',
      })),
    });
  }

  if (conversionRate < 35 && totalLeads > 0) {
    missions.push({
      id: 'lift-conversion',
      severity: 'warn',
      title: 'Lift conversion rate',
      summary: `Pipeline converts at ${conversionRate.toFixed(1)}% — below the 35% target.`,
      impact: `Focus on ${newLeads} new lead${newLeads !== 1 ? 's' : ''} before they age.`,
      steps: [
        { id: 's1', label: 'Review hot NEW leads', action: 'navigate', to: '/leads?status=NEW' },
        { id: 's2', label: 'Open conversion report', action: 'navigate', to: '/reports?tab=conversions' },
        {
          id: 's3',
          label: 'Copy 24h chase script',
          action: 'copy',
          text: 'Quick check-in: saw your enquiry — want me to share options and next steps in one short call?',
        },
      ],
      preview: [],
    });
  }

  if (missedCalls > answeredCalls && missedCalls > 0) {
    missions.push({
      id: 'fix-calls',
      severity: 'warn',
      title: 'Rebalance call outcomes',
      summary: `Missed (${missedCalls}) exceed answered (${answeredCalls}) on recent activity.`,
      impact: 'Callback discipline usually recovers 15–20% of stalled deals.',
      steps: [
        { id: 's1', label: 'Audit missed calls', action: 'navigate', to: '/calls?callStatus=MISSED' },
        { id: 's2', label: 'View answered for comparison', action: 'navigate', to: '/calls?callStatus=ANSWERED' },
      ],
      preview: [],
    });
  }

  if (topSource?.source) {
    missions.push({
      id: 'scale-source',
      severity: 'info',
      title: `Scale ${formatLabel(topSource.source)}`,
      summary: `${formatLabel(topSource.source)} leads with ${topSource.count} intake — top channel now.`,
      impact: 'Double down on what is already working before testing new channels.',
      steps: [
        {
          id: 's1',
          label: `Filter ${formatLabel(topSource.source)} leads`,
          action: 'navigate',
          to: `/leads?source=${topSource.source}`,
        },
        { id: 's2', label: 'Campaign report', action: 'navigate', to: '/reports?tab=campaigns' },
      ],
      preview: [],
    });
  }

  if (busiest && idlest && busiest.id !== idlest.id && (busiest.leads || 0) - (idlest.leads || 0) >= 5) {
    missions.push({
      id: 'balance-team',
      severity: 'info',
      title: 'Balance rep load',
      summary: `${busiest.name} carries ${busiest.leads} leads vs ${idlest.name} at ${idlest.leads}.`,
      impact: 'Even distribution reduces missed touches on high-volume reps.',
      steps: [
        { id: 's1', label: `Review ${busiest.name}`, action: 'navigate', to: `/employees/${busiest.id}/performance` },
        { id: 's2', label: 'Open team roster', action: 'navigate', to: '/employees' },
        { id: 's3', label: 'Unassigned leads', action: 'navigate', to: '/leads?status=NEW' },
      ],
      preview: [],
    });
  }

  if (!missions.length) {
    missions.push({
      id: 'maintain',
      severity: 'good',
      title: 'Pipeline is healthy',
      summary: 'No critical friction detected in follow-ups, calls, or conversion.',
      impact: 'Maintain cadence — small dips are easier to fix early.',
      steps: [
        { id: 's1', label: 'Full analytics', action: 'navigate', to: '/reports' },
        { id: 's2', label: 'Today’s follow-ups', action: 'navigate', to: '/follow-ups?type=today' },
      ],
      preview: [],
    });
  }

  const signals = [
    {
      id: 'health',
      label: 'Pipeline health',
      value: `${healthScore}`,
      unit: `/100 · ${healthLabel}`,
      tone: healthScore >= 75 ? 'good' : healthScore >= 50 ? 'warn' : 'bad',
      action: null,
    },
    {
      id: 'missed',
      label: 'Missed follow-ups',
      value: String(missedFollowUps.length),
      tone: missedFollowUps.length ? 'bad' : 'good',
      action: missedFollowUps.length ? '/follow-ups?type=missed' : null,
    },
    {
      id: 'pending',
      label: 'Upcoming',
      value: String(pendingFollowUps.length),
      tone: 'neutral',
      action: '/follow-ups?type=pending',
    },
    {
      id: 'conversion',
      label: 'Conversion',
      value: `${conversionRate.toFixed(1)}%`,
      tone: conversionRate >= 35 ? 'good' : 'warn',
      action: '/reports?tab=conversions',
    },
    {
      id: 'intake',
      label: '7d intake',
      value: String(trendTotal),
      tone: trendTotal > 0 ? 'good' : 'neutral',
      action: '/leads',
    },
  ];

  const diagnosticExport = {
    generatedAt: new Date().toISOString(),
    healthScore,
    healthLabel,
    conversionRate,
    missedFollowUps: missedFollowUps.length,
    pendingFollowUps: pendingFollowUps.length,
    missions: missions.map((m) => ({ id: m.id, title: m.title, severity: m.severity })),
  };

  return {
    healthScore,
    healthLabel,
    signals,
    missions,
    trend,
    trendTotal,
    activeEmployees: activeEmployees.length,
    missedFollowUps,
    pendingFollowUps,
    conversionRate,
    diagnosticExport,
    projectedLift:
      missedFollowUps.length > 0
        ? Math.min(12, 2 + missedFollowUps.length)
        : conversionRate < 35
          ? 5
          : 0,
  };
}
