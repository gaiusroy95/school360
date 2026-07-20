/** Navigation helpers — namespaced view keys keep menu labels unchanged while fixing routing collisions. */

export const VIEW_SEP = '::';

export function toViewKey(module: string, page?: string): string {
  if (!page || page === module) return module;
  return `${module}${VIEW_SEP}${page}`;
}

export function parseViewKey(view: string): { module: string; page: string } {
  if (view === 'Dashboard') return { module: 'Dashboard', page: 'Dashboard' };
  const idx = view.indexOf(VIEW_SEP);
  if (idx === -1) return { module: view, page: view };
  return {
    module: view.slice(0, idx),
    page: view.slice(idx + VIEW_SEP.length),
  };
}

export function isModuleActive(view: string, moduleLabel: string, subItems?: string[]): boolean {
  if (view === moduleLabel) return true;
  if (view.startsWith(`${moduleLabel}${VIEW_SEP}`)) return true;
  // Legacy non-namespaced keys (before migration)
  if (subItems?.includes(view)) return true;
  return false;
}

export function isSubActive(view: string, moduleLabel: string, subItem: string): boolean {
  const { module, page } = parseViewKey(view);
  if (module === moduleLabel && page === subItem) return true;
  // Legacy
  if (view === subItem) return true;
  return false;
}

/** Default (landing) page for each module — shows the existing full mock dashboard. */
export const MODULE_DEFAULT_PAGE: Record<string, string> = {
  'Admission CRM': 'Enquiries',
  'Student Management': 'Students List',
  'Parent Management': 'Parents List',
  'Academic Management': 'Class & Sections',
  'Attendance Management': 'Student Attendance',
  'Examination Management': 'Exam Dashboard',
  'Fees & Finance': 'Fee Dashboard',
  'HR & Payroll Management': 'Employee Dashboard',
  'Transport Management': 'Transport Dashboard',
  'Library Management': 'Library Dashboard',
  'Hostel Management': 'Hostel Dashboard',
  'Inventory Management': 'Inventory Dashboard',
  'Event Management': 'Event Dashboard',
  'Communication Management': 'Communication Dashboard',
  'Website & CMS Management': 'Website Dashboard',
  'Reports & Analytics': 'Reports Dashboard',
  'Institution Setup': 'Overview',
  'Settings Management': 'General Settings',
  'System Administration': 'Admin Dashboard',
};
