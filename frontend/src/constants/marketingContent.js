export const TRIAL_DAYS = 10;
export const TRIAL_HEADLINE = '10-day free trial · No credit card';

export const MARKETING_STATS = [
  { value: '1 desk', label: 'Leads, calls & follow-ups together' },
  { value: 'IVR', label: 'Click-to-call on the lead profile' },
  { value: '10 days', label: 'Full workspace trial' },
  { value: 'Per user', label: 'Pay for the team you actually run' },
];

/** Home benefit pillars — real CRM outcomes (layout inspired by product sites, not copied) */
export const HOME_BENEFITS = [
  {
    title: 'One pipeline the whole floor trusts',
    text: 'Every lead — imported, manual, or integrated — lives in Lead Vault with status, owner, and history. No more competing spreadsheets.',
  },
  {
    title: 'Calls that stay inside the CRM',
    text: 'IVR click-to-call from the lead profile. Duration, status, and recording land on the same timeline managers already open.',
  },
  {
    title: 'Follow-ups that actually happen',
    text: 'Follow-up Radar ranks today, pending, and missed work so reps reconnect before deals go cold — without sticky-note chaos.',
  },
  {
    title: 'Managers see the floor in real time',
    text: 'Command Center and Insight Studio show intake, call volume, conversion, and rep load — so coaching happens from data, not guesswork.',
  },
];

export const PLAN_EXCLUSIVE_FEATURES = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 'From ₹499/user/mo',
    tag: 'Trial includes this',
    headline: 'Lead & follow-up discipline for small teams',
    exclusives: [
      'Lead Vault + Kanban with Pulse score',
      'Follow-up Radar with urgency badges',
      'Round-robin assignment',
      'Up to 5 users · Leads module',
      'Command palette (⌘K)',
    ],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 'From ₹999/user/mo',
    tag: 'Most teams upgrade here',
    popular: true,
    headline: 'Full CRM + IVR calling on one desk',
    exclusives: [
      'Call Bridge — IVR click-to-call & recordings',
      'Insight Studio reports + CSV export',
      'Email alert engine',
      'Full automation pack',
      'Up to 25 users · combo pricing',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Same rates · no seat cap',
    tag: 'Unlimited scale',
    headline: 'AI ops for multi-manager floors',
    exclusives: [
      'AI Advisor missions on Command Center',
      'Unlimited users & priority support',
      'Custom webhook fields',
      'Advanced analytics layer',
      'Everything in Professional',
    ],
  },
];

/** CRM vs spreadsheet vs generic dialer tools — honest, not competitor-name bait */
export const WHY_US_COMPARE = [
  {
    label: 'Lead pipeline + statuses',
    us: 'Built-in Lead Vault',
    sheets: 'Manual columns',
    dialer: 'Often thin CRM',
  },
  {
    label: 'IVR click-to-call & recordings',
    us: 'On the lead profile',
    sheets: '—',
    dialer: 'Separate dialer log',
  },
  {
    label: 'Follow-up discipline',
    us: 'Radar + reminders',
    sheets: 'Memory / WhatsApp',
    dialer: 'Varies',
  },
  {
    label: 'Team reports',
    us: 'Insight Studio',
    sheets: 'DIY pivot tables',
    dialer: 'Call stats only',
  },
  {
    label: 'Pricing model',
    us: 'Per person · prepaid',
    sheets: 'Hidden labour cost',
    dialer: 'Often per user',
  },
  {
    label: 'Free trial',
    us: '10 days · no card',
    sheets: '—',
    dialer: 'Varies',
  },
];

export const MOBILE_WEB_POINTS = [
  {
    title: 'Works on any phone browser',
    text: 'Reps open leads, follow-ups, and call history from Chrome — no second install required.',
  },
  {
    title: 'Same login as desktop',
    text: 'Managers and closers see one pipeline whether they are on the floor or on the road.',
  },
  {
    title: 'Native app on the roadmap',
    text: 'Until a Play Store app ships, the web desk stays fully responsive for field teams.',
  },
];

