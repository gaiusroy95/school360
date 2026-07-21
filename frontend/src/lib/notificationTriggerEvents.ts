/** System-wide notification trigger events (prefilled for Institution Setup). */
export const NOTIFICATION_TRIGGER_EVENTS = [
  'New Enquiry Received',
  'Enquiry Follow-up Due',
  'Enquiry Converted',
  'Application Submitted',
  'Application Approved',
  'Application Rejected',
  'Admission Confirmed',
  'Fee Due Reminder',
  'Fee Collection Receipt',
  'Payment Received',
  'Entrance Test Published',
  'Entrance Exam Result',
  'Merit List Published',
  'Seat Allocated',
  'Attendance Alert',
  'Absent Notification',
  'Result Published',
  'Exam Scheduled',
  'Exam Reminder',
  'Homework Assigned',
  'PTM Scheduled',
  'Holiday Announcement',
  'Circular Published',
  'Event Invitation',
  'Birthday Greeting',
  'Library Book Due',
  'Transport Alert',
  'Staff Leave Approved',
  'Invoice Generated',
  'Password Reset',
] as const;

export type NotificationTriggerEvent = (typeof NOTIFICATION_TRIGGER_EVENTS)[number];

export function parseTriggerEvents(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatTriggerEvents(events: string[]): string {
  return events.join(', ');
}

/** Notification delivery channels for template configuration. */
export const NOTIFICATION_MEDIUMS = [
  'WhatsApp',
  'SMS',
  'Email',
  'Push',
  'Voice',
] as const;

export type NotificationMedium = (typeof NOTIFICATION_MEDIUMS)[number];

/** Default recipient roles for notification preferences. */
export const DEFAULT_RECIPIENT_ROLES = 'Parent, Student, Admin';

export const RECIPIENT_ROLE_OPTIONS = [
  'Parent',
  'Student',
  'Admin',
  'Staff',
  'Teacher',
  'Principal',
] as const;
