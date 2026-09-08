import { NavIcons } from '../components/nav/NavIcons';

/**
 * Desk navigation (Runo-like). `feature` is checked via canAccessFeatureForUser.
 * Locked items stay visible with a lock — click goes to Settings billing.
 */
export const WORKSPACE_NAV = [
  {
    id: 'main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: NavIcons.dashboard, feature: 'dashboard' },
      { to: '/allocations', label: 'Allocations', icon: NavIcons.allocations, feature: 'allocations', adminOnly: true },
      { to: '/leads', label: 'Customers', icon: NavIcons.customers, feature: 'leads' },
      { to: '/interactions', label: 'Interactions', icon: NavIcons.interactions, feature: 'interactions' },
      { to: '/inbox/gmail', label: 'Gmail Inbox', icon: NavIcons.gmail, feature: 'gmailInbox' },
      { to: '/follow-ups', label: 'Follow-Ups', icon: NavIcons.followups, feature: 'follow-ups' },
      { to: '/calendar', label: 'Calendar', icon: NavIcons.calendar, feature: 'calendar' },
      { to: '/calls', label: 'Call Logs', icon: NavIcons.calls, feature: 'callBridge', adminOnly: true },
      { to: '/recurring-follow-ups', label: 'Recurring Follow-Ups', icon: NavIcons.recurring, feature: 'recurringFollowUps' },
      { to: '/reports', label: 'Request Reports', icon: NavIcons.reports, feature: 'reports', adminOnly: true },
      { to: '/rechurn', label: 'Rechurn Customers', icon: NavIcons.rechurn, feature: 'rechurn' },
      { to: '/analytics', label: 'Analytics', icon: NavIcons.analytics, feature: 'analytics', adminOnly: true },
    ],
  },
  {
    id: 'templates',
    label: 'Templates',
    items: [
      { to: '/templates/whatsapp', label: 'Whatsapp', icon: NavIcons.whatsapp, feature: 'whatsappTemplates' },
      { to: '/templates/email', label: 'Email', icon: NavIcons.email, feature: 'emailTemplates' },
    ],
  },
  {
    id: 'admin',
    items: [
      { to: '/employees', label: 'Team', icon: NavIcons.team, feature: 'employees', adminOnly: true },
      { to: '/settings', label: 'Settings', icon: NavIcons.settings, feature: 'settings', adminOnly: true },
    ],
  },
];

export const FEATURE_UNLOCK_HINT = {
  dashboard: { title: 'Dashboard', need: 'Included on every plan' },
  leads: { title: 'Customers', need: 'Leads module' },
  allocations: { title: 'Allocations', need: 'Leads module' },
  interactions: { title: 'Interactions', need: 'Leads or IVR module' },
  gmailInbox: { title: 'Gmail Inbox', need: 'Leads module' },
  'follow-ups': { title: 'Follow-Ups', need: 'Leads module' },
  calendar: { title: 'Calendar', need: 'Leads module' },
  callBridge: { title: 'Call Logs', need: 'IVR module' },
  calls: { title: 'Call Logs', need: 'IVR module' },
  recurringFollowUps: { title: 'Recurring Follow-Ups', need: 'Leads module' },
  reports: { title: 'Reports', need: 'Professional or Enterprise' },
  requestReports: { title: 'Request Reports', need: 'Professional or Enterprise' },
  rechurn: { title: 'Rechurn Customers', need: 'Leads module' },
  analytics: { title: 'Analytics', need: 'Professional or Enterprise' },
  whatsappTemplates: { title: 'WhatsApp templates', need: 'Leads module' },
  emailTemplates: { title: 'Email templates', need: 'Professional or Enterprise' },
  emailAlerts: { title: 'Email', need: 'Professional or Enterprise' },
  employees: { title: 'Team', need: 'Included on every plan' },
  settings: { title: 'Settings', need: 'Included on every plan' },
};
