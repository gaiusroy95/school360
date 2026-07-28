import { toViewKey, VIEW_SEP } from './navigation';

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  view: string;
  keywords?: string[];
};

/** Primary create / jump actions shown in TopBar and Dashboard "Add New". */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'student', label: 'Add Student', icon: '🧑‍🎓', view: toViewKey('Student Management', 'Add New Student'), keywords: ['student', 'admission'] },
  { id: 'enquiry', label: 'New Enquiry', icon: '📋', view: toViewKey('Admission CRM', 'Enquiries'), keywords: ['enquiry', 'lead', 'admission'] },
  { id: 'fee', label: 'Collect Fee', icon: '💳', view: toViewKey('Fees & Finance', 'Fee Collection'), keywords: ['fee', 'payment', 'finance'] },
  { id: 'attendance', label: 'Mark Attendance', icon: '✅', view: toViewKey('Attendance Management', 'Student Attendance'), keywords: ['attendance', 'present'] },
  { id: 'staff', label: 'Add Staff', icon: '👩‍🏫', view: toViewKey('HR & Payroll Management', 'Employees Directory'), keywords: ['staff', 'employee', 'hr'] },
  { id: 'exam', label: 'Exam Dashboard', icon: '📝', view: toViewKey('Examination Management', 'Exam Dashboard'), keywords: ['exam', 'marks'] },
  { id: 'report', label: 'Reports', icon: '📊', view: toViewKey('Reports & Analytics', 'Reports Dashboard'), keywords: ['report', 'analytics'] },
  { id: 'settings', label: 'Settings', icon: '⚙️', view: toViewKey('Settings Management', 'General Settings'), keywords: ['settings', 'config'] },
];

export type SearchableRoute = {
  label: string;
  view: string;
  module: string;
  keywords: string[];
};

/** Flat index of all sidebar destinations for global search. */
export function buildSearchIndex(menuItems: { label: string; subItems?: string[] }[]): SearchableRoute[] {
  const routes: SearchableRoute[] = [
    { label: 'Dashboard', view: 'Dashboard', module: 'Dashboard', keywords: ['home', 'overview'] },
  ];

  for (const item of menuItems) {
    if (!item.subItems?.length) {
      routes.push({ label: item.label, view: toViewKey(item.label, item.label), module: item.label, keywords: [item.label.toLowerCase()] });
      continue;
    }
    for (const sub of item.subItems) {
      routes.push({
        label: `${item.label} › ${sub}`,
        view: toViewKey(item.label, sub),
        module: item.label,
        keywords: [item.label.toLowerCase(), sub.toLowerCase(), sub.replace(/\s+/g, '').toLowerCase()],
      });
    }
  }

  return routes;
}

export function searchRoutes(routes: SearchableRoute[], query: string, limit = 8): SearchableRoute[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return routes
    .filter((r) =>
      r.label.toLowerCase().includes(q)
      || r.module.toLowerCase().includes(q)
      || r.keywords.some((k) => k.includes(q)),
    )
    .slice(0, limit);
}

/** Navigate to a settings card link — supports in-settings pages or full cross-module view keys. */
export function resolveSettingsNavTarget(view: string): string {
  if (view.includes(VIEW_SEP)) return view;
  return toViewKey('Settings Management', view);
}

/** Institution Setup & cross-module shortcuts for Settings hub cards. */
export const SETTINGS_EXTERNAL_VIEWS: Record<string, string> = {
  'School / Institute Details': toViewKey('Institution Setup', 'Basic Information'),
  'School Profile': toViewKey('Institution Setup', 'Basic Information'),
  'Logo & Branding': toViewKey('Institution Setup', 'Basic Information'),
  'Contact Information': toViewKey('Institution Setup', 'Basic Information'),
  'Social Media Links': toViewKey('Institution Setup', 'Other Preferences'),
  'About Us / Description': toViewKey('Institution Setup', 'Basic Information'),
  'Date Format & Time Zone': toViewKey('Institution Setup', 'Other Preferences'),
  'Language Settings': toViewKey('Institution Setup', 'Other Preferences'),
  'Currency Settings': toViewKey('Institution Setup', 'Fee Group Setup'),
  'System Preferences': toViewKey('Institution Setup', 'Other Preferences'),
  'Classes / Grades Setup': toViewKey('Institution Setup', 'Classes & Sections'),
  'Sections / Groups': toViewKey('Institution Setup', 'Classes & Sections'),
  'Subjects Management': toViewKey('Institution Setup', 'Subjects Setup'),
  'Subject Allocation': toViewKey('Academic Management', 'Subject Management'),
  'Promotion Criteria': toViewKey('Academic Management', 'Academic Reports'),
  'Grading System': toViewKey('Institution Setup', 'Grade & Marks Setup'),
  'Push Notifications': toViewKey('Settings Management', 'Integrations, APIs & Notifications'),
  'Notification Templates': toViewKey('Settings Management', 'Integrations, APIs & Notifications'),
  'Notification Preferences': toViewKey('Institution Setup', 'Notification Setup'),
  'Payment Gateways': toViewKey('Settings Management', 'Payment Settings'),
  'Fee Payment Methods': toViewKey('Fees & Finance', 'Fee Collection'),
  'Online Payment Settings': toViewKey('Settings Management', 'Payment Settings'),
  'Invoice Settings': toViewKey('Fees & Finance', 'Invoices'),
  'Refund & Cancellation': toViewKey('Fees & Finance', 'Refunds'),
  'Payment Reminders': toViewKey('Fees & Finance', 'Fee Collection'),
  'Password Policy': toViewKey('Settings Management', 'Security & Compliance'),
  'Two Factor Authentication': toViewKey('Settings Management', 'Security & Compliance'),
  'IP Restrictions': toViewKey('Settings Management', 'Security & Compliance'),
  'Login Attempts Limit': toViewKey('Settings Management', 'Security & Compliance'),
  'Session Management': toViewKey('Settings Management', 'Security & Compliance'),
  'Restore Data': toViewKey('Settings Management', 'Security & Compliance'),
  'UI Preferences': toViewKey('Settings Management', 'Data Management, Modules & UI'),
};

export function resolveSettingsLink(label: string, view?: string): string | null {
  if (view) return resolveSettingsNavTarget(view);
  return SETTINGS_EXTERNAL_VIEWS[label] ?? null;
}
