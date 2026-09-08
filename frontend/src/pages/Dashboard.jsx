import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { reportsApi, followUpsApi, employeesApi } from '../api';
import { useAuth } from '../context/AuthContext';
import EnterpriseAIAdvisor from '../components/EnterpriseAIAdvisor';
import DashboardActionDock from '../components/DashboardActionDock';
import StatCard from '../components/StatCard';
import EmployeePerformanceChart from '../components/EmployeePerformanceChart';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { SOURCE_LABELS, STATUS_LABELS, STATUS_CHART_COLORS } from '../utils/constants';
import { userCanAccessLeads, userCanAccessIVR, userCanAccessAI } from '../utils/planAccess';
import AiAdvisorChat from '../components/AiAdvisorChat';
import { getChartTooltipProps, getChartHoverCursor } from '../utils/chartTheme';

const SOURCE_COLORS = ['#c9a227', '#3b82f6', '#10b981', '#8b5cf6'];
const CALL_COLORS = ['#22c55e', '#ef4444', '#64748b'];

function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`dash-panel ${className}`}>
      <div className="dash-panel__head">
        <div>
          <h2 className="dash-panel__title">{title}</h2>
          {subtitle && <p className="dash-panel__sub">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="dash-panel__body">{children}</div>
    </div>
  );
}

