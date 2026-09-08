/**
 * Shared Recharts tooltip / hover styles that stay readable in dark + light themes.
 */
export function getChartTooltipProps(isDark = true) {
  const text = isDark ? '#f5f5f4' : '#1c1917';
  const muted = isDark ? '#d6d3d1' : '#57534e';
  const bg = isDark ? '#14161a' : '#ffffff';
  const border = isDark ? 'rgba(201, 162, 39, 0.35)' : 'rgba(28, 25, 23, 0.12)';

  return {
    contentStyle: {
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 12,
      color: text,
      fontSize: 13,
      boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
      padding: '10px 12px',
    },
    labelStyle: {
      color: text,
      fontWeight: 650,
      marginBottom: 4,
    },
    itemStyle: {
      color: muted,
      fontWeight: 500,
    },
    wrapperStyle: { outline: 'none', zIndex: 40 },
    cursor: { fill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' },
  };
}

/** Soft hover fill for bar/area charts (avoids bright white blocks). */
export function getChartHoverCursor(isDark = true) {
  return { fill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' };
}