export const HOME_PROBLEM_POINTS = [
  {
    title: 'Leads scatter across tools',
    text: 'Sheets, inboxes, WhatsApp groups, and dialer apps each hold a different “truth.”',
  },
  {
    title: 'Follow-ups depend on memory',
    text: 'When one rep is on leave, callbacks slip — and revenue quietly walks away.',
  },
  {
    title: 'Calls live outside the CRM',
    text: 'Managers cannot coach from recordings or timelines that never reach the lead record.',
  },
];

export const HOME_WORKFLOW = [
  {
    title: 'Capture or import the lead',
    text: 'Add manually, bulk import CSV/Excel, or connect intake webhooks — everything lands in Lead Vault.',
  },
  {
    title: 'Assign an owner automatically',
    text: 'Round-robin keeps the desk fair so managers stop assigning in the group chat.',
  },
  {
    title: 'Call from the lead profile',
    text: 'IVR click-to-call logs duration, status, and recording on the same customer timeline.',
  },
  {
    title: 'Close the loop with Radar',
    text: 'Follow-up Radar surfaces today, pending, and missed work before the deal goes cold.',
  },
];

export const HOME_CAPABILITIES = [
  { title: 'Lead Vault', text: 'Searchable pipeline with Pulse score, notes, and activity timeline.' },
  { title: 'IVR Call Bridge', text: 'Click-to-call, recordings, and per-lead call history.' },
  { title: 'Follow-up Radar', text: 'Today / pending / missed with urgency badges.' },
  { title: 'Team Grid', text: 'Roles, seats, IVR agent mapping, and per-rep performance.' },
  { title: 'Insight Studio', text: 'Employee, call, and conversion reports with CSV export.' },
  { title: 'Command Center', text: 'Morning KPIs, trends, and shortcuts in one screen.' },
  { title: 'Automation', text: 'Missed follow-up nudges, stale-lead alerts, assignment rules.' },
  { title: 'Secure access', text: 'Email OTP sign-in and multi-tenant workspace isolation.' },
];

export const HOME_TESTIMONIALS = [
  {
    quote:
      'We finally have one place for leads, callbacks, and call recordings. Managers coach from the timeline instead of chasing WhatsApp screenshots.',
    name: 'Operations lead',
    role: '12-person inside-sales team, Pune',
  },
  {
    quote:
      'Round-robin stopped the “who owns this?” fights. Follow-up Radar is what our reps open before lunch every day.',
    name: 'Sales manager',
    role: 'Local services floor, Ahmedabad',
  },
];

export const MARKETING_FEATURES = [
  {
    slug: 'lead-vault',
    category: 'Pipeline',
    title: 'Lead Vault',
    desc: 'Every enquiry in one searchable desk — status, owner, notes, and activity history.',
    detail:
      'Table and Kanban views, bulk CSV/Excel import, duplicate-phone handling, and a full timeline so nothing lives only in a spreadsheet.',
  },
  {
    slug: 'lead-pulse',
    category: 'Pipeline',
    title: 'Lead Pulse score',
    desc: 'Hot, warm, and cold badges from status, follow-up date, source, and age.',
    detail:
      'Pulse weighs pipeline stage, overdue follow-ups, unassigned state, and age into a 0–100 score visible in table and Kanban.',
  },
  {
    slug: 'round-robin',
    category: 'Pipeline',
    title: 'Round-robin assignment',
    desc: 'Fair rotation across active sales employees. Switch to manual when managers want control.',
    detail:
      'Configure in Control Room. New and unassigned leads auto-route without ops babysitting a sheet.',
  },
  {
    slug: 'ivr-calls',
    category: 'Calls',
    title: 'IVR click-to-call',
    desc: 'Dial from the lead profile. Completion webhooks attach recordings and call status to the timeline.',
    detail:
      'Professional plan and above. Reps stay inside the CRM; managers audit call history without screenshots.',
  },
  {
    slug: 'follow-up-radar',
    category: 'Tasks',
    title: 'Follow-up Radar',
    desc: 'Today, pending, and missed tabs with urgency labels so overdue items surface early.',
    detail:
      'Automation can nudge reps when follow-ups slip. Managers see counts on the Command Center signal band.',
  },
  {
    slug: 'insight-studio',
    category: 'Analytics',
    title: 'Insight Studio reports',
    desc: 'Employee, call, and conversion reports with CSV export and email share.',
    detail:
      'Filter by date and source. Email a snapshot to managers without re-uploading to chat apps.',
  },
  {
    slug: 'email-alerts',
    category: 'Comms',
    title: 'Email alert engine',
    desc: 'HTML emails when leads assign, admins broadcast notices, or reports are shared.',
    detail:
      'Available on Professional and Enterprise. Uses your workspace SMTP with polished templates.',
  },
  {
    slug: 'ai-advisor',
    category: 'Enterprise',
    title: 'AI Advisor missions',
    desc: 'Health score and suggested actions for ops leads before the month ends.',
    detail:
      'Enterprise plan. Surfaces stale leads, missed follow-ups, and team load in one command view.',
  },
  {
    slug: 'webhook-intake',
    category: 'Integrations',
    title: 'Lead intake webhooks',
    desc: 'Optional form webhooks (including ad platforms) push enquiries into Lead Vault with source metadata.',
    detail:
      'One of several intake paths alongside manual entry and Excel import — not the whole product identity.',
  },
  {
    slug: 'command-palette',
    category: 'Productivity',
    title: 'Command palette',
    desc: 'Jump to leads, follow-ups, reports, or settings from anywhere.',
    detail: 'Press Ctrl+K or use the navbar trigger. Plan-gated routes hide automatically on Starter.',
  },
  {
    slug: 'email-otp',
    category: 'Security',
    title: 'Email OTP sign-in',
    desc: 'Verify workspace access via inbox OTP without SMS vendor lock-in.',
    detail: 'Gmail App Password or SMTP provider. Secure access without per-message SMS fees.',
  },
  {
    slug: 'razorpay',
    category: 'Billing',
    title: 'Razorpay checkout',
    desc: 'UPI, cards, netbanking, and wallets with INR subscriptions.',
    detail:
      'Super Admins complete checkout during workspace creation or upgrade from Control Room → Subscription.',
  },
];

