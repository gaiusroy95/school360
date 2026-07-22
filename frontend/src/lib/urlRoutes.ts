import { parseViewKey, toViewKey, MODULE_DEFAULT_PAGE } from './navigation';

type ModuleDef = { label: string; subItems: string[] };

// Keep this in sync with `src/components/Sidebar.tsx` labels/subItems.
const MODULES: ModuleDef[] = [
  {
    label: 'Admission CRM',
    subItems: ['Enquiries', 'Leads', 'Applications', 'Follow Ups', 'Counselling', 'Admission Test', 'Merit List', 'Seat Allocation', 'Admissions', 'Fee Collection', 'Reports'],
  },
  {
    label: 'Student Management',
    subItems: ['Students List', 'Add New Student', 'Student Profiles', 'Student Categories', 'Bulk Import', 'Student Reports', 'Student Analytics', 'Student ID Cards'],
  },
  {
    label: 'Parent Management',
    subItems: ['Parents List', 'Parents Engagement', 'Parent Profiles', 'Communication Log', 'Parent Categories', 'Parent Feedback', 'Parent Meetings (PTM)', 'Consent Management'],
  },
  {
    label: 'Academic Management',
    subItems: ['Class & Sections', 'Curriculum & Syllabus', 'Timetable', 'Lesson Planning', 'Homework', 'Academic Calendar', 'Continuous Evaluation', 'Subject Management', 'Co-Scholastic Activities', 'Teacher Allocation', 'Academic Reports'],
  },
  {
    label: 'Attendance Management',
    subItems: ['Student Attendance', 'Teacher Attendance', 'Staff Attendance', 'Attendance By Date', 'Daily Summary', 'Attendance Report', 'Leave Management', 'Holiday Calendar', 'Gate Pass', 'Late Coming / Early Exit', 'Biometric Devices'],
  },
  {
    label: 'Examination Management',
    subItems: ['Exam Dashboard', 'Exam Schedule', 'Subjects & Syllabus', 'Question Bank', 'Paper Management', 'Seating Arrangement', 'Invigilation Management', 'Marks Entry', 'Result Processing', 'Report Cards', 'Revaluation / Recheck', 'Grade & Promotion', 'Certificates', 'Exam Analytics'],
  },
  {
    label: 'Fees & Finance',
    subItems: ['Fee Dashboard', 'Fee Masters', 'Fee Structure', 'Fee Collection', 'Invoices', 'Online Payments', 'Payment Reconciliation', 'Discounts & Concessions', 'Refunds', 'Fine / Penalties', 'Scholarship', 'Transport Fee', 'Hostel Fee', 'Other Charges', 'Accounts & Ledger', 'Expense Management', 'Bank & Cash Book', 'Payroll', 'Financial Reports'],
  },
  {
    label: 'HR & Payroll Management',
    subItems: ['Employee Dashboard', 'Employees Directory', 'Departments', 'Designations', 'Attendance & Leave', 'Leave Management', 'Payroll Management', 'Salary Structure', 'Allowances & Deductions', 'Attendance Policy', 'Shift Management', 'Performance Appraisal', 'Recruitment', 'Training & Development', 'Documents', 'Resignation / Exit', 'Reports'],
  },
  {
    label: 'Transport Management',
    subItems: ['Transport Dashboard', 'Route & Vehicle Master', 'Route Planning', 'Live Vehicle Tracking', 'Student Transportation', 'Driver & Attendant', 'Trip Management', 'Stops & Geo Fencing', 'Transport Attendance', 'Transport Fees', 'Maintenance & Service', 'Fuel Management', 'Safety & Alerts', 'Incident Reports', 'Reports & Analytics'],
  },
  {
    label: 'Library Management',
    subItems: ['Library Dashboard', 'Book Catalogue', 'Book Issue / Return', 'Members', 'Add / Manage Books', 'Categories & Subjects', 'Rack Management', 'Stock Verification', 'Fine Management', 'Library Attendance', 'Reading Room', 'E-Resources', 'Reports & Analytics'],
  },
  {
    label: 'Hostel Management',
    subItems: ['Hostel Dashboard', 'Rooms & Allotment', 'Students', 'Wardens / Staff', 'Visitor Management', 'Mess Management', 'Leave Management', 'Gate Pass', 'Complaints / Feedback', 'Maintenance', 'Inventory', 'Laundry Management', 'Discipline & Incidents', 'Reports & Analytics'],
  },
  {
    label: 'Inventory Management',
    subItems: ['Inventory Dashboard', 'Items / Products', 'Categories & Units', 'Stock Inward (GRN)', 'Stock Outward', 'Transfer / Stock Movement', 'Supplier Management', 'Purchase Orders', 'Vendor Bills', 'Stock Adjustment', 'Barcode / QR Code', 'Stock Verification', 'Reorder Level', 'Reports & Analytics'],
  },
  {
    label: 'Event Management',
    subItems: ['Event Dashboard', 'Events List', 'Create Event', 'Event Calendar', 'Registrations', 'Tickets & Passes', 'Volunteers', 'Vendors & Sponsors', 'Task Management', 'Feedback & Surveys', 'Certificates', 'Reports & Analytics'],
  },
  {
    label: 'Communication Management',
    subItems: ['Communication Dashboard', 'Compose Message', 'Message Templates', 'SMS Management', 'Email Management', 'WhatsApp Management', 'Push Notifications', 'Circulars / Notices', 'Event Invitations', 'Surveys & Feedback', 'Auto Reminders', 'Message History', 'Reports & Analytics'],
  },
  {
    label: 'Website & CMS Management',
    subItems: ['Website Dashboard', 'Pages Management', 'Blog Management', 'Media Library', 'Menus & Navigation', 'Sliders & Banners', 'Testimonials', 'Forms Management', 'Popups & Notices', 'SEO Management', 'Theme & Appearance', 'Backup & Restore', 'Analytics & Reports'],
  },
  {
    label: 'Reports & Analytics',
    subItems: ['Reports Dashboard', 'Student Reports', 'Academic Reports', 'Attendance Reports', 'Examination Reports', 'Finance Reports', 'HR Reports', 'Library Reports', 'Transport Reports', 'Hostel Reports', 'Inventory Reports', 'Custom Reports'],
  },
  {
    label: 'Institution Setup',
    subItems: ['Basic Information', 'Academic Setup', 'Classes & Sections', 'Subjects Setup', 'Departments Setup', 'Session & Term Setup', 'Grade & Marks Setup', 'Fee Group Setup', 'Document Setup', 'ID Card & Numbering', 'Calendar Setup', 'Custom Fields Setup', 'Notification Setup', 'Other Preferences'],
  },
  {
    label: 'Settings Management',
    subItems: ['General Settings', 'School Settings', 'Academic Settings', 'User & Role Settings', 'Module Settings', 'System Settings', 'Notifications Settings', 'Payment Settings', 'Security Settings', 'Backup & Restore', 'API & Integrations', 'Audit Log'],
  },
  {
    label: 'System Administration',
    subItems: ['Admin Dashboard', 'User & Access Control', 'Role & Permission', 'System Configuration', 'Database Management', 'Server & Performance', 'Security Management', 'Backup & Restore', 'Audit Logs', 'Email & SMS Gateway', 'API Management', 'System Updates', 'License Management', 'Support & Maintenance'],
  },
];

