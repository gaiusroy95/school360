import type { Student } from './studentServices';
import type { IdCardSchool, IdCardStudent, IdCardTemplateId } from '../components/crm/InstitutionSetup/idCardTypes';
import { ID_CARD_TEMPLATES } from '../components/crm/InstitutionSetup/idCardTypes';

const TEMPLATE_NAME_TO_ID: Record<string, IdCardTemplateId> = {
  "St. Anthony's College Style": 'stAnthony',
  'Mount Convent Style': 'saiJyoti',
  'Professional Staff Style': 'adarsh',
  'Bright Future Style': 'oxford',
  'Air Force International Style': 'emeraldCrest',
  'School Inc Style': 'modernMinimal',
  'Greenwood Primary Style': 'royalMaroon',
  'Sai Jyoti Style': 'saiJyoti',
  'Adarsh Model Style': 'adarsh',
  'Classic University Style': 'oxford',
  'Emerald Crest Style': 'emeraldCrest',
  'Modern Minimal Style': 'modernMinimal',
  'Royal Maroon Style': 'royalMaroon',
};

export function templateIdFromName(name: string): IdCardTemplateId {
  if (TEMPLATE_NAME_TO_ID[name]) return TEMPLATE_NAME_TO_ID[name];
  const found = ID_CARD_TEMPLATES.find((t) => t.name === name);
  return found?.id || 'stAnthony';
}

export function schoolFromInstitutionSetup(setup: Record<string, unknown> | null): IdCardSchool {
  const basic = setup?.basicInformation as { sections?: Record<string, Record<string, string>> } | undefined;
  const profile = basic?.sections?.['Institution Profile'] || {};
  const address = basic?.sections?.['Address & Contact'] || {};
  const sessionTile = setup?.sessionTermSetup as { sections?: Record<string, Record<string, string>> } | undefined;
  const session = sessionTile?.sections?.['Academic Session'] || sessionTile?.sections?.['Session'] || {};

  return {
    name: profile.institutionName || profile.shortName || '360 School ERP Academy',
    address: [address.addressLine1, address.city, address.state].filter(Boolean).join(', ') || 'Main Campus',
    phone: address.phone || '—',
    session: session.sessionName || session.currentSession || session.academicYear || '2025-26',
    logoUrl: basic?.sections?.['Logo & Branding']?.logoUrl || undefined,
    website: address.website || undefined,
  };
}

export function defaultStudentTemplateFromSetup(setup: Record<string, unknown> | null): string {
  const tile = setup?.idCardNumbering as { sections?: Record<string, Record<string, string>> } | undefined;
  const templates = tile?.sections?.['ID Card Templates'] || {};
  return templates.studentTemplate || ID_CARD_TEMPLATES[0].name;
}

export function resolveStudentIdCardTemplate(
  student: Student,
  profileTemplate: string,
  institutionDefault: string,
): IdCardTemplateId {
  const custom = student.customFields as Record<string, unknown> | undefined;
  const fromProfile = profileTemplate || (custom?.idCardTemplate as string) || '';
  const name = fromProfile || institutionDefault || ID_CARD_TEMPLATES[0].name;
  return templateIdFromName(name);
}

export function studentToIdCardStudent(student: Student): IdCardStudent {
  const form = (student.customFields?.admissionForm || {}) as Record<string, string>;
  return {
    id: student.id,
    name: student.fullName,
    className: student.className,
    section: student.sectionName || '—',
    rollNo: student.rollNumber || '—',
    dob: student.dob || form.dateOfBirth || '—',
    fatherName: student.fatherName || form.fatherName || '—',
    phone: student.mobile || student.fatherMobile || '—',
    address: student.address || form.address || '—',
    aadhaar: student.aadhaarNumber || form.aadhaarNumber,
    photoUrl: student.photoUrl || form.studentPhoto,
    course: student.className,
    batch: student.academicYear,
    bloodGroup: student.bloodGroup || form.bloodGroup,
    designation: 'Student',
  };
}

export function getAdmissionForm(student: Student): Record<string, unknown> {
  return (student.customFields?.admissionForm || {}) as Record<string, unknown>;
}

export function getProfileMeta(student: Student): Record<string, unknown> {
  return (student.customFields?.profile || {}) as Record<string, unknown>;
}
