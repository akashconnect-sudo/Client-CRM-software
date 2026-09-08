import { useNavigate } from 'react-router-dom';

export default function DashboardActionDock({ data, isAdmin, hasLeads = true, hasIvr = false }) {
  const navigate = useNavigate();

  const actions = [
    ...(hasLeads
      ? [
          {
            id: 'leads',
            title: 'Leads',
            desc: 'Full pipeline with filters',
            stat: data?.totalLeads ?? 0,
            statLabel: 'total',
            to: '/leads',
            accent: 'blue',
            primary: true,
          },
          {
            id: 'followups',
            title: 'Follow-ups',
            desc: 'Due touchpoints today',
            stat: data?.todayFollowUps ?? 0,
            statLabel: 'due today',
            to: '/follow-ups?type=today',
            accent: 'amber',
          },
        ]
      : []),
    ...(hasIvr && isAdmin
      ? [
          {
            id: 'calls',
            title: 'Calls',
            desc: 'IVR history & recordings',
            stat: data?.totalCalls ?? 0,
            statLabel: 'calls',
            to: '/calls',
            accent: 'violet',
            primary: !hasLeads,
          },
        ]
      : []),
    ...(isAdmin && hasLeads
      ? [
          {
            id: 'reports',
            title: 'Reports',
            desc: 'Campaigns & conversions',
            stat:
              data?.conversionRate != null
                ? `${Number(data.conversionRate).toFixed(1)}%`
                : '—',
            statLabel: 'conversion',
            to: '/reports',
            accent: 'violet',
          },
        ]
      : []),
  ];

  if (!actions.length) return null;

  return (
    <nav className="dock" aria-label="Quick links">
      <p className="dock-label">Quick links</p>
      <div className={`dock-grid dock-grid--${actions.length}`}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`dock-card dock-card--${action.accent} ${action.primary ? 'dock-card--primary' : ''}`}
            onClick={() => navigate(action.to)}
          >
            <span className="dock-card-stat">
              {action.stat}
              <small>{action.statLabel}</small>
            </span>
            <span className="dock-card-body">
              <span className="dock-card-title">{action.title}</span>
              <span className="dock-card-desc">{action.desc}</span>
            </span>
            <span className="dock-card-arrow" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
