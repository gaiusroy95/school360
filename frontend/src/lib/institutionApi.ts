import { api } from './api';

export async function uploadInstitutionLogo(file: File) {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  if (!allowed.includes(file.type)) {
    throw new Error('Only PNG, JPG, and PDF files are allowed');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Logo file must be 2MB or smaller');
  }

  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  return api<{
    logoUrl: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>('/api/institution/branding/logo', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      dataBase64,
    }),
  });
}

export async function fetchInstitutionLogoMeta() {
  return api<{
    hasLogo: boolean;
    logoUrl: string | null;
    fileName?: string;
    mimeType?: string;
  }>('/api/institution/branding/logo/meta');
}

export type InstitutionSetup = Record<string, unknown> & {
  id?: string;
  institutionId?: string;
  expressSetupCompletedAt?: string | null;
};

export async function fetchInstitutionSetup() {
  return api<{ setup: InstitutionSetup }>('/api/institution/setup');
}

export async function updateInstitutionTile(tileKey: string, data: Record<string, unknown>) {
  return api<{
    setup: InstitutionSetup;
    tileKey: string;
    sync?: Record<string, unknown>;
    examSync?: Record<string, unknown>;
    feeSync?: Record<string, unknown>;
    securitySync?: Record<string, unknown>;
    integrationsSync?: Record<string, unknown>;
    documentIdentitySync?: Record<string, unknown>;
  }>(
    `/api/institution/setup/${tileKey}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ data }),
    },
  );
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
  'Modules & UI Setup': 'modulesUiSetup',
};