function slugify(input: string): string {
  return input
    .replace(/&/g, 'and')
    .replace(/[()]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const moduleLabelBySlug: Record<string, string> = {};
for (const m of MODULES) moduleLabelBySlug[slugify(m.label)] = m.label;

const pageLabelByModuleSlugAndPageSlug: Record<string, string> = {};
for (const m of MODULES) {
  for (const p of m.subItems) {
    pageLabelByModuleSlugAndPageSlug[`${slugify(m.label)}|${slugify(p)}`] = p;
  }
}

export function viewKeyToPath(viewKey: string): string {
  const { module, page } = parseViewKey(viewKey);
  if (module === 'Dashboard') return '/dashboard';

  const moduleSlug = slugify(module);
  const pageSlug = slugify(page);
  return `/${moduleSlug}/${pageSlug}`;
}

export function pathToViewKey(pathname: string): string {
  const raw = pathname.split('?')[0].split('#')[0].trim();
  const clean = raw.replace(/\/+$/g, '').replace(/^\/+/g, '');

  if (!clean) return 'Dashboard';
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0) return 'Dashboard';

  if (parts.length === 1) {
    const moduleSlug = parts[0];
    const moduleLabel = moduleLabelBySlug[moduleSlug];
    if (!moduleLabel) return 'Dashboard';
    const defaultPage = MODULE_DEFAULT_PAGE[moduleLabel] || moduleLabel;
    return toViewKey(moduleLabel, defaultPage);
  }

  const [moduleSlug, pageSlug] = parts;
  const moduleLabel = moduleLabelBySlug[moduleSlug];
  if (!moduleLabel) return 'Dashboard';

  const pageLabel = pageLabelByModuleSlugAndPageSlug[`${moduleSlug}|${pageSlug}`];
  if (!pageLabel) return toViewKey(moduleLabel, MODULE_DEFAULT_PAGE[moduleLabel] || moduleLabel);
  return toViewKey(moduleLabel, pageLabel);
}

