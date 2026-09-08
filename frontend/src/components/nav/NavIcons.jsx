/** Colored sidebar glyphs — Runo-style favicons, sized for crm-nav-ico */

function Svg({ children, color = 'currentColor' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color }}>
      {children}
    </svg>
  );
}

export const NavIcons = {
  dashboard: (
    <Svg color="#ea580c">
      <path d="M4 4h7v7H4V4zm9 0h7v5h-7V4zM4 13h7v7H4v-7zm9 3h7v4h-7v-4z" stroke="currentColor" strokeWidth="1.8" />
    </Svg>
  ),
  allocations: (
    <Svg color="#d97706">
      <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="18" cy="16" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 5h16v14H4V5z" stroke="currentColor" strokeWidth="1.6" />
    </Svg>
  ),
  customers: (
    <Svg color="#2563eb">
      <path d="M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M13 20a5 5 0 0 1 7.5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  ),
  interactions: (
    <Svg color="#16a34a">
      <path d="M6 5h9a2 2 0 0 1 2 2v7H8l-4 3V7a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 14v2a2 2 0 0 0 2 2h2l3 2v-6h-7z" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  ),
  gmail: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M3 6.75v10.5A2.25 2.25 0 0 0 5.25 19.5H7.5V9.15L12 12.6l4.5-3.45V19.5h2.25A2.25 2.25 0 0 0 21 17.25V6.75c0-.4-.21-.76-.55-.96L12 11.1 3.55 5.79A1.13 1.13 0 0 0 3 6.75z" />
      <path fill="#34A853" d="M16.5 9.15V19.5H18.75A2.25 2.25 0 0 0 21 17.25V8.1l-4.5 1.05z" />
      <path fill="#4285F4" d="M3 8.1v9.15A2.25 2.25 0 0 0 5.25 19.5H7.5V9.15L3 8.1z" />
      <path fill="#FBBC05" d="M3 6.75c0-.4.21-.76.55-.96L12 11.1V12.6L3.55 5.79A1.13 1.13 0 0 0 3 6.75z" />
      <path fill="#C5221F" d="M21 6.75c0-.4-.21-.76-.55-.96L12 11.1V12.6l8.45-6.81c.34.2.55.56.55.96z" />
    </svg>
  ),
  followups: (
    <Svg color="#ea580c">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  ),
  calendar: (
    <Svg color="#2563eb">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3v4M16 3v4M3.5 10h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  ),
  calls: (
    <Svg color="#2563eb">
      <path d="M6.5 4h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 13.5l4 1.5v3A2 2 0 0 1 18 20 14 14 0 0 1 4 6a2 2 0 0 1 2.5-2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </Svg>
  ),
  recurring: (
    <Svg color="#ea580c">
      <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15.5 16.5a3 3 0 1 0-2.2 2.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.2 14.8v2.2h2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  ),
  reports: (
    <Svg color="#ca8a04">
      <path d="M7 4h8l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15 4v5h5M8 13h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  ),
  rechurn: (
    <Svg color="#ea580c">
      <path d="M7 8a5 5 0 1 1-1.2 6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 5.5V8h2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="13" y="13" width="3.2" height="3.2" rx="0.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="17.2" y="13" width="3.2" height="3.2" rx="0.6" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  ),
  analytics: (
    <Svg color="#ea580c">
      <path d="M5 19V10M10 19V6M15 19v-7M20 19V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#25D366"
        d="M12.04 3.1A8.9 8.9 0 0 0 3.2 12c0 1.56.4 3.07 1.17 4.4L3 21l4.73-1.24A8.93 8.93 0 0 0 21 12.04 8.9 8.9 0 0 0 12.04 3.1zm5.18 12.67c-.22.62-1.28 1.14-1.78 1.18-.46.04-1.03.06-1.67-.1-.38-.1-.88-.29-1.52-.56-2.67-1.16-4.4-3.86-4.54-4.04-.13-.18-1.08-1.44-1.08-2.75 0-1.3.68-1.94.92-2.2.24-.27.52-.33.7-.33h.5c.16 0 .38-.06.6.46.22.54.74 1.86.8 2 .07.13.1.3.02.48-.08.18-.12.3-.24.46-.12.16-.25.35-.36.47-.12.13-.24.27-.1.52.13.25.6 1 .1.29 1.72 1.48 2.1 1.7 2.4 1.9.3.18.48.15.66-.1.18-.24.77-.9.98-1.2.2-.3.42-.25.7-.15.29.1 1.82.86 2.13 1.02.32.16.52.24.6.38.07.13.07.76-.15 1.38z"
      />
    </svg>
  ),
  email: (
    <Svg color="#ea580c">
      <rect x="3" y="5.5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 7.5 12 13l8-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  ),
  team: (
    <Svg color="#2563eb">
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm6 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M9 20a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  ),
  settings: (
    <Svg color="#94a3b8">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3v2M12 19v2M4.9 6.5l1.4 1.4M17.7 16.1l1.4 1.4M3 12h2M19 12h2M4.9 17.5l1.4-1.4M17.7 7.9l1.4-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="11" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
};