export const FEATURE_CATEGORIES = [
  'Pipeline',
  'Calls',
  'Tasks',
  'Analytics',
  'Comms',
  'Enterprise',
  'Integrations',
  'Productivity',
  'Security',
  'Billing',
];

export const MARKETING_MODULES = [
  {
    id: 'dashboard',
    name: 'Command Center',
    tag: 'Dashboard',
    summary: 'Morning briefing for leads, calls, and follow-ups.',
    points: ['Live KPI tiles', '7-day intake trend', 'Signal band metrics', 'Command dock shortcuts', 'Enterprise AI missions'],
    forWho: 'Managers and reps who need one screen before the stand-up.',
  },
  {
    id: 'leads',
    name: 'Lead Vault',
    tag: 'Leads',
    summary: 'Every enquiry — import, manual, or integrated — in one searchable vault.',
    points: ['Table + Kanban', 'Pulse score', 'Bulk CSV/Excel import', 'Notes & activity timeline', 'Bulk delete'],
    forWho: 'Anyone touching the pipeline daily.',
  },
  {
    id: 'calls',
    name: 'Call Bridge',
    tag: 'IVR',
    summary: 'Outbound calls and recordings tied to the lead — not a separate dialer log.',
    points: ['Click-to-call', 'Recording playback', 'Filter by rep/status', 'Per-lead call history'],
    forWho: 'Inside sales teams on Professional plan or above.',
  },
  {
    id: 'followups',
    name: 'Follow-up Radar',
    tag: 'Tasks',
    summary: 'Due dates that actually get completed, ranked by urgency.',
    points: ['Today / pending / missed', 'Urgency badges', 'One-tap complete', 'Automation reminders'],
    forWho: 'Reps with 20+ active conversations.',
  },
  {
    id: 'reports',
    name: 'Insight Studio',
    tag: 'Reports',
    summary: 'Rep and call performance without exporting to Excel every Friday.',
    points: ['Employee leaderboard', 'Call breakdown', 'Conversion funnel', 'CSV export', 'Email share'],
    forWho: 'Managers reviewing floor performance.',
  },
  {
    id: 'employees',
    name: 'Team Grid',
    tag: 'People',
    summary: 'Seat limits, roles, IVR IDs, and performance drill-down.',
    points: ['Role-based access', 'Bulk import', 'IVR agent mapping', 'Performance page per rep'],
    forWho: 'Admins scaling the floor past five people.',
  },
  {
    id: 'settings',
    name: 'Control Room',
    tag: 'Settings',
    summary: 'Integrations, automation toggles, billing, and team notices.',
    points: ['Webhook keys', 'Assignment method', 'Automation switches', 'Razorpay upgrade', 'Team broadcast'],
    forWho: 'Super Admins and ops owners.',
  },
];

