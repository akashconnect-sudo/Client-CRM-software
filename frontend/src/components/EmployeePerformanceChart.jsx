import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getChartHoverCursor } from '../utils/chartTheme';

export default function EmployeePerformanceChart({ data, chartTick, tooltipStyle, isDark = true }) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(null);
  const tip = tooltipStyle?.contentStyle
    ? tooltipStyle
    : {
        contentStyle: tooltipStyle,
        labelStyle: { color: isDark ? '#f5f5f4' : '#1c1917', fontWeight: 650 },
        itemStyle: { color: isDark ? '#d6d3d1' : '#57534e' },
        wrapperStyle: { outline: 'none', zIndex: 40 },
      };
  const hoverCursor = getChartHoverCursor(isDark);

  const onBarClick = (barData) => {
    const row = barData?.payload;
    if (!row?.id) return;
    navigate(`/employees/${row.id}/performance`);
  };

  return (
    <div className="dashboard-chart-card card">
      <div className="dashboard-chart-head">
        <h2 className="dashboard-chart-title">Employee performance</h2>
        <p className="dashboard-chart-sub">Tap blue bar (Leads) for details</p>
      </div>
      <div className="w-full overflow-x-auto -webkit-overflow-scrolling-touch">
        <div
          className="dashboard-chart-h"
          style={{ minWidth: Math.max(280, data.length * 72), height: '240px' }}
        >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: chartTick }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fill: chartTick, fontSize: 11 }} />
            <Tooltip
              contentStyle={tip.contentStyle}
              labelStyle={tip.labelStyle}
              itemStyle={tip.itemStyle}
              wrapperStyle={tip.wrapperStyle}
              cursor={hoverCursor}
            />
            <Bar
              dataKey="leads"
              name="Leads"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={onBarClick}
            >
              {data.map((row) => (
                <Cell
                  key={row.id}
                  fill={activeId === row.id ? '#2563eb' : '#3b82f6'}
                  onMouseEnter={() => setActiveId(row.id)}
                  onMouseLeave={() => setActiveId(null)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
