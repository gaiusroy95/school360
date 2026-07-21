import { api } from './api';

export type InstitutionSetup = Record<string, unknown> & {
  id?: string;
  institutionId?: string;
  expressSetupCompletedAt?: string | null;
};

export async function fetchInstitutionSetup() {
  return api<{ setup: InstitutionSetup }>('/api/institution/setup');
}

export async function updateInstitutionTile(tileKey: string, data: Record<string, unknown>) {
  return api<{ setup: InstitutionSetup; tileKey: string }>(`/api/institution/setup/${tileKey}`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  });
}

export async function applyExpressSetup(
  tiles: Record<string, Record<string, unknown>>,
  meta?: Record<string, unknown>,
) {
  return api<{ setup: InstitutionSetup; message: string }>('/api/institution/setup/express', {
    method: 'POST',
    body: JSON.stringify({ tiles, meta }),
  });
}

export async function sendTestNotification(payload: {
  recipient: string;
  medium: string;
  message?: string;
}) {
  return api<{ message: string; medium: string; recipient: string }>(
    '/api/institution/notifications/test',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

/** Map UI tile title → API tile key */
export const TILE_KEY_BY_TITLE: Record<string, string> = {
  'Basic Information': 'basicInformation',
  'Academic Setup': 'academicSetup',
  'Classes & Sections': 'classesSections',
  'Subjects Setup': 'subjectsSetup',
  'Departments Setup': 'departmentsSetup',
  'Session & Term Setup': 'sessionTermSetup',
  'Grade & Marks Setup': 'gradeMarksSetup',
  'Fee Group Setup': 'feeGroupSetup',
  'Document Setup': 'documentSetup',
  'ID Card & Numbering': 'idCardNumbering',
  'Calendar Setup': 'calendarSetup',
  'Custom Fields Setup': 'customFieldsSetup',
  'Notification Setup': 'notificationSetup',
  'Other Preferences': 'otherPreferences',
  'Integration Setup': 'integrationSetup',
  'Backup & Recovery': 'backupRecovery',
  'Security Settings': 'securitySettings',
  'Data Import / Export': 'dataImportExport',
};