function PipelineBars({ rows, total, onOpen }) {
  if (!rows.length) {
    return <p className="dash-empty">No pipeline data yet</p>;
  }
  return (
    <ul className="dash-funnel">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
        return (
          <li key={row.status}>
            <button type="button" className="dash-funnel__row" onClick={() => onOpen(row.status)}>
              <div className="dash-funnel__meta">
                <span>{row.name}</span>
                <strong>
                  {row.value}
                  <em>{pct}%</em>
                </strong>
              </div>
              <div className="dash-funnel__track" aria-hidden="true">
                <span style={{ width: `${Math.max(pct, 3)}%`, background: row.fill }} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const hasLeads = userCanAccessLeads(user);
  const hasIvr = userCanAccessIVR(user);
  const canAI = userCanAccessAI(user);
  const showEnterpriseAdvisor = isAdmin && (canAI || (user?.plan === 'ENTERPRISE' && hasLeads));
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const chartTick = isDark ? '#94a3b8' : '#64748b';
  const gridStroke = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.2)';
  const tip = getChartTooltipProps(isDark);
  const hoverCursor = getChartHoverCursor(isDark);
  const [data, setData] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ soft = false } = {}) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const requests = [reportsApi.dashboard()];
      if (showEnterpriseAdvisor) {
        requests.push(followUpsApi.list(), employeesApi.list());
      }
      const [dashboardRes, followUpsRes, employeesRes] = await Promise.all(requests);
      setData(dashboardRes.data.data);
      if (showEnterpriseAdvisor) {
        setFollowUps(followUpsRes?.data?.data || []);
        setEmployees(employeesRes?.data?.data || []);
      }
    } catch {
      setError('Could not load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEnterpriseAdvisor]);

  const intake7d = useMemo(
    () => (data?.leadsLast7Days || []).reduce((s, d) => s + (d.count || 0), 0),
    [data]
  );

  if (loading) return <LoadingSpinner className="min-h-[50vh]" />;
  if (error) {
    return (
      <div className="page-enter dash">
        <div className="alert-error">{error}</div>
        <button type="button" className="btn-secondary mt-4" onClick={() => load()}>
          Retry
        </button>
      </div>
    );
  }
  if (!data) return null;

  const sourceData = (data.sourceBreakdown || []).map((s) => ({
    name: SOURCE_LABELS[s.source] || s.source,
    value: s.count,
    source: s.source,
  }));

  const statusData = (data.statusBreakdown || [])
    .map((s) => ({
      name: STATUS_LABELS[s.status] || s.status,
      value: s.count,
      status: s.status,
      fill: STATUS_CHART_COLORS[s.status] || '#64748b',
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const statusTotal = statusData.reduce((s, r) => s + r.value, 0);
  const trendData = data.leadsLast7Days || [];
  const callData = (data.callBreakdown || []).filter((c) => c.value > 0);
  const answered = data.answeredCalls ?? 0;
  const missed = data.missedCalls ?? 0;
  const totalCalls = data.totalCalls ?? answered + missed;
  const connectRate = totalCalls > 0 ? Math.round((answered / totalCalls) * 100) : 0;

  const primaryStats = hasLeads
    ? isAdmin
      ? [
          { title: 'Total leads', value: data.totalLeads, color: 'gold', to: '/leads', hint: 'Open pipeline' },
          { title: 'New', value: data.newLeads, color: 'slate', to: '/leads?status=NEW' },
          { title: 'Converted', value: data.convertedLeads, color: 'green', to: '/leads?status=CONVERTED' },
          { title: 'Conversion', value: `${data.conversionRate}%`, color: 'green', to: '/reports?tab=conversions' },
        ]
      : [
          { title: 'My leads', value: data.myAssignedLeads ?? data.totalLeads, color: 'gold', to: '/leads' },
          { title: 'New', value: data.newLeads, color: 'slate', to: '/leads?status=NEW' },
          { title: 'Converted', value: data.convertedLeads, color: 'green', to: '/leads?status=CONVERTED' },
          { title: 'Pending', value: data.myPendingLeads, color: 'amber', to: '/leads?status=ASSIGNED' },
        ]
    : [
        { title: 'Total calls', value: totalCalls, color: 'gold', to: '/calls', hint: 'Call history' },
        { title: 'Connected', value: answered, color: 'green', to: '/calls?callStatus=ANSWERED' },
        { title: 'Missed', value: missed, color: 'red', to: '/calls?callStatus=MISSED' },
        { title: 'Connect rate', value: `${connectRate}%`, color: 'green', to: '/calls' },
      ];

  const openActions = [
    ...(hasLeads
      ? [
          {
            id: 'followups',
            label: 'Follow-ups due',
            value: data.todayFollowUps ?? 0,
            hint: 'Today',
            to: '/follow-ups?type=today',
            tone: 'amber',
          },
          {
            id: 'new',
            label: 'New leads',
            value: data.newLeads ?? 0,
            hint: 'Needs owners',
            to: '/leads?status=NEW',
            tone: 'blue',
          },
        ]
      : []),
    ...(hasIvr && isAdmin
      ? [
          {
            id: 'missed',
            label: 'Missed calls',
            value: missed,
            hint: 'Call Bridge',
            to: '/calls?callStatus=MISSED',
            tone: 'rose',
          },
          ...(!hasLeads
            ? [
                {
                  id: 'answered',
                  label: 'Connected calls',
                  value: answered,
                  hint: 'Answered',
                  to: '/calls?callStatus=ANSWERED',
                  tone: 'green',
                },
                {
                  id: 'settings-ivr',
                  label: 'IVR setup',
                  value: '→',
                  hint: 'Connect provider',
                  to: '/settings',
                  tone: 'blue',
                },
              ]
            : []),
        ]
      : []),
    ...(!hasLeads && !hasIvr
      ? [
          {
            id: 'settings',
            label: 'Settings',
            value: '→',
            hint: 'Choose modules',
            to: '/settings',
            tone: 'blue',
          },
        ]
      : []),
  ];

  const moduleLabel = hasLeads && hasIvr ? 'Leads + IVR' : hasIvr ? 'IVR calling' : 'Lead pipeline';

  return (
    <div className="page-enter dash">
      <header className="dash-top">
        <div className="dash-top__copy">
          <p className="dash-top__eyebrow">{user?.companyName || 'Workspace'}</p>
          <h1>Dashboard</h1>
          <p className="dash-top__sub">
            {hasLeads && hasIvr
              ? isAdmin
                ? 'Leads, calls, and follow-ups for your floor — live overview.'
                : 'Your assigned pipeline and today’s follow-ups.'
              : hasIvr
                ? 'IVR call desk — manage calls, recordings, and connection status.'
                : isAdmin
                  ? 'Lead pipeline and follow-ups for your floor.'
                  : 'Your assigned leads and today’s follow-ups.'}
          </p>
          <p className="dash-top__modules">Active: {moduleLabel}</p>
        </div>
        <div className="dash-top__tools">
          <span className="dash-chip dash-chip--on">Live</span>
          <span className="dash-chip">Last 7 days</span>
          <button
            type="button"
            className="dash-refresh"
            onClick={() => load({ soft: true })}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            title="Refresh"
          >
            {refreshing ? '…' : '↻'}
          </button>
          <Link
            to={hasLeads ? '/leads' : '/calls'}
            className="btn-primary text-sm px-3 py-2 no-underline"
          >
            {hasLeads ? 'Open leads' : 'Open calls'}
          </Link>
        </div>
      </header>

      {openActions.length > 0 && (
      <section className="dash-actions" aria-label="Open work">
        <div className="dash-actions__head">
          <h2>Open work</h2>
          <p>What needs attention right now</p>
        </div>
        <div className="dash-actions__grid">
          {openActions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`dash-action dash-action--${item.tone}`}
              onClick={() => navigate(item.to)}
            >
              <span className="dash-action__value">{item.value}</span>
              <span className="dash-action__label">{item.label}</span>
              <span className="dash-action__hint">{item.hint}</span>
            </button>
          ))}
        </div>
      </section>
      )}

      <section className="dash-kpi" aria-label="Key metrics">
        {primaryStats.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      <section className="dash-grid">
        {isAdmin && hasIvr && (
          <ChartCard
            title="Call desk"
            subtitle={hasLeads ? 'Outbound outcomes on the lead timeline' : 'IVR call outcomes for your workspace'}
            action={
              <button type="button" className="dash-link" onClick={() => navigate('/calls')}>
                Call history →
              </button>
            }
          >
            <div className="dash-call">
              <div className="dash-call__stat dash-call__stat--ok">
                <span>Connected</span>
                <strong>{answered}</strong>
                <small>{connectRate}%</small>
              </div>
              <div className="dash-call__stat dash-call__stat--miss">
                <span>Missed</span>
                <strong>{missed}</strong>
                <small>{totalCalls ? 100 - connectRate : 0}%</small>
              </div>
              <div className="dash-call__stat">
                <span>Total calls</span>
                <strong>{totalCalls}</strong>
                <small>all time in view</small>
              </div>
            </div>
            {callData.length > 0 && (
              <div className="dashboard-chart-h dashboard-chart-h--pie mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={callData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%">
                      {callData.map((_, i) => (
                        <Cell key={i} fill={CALL_COLORS[i % CALL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tip.contentStyle} labelStyle={tip.labelStyle} itemStyle={tip.itemStyle} wrapperStyle={tip.wrapperStyle} cursor={hoverCursor} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        )}

        {hasLeads && (
        <ChartCard
          title="Pipeline"
          subtitle={`${statusTotal} leads in stages`}
          className={isAdmin && hasIvr ? '' : 'dash-panel--span'}
          action={
            <button type="button" className="dash-link" onClick={() => navigate('/leads')}>
              Lead list →
            </button>
          }
        >
          <PipelineBars
            rows={statusData}
            total={statusTotal || data.totalLeads || 1}
            onOpen={(status) => navigate(`/leads?status=${status}`)}
          />
        </ChartCard>
        )}

        {hasLeads && (
        <ChartCard title="Intake" subtitle={`${intake7d} new leads in 7 days`} className="dash-panel--span">
          {trendData.length > 0 ? (
            <div className="dashboard-chart-h">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTick }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartTick }} width={32} />
                  <Tooltip contentStyle={tip.contentStyle} labelStyle={tip.labelStyle} itemStyle={tip.itemStyle} wrapperStyle={tip.wrapperStyle} cursor={hoverCursor} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Leads"
                    stroke="#c9a227"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#c9a227' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="dash-empty">No intake in the last 7 days</p>
          )}
        </ChartCard>
        )}

        {hasLeads && sourceData.length > 0 && (
          <ChartCard title="Lead sources" subtitle="Tap a slice to filter">
            <div className="dashboard-chart-h dashboard-chart-h--pie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="42%"
                    outerRadius="70%"
                    paddingAngle={2}
                    onClick={(_, index) => {
                      const slice = sourceData[index];
                      if (slice?.source) navigate(`/leads?source=${slice.source}`);
                    }}
                  >
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} className="cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tip.contentStyle} labelStyle={tip.labelStyle} itemStyle={tip.itemStyle} wrapperStyle={tip.wrapperStyle} cursor={hoverCursor} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {hasLeads && statusData.length > 0 && (
          <ChartCard title="Status mix" subtitle="Tap a bar to open that stage">
            <div className="dashboard-chart-h dashboard-chart-h--scroll">
              <ResponsiveContainer width="100%" height="100%" minWidth={Math.max(280, statusData.length * 56)}>
                <BarChart data={statusData} margin={{ top: 8, right: 8, left: -12, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: chartTick }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartTick }} width={28} />
                  <Tooltip contentStyle={tip.contentStyle} labelStyle={tip.labelStyle} itemStyle={tip.itemStyle} wrapperStyle={tip.wrapperStyle} cursor={hoverCursor} />
                  <Bar
                    dataKey="value"
                    name="Leads"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(barData) => {
                      const row = barData?.payload;
                      if (row?.status) navigate(`/leads?status=${row.status}`);
                    }}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {hasLeads && isAdmin && data.employeePerformance?.length > 0 && (
          <div className="dash-panel--span">
            <EmployeePerformanceChart
              data={data.employeePerformance}
              chartTick={chartTick}
              tooltipStyle={tip}
              isDark={isDark}
            />
          </div>
        )}

        {hasLeads && isAdmin && (
          <div className="dash-panel--span dash-split">
            <Link to="/reports?tab=campaigns" className="dash-panel dash-panel--link no-underline">
              <h2 className="dash-panel__title">Ad campaigns</h2>
              <p className="dash-panel__sub mb-3">Google Ads & Meta intake</p>
              {data.campaignBreakdown?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="table-head">
                        <th className="text-left py-2">Campaign</th>
                        <th className="text-right py-2">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.campaignBreakdown.map((c) => (
                        <tr key={c.campaign} className="table-row table-row-hover">
                          <td className="text-main py-2 pr-2 truncate max-w-[140px]">{c.campaign}</td>
                          <td className="font-semibold text-main text-right py-2">{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="dash-empty">No campaign leads yet</p>
              )}
            </Link>

            <Link to="/leads?source=MANUAL" className="dash-panel dash-panel--link no-underline">
              <h2 className="dash-panel__title">Manual / import</h2>
              <p className="dash-panel__sub mb-3">Not from ads</p>
              <p className="dash-big-num">{data.nonCampaignLeadsCount ?? 0}</p>
              <p className="text-xs text-muted text-center mt-2">View these leads →</p>
            </Link>
          </div>
        )}
      </section>

      {showEnterpriseAdvisor && (
        <EnterpriseAIAdvisor data={data} followUps={followUps} employees={employees} />
      )}

      {isAdmin && canAI && <AiAdvisorChat />}

      <DashboardActionDock data={data} isAdmin={isAdmin} hasLeads={hasLeads} hasIvr={hasIvr} />
    </div>
  );
}