export const MARKETING_PLANS = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 'From ₹499',
    period: '/user/mo',
    trialNote: '10-day free trial on signup',
    bestFor: 'Small teams building lead and follow-up habit.',
    features: ['Up to 5 users', 'Leads module', 'Command Center + Lead Vault', 'Follow-up Radar', 'In-app notifications'],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 'From ₹999',
    period: '/user/mo',
    trialNote: '10-day free trial on signup',
    popular: true,
    bestFor: 'Growing floors that need CRM + IVR daily.',
    features: [
      'Up to 25 users',
      'Leads + IVR combo',
      'Call Bridge + IVR',
      'Insight Studio reports',
      'Email alerts',
      'Full automation pack',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Same rates',
    period: '· no seat cap',
    trialNote: '10-day free trial on signup',
    bestFor: 'Multi-manager floors needing AI ops and unlimited seats.',
    features: [
      'Unlimited users',
      'AI Advisor on dashboard',
      'Priority support tier',
      'Custom webhooks',
      'Everything in Professional',
    ],
  },
];

export const PRICING_COMPARE = [
  { label: 'Users', starter: '5', pro: '25', ent: 'Unlimited' },
  { label: 'Leads', starter: '500', pro: 'Unlimited', ent: 'Unlimited' },
  { label: 'IVR / calls', starter: '—', pro: '✓', ent: '✓' },
  { label: 'Reports', starter: '—', pro: '✓', ent: '✓' },
  { label: 'Email alerts', starter: '—', pro: '✓', ent: '✓' },
  { label: 'AI Advisor', starter: '—', pro: '—', ent: '✓' },
];

export const MARKETING_FAQ = [
  {
    q: 'Is there a free trial?',
    a: 'Yes. Every new workspace gets a 10-day full trial with no credit card required at signup. After the trial, pay via Razorpay to keep access.',
  },
  {
    q: 'What is Sales Lead CRM built for?',
    a: 'Indian sales teams that need one workspace for leads, IVR calls, follow-ups, team roles, and reports — not a separate dialer log and a separate spreadsheet.',
  },
  {
    q: 'Does it include IVR calling?',
    a: 'Yes on Professional and Enterprise. Reps call from the lead profile; your IVR provider sends completion webhooks with status and recording URL.',
  },
  {
    q: 'How do leads enter the CRM?',
    a: 'Manual entry, CSV/Excel import, and optional intake webhooks. Ad-platform form webhooks are supported as one integration — not the only way to work.',
  },
  {
    q: 'Do I need a separate SMS provider for login?',
    a: 'No. Sign-in and registration use email OTP through your SMTP (e.g. Gmail App Password). Phone numbers are stored for contact only.',
  },
  {
    q: 'What is Lead Pulse?',
    a: 'A 0–100 priority score on each lead. It considers status, follow-up due date, assignment, source, and age so reps focus on deals likely to close.',
  },
  {
    q: 'Can managers see employee performance?',
    a: 'Yes. Insight Studio includes employee reports, call stats, and CSV export. Team Grid links to per-rep performance pages.',
  },
  {
    q: 'How does round-robin assignment work?',
    a: 'Active sales employees rotate automatically on new or unassigned leads. Switch to manual assignment in Control Room when needed.',
  },
  {
    q: 'Can I upgrade or change plans later?',
    a: 'Super Admins upgrade from Control Room → Subscription. Razorpay handles checkout; your workspace keeps existing data.',
  },
  {
    q: 'Is my data isolated from other companies?',
    a: 'Every workspace is multi-tenant isolated by company ID. Users only see leads, calls, and settings for their own organization.',
  },
  {
    q: 'What automation alerts are included?',
    a: 'Missed follow-up nudges, stale lead warnings, unassigned lead alerts, and follow-up reminders — configurable in Control Room.',
  },
  {
    q: 'How fast can we go live?',
    a: 'Most teams create a workspace, import leads or reps, and start using Follow-up Radar the same day. Connect IVR when you are ready on Professional.',
  },
];
