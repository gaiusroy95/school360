export type SchoolBranding = {
  name: string;
  address: string;
  phone: string;
  email: string;
  affiliation: string;
  session: string;
  logoUrl?: string;
};

export type StudentAdmissionFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  aadhaarNumber: string;
  religion: string;
  nationality: string;
  category: string;
  placeOfBirth: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  fatherName: string;
  fatherMobile: string;
  fatherEmail: string;
  fatherOccupation: string;
  motherName: string;
  motherMobile: string;
  motherEmail: string;
  motherOccupation: string;
  guardianName: string;
  guardianMobile: string;
  className: string;
  sectionName: string;
  academicYear: string;
  house: string;
  rollNumber: string;
  admissionDate: string;
  previousSchool: string;
  admissionType: string;
  allergies: string;
  medicalConditions: string;
  doctorName: string;
  doctorPhone: string;
  emergencyContact: string;
  vaccinationStatus: string;
  transportRequired: string;
  transportRoute: string;
  transportStop: string;
  vehiclePreference: string;
  hostelRequired: string;
  hostelRoomType: string;
  messPreference: string;
  feeGroup: string;
  paymentMode: string;
  feeRemarks: string;
  docBirthCertificate: boolean;
  docAadhaar: boolean;
  docTransferCertificate: boolean;
  docMarksheet: boolean;
  docPhoto: boolean;
  studentPhoto: string;
  fatherPhoto: string;
  motherPhoto: string;
  declarationAccepted: boolean;
};

export const DRAFT_STORAGE_KEY = 'studentManagement.admissionFormDraft';

export const emptyAdmissionForm = (): StudentAdmissionFormData => ({
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  aadhaarNumber: '',
  religion: '',
  nationality: 'Indian',
  category: 'General',
  placeOfBirth: '',
  mobile: '+91',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  fatherName: '',
  fatherMobile: '+91',
  fatherEmail: '',
  fatherOccupation: '',
  motherName: '',
  motherMobile: '+91',
  motherEmail: '',
  motherOccupation: '',
  guardianName: '',
  guardianMobile: '+91',
  className: '',
  sectionName: '',
  academicYear: '2025-26',
  house: '',
  rollNumber: '',
  admissionDate: new Date().toISOString().slice(0, 10),
  previousSchool: '',
  admissionType: 'New Admission',
  allergies: '',
  medicalConditions: '',
  doctorName: '',
  doctorPhone: '+91',
  emergencyContact: '',
  vaccinationStatus: 'Complete',
  transportRequired: 'No',
  transportRoute: '',
  transportStop: '',
  vehiclePreference: '',
  hostelRequired: 'No',
  hostelRoomType: '',
  messPreference: '',
  feeGroup: 'Standard',
  paymentMode: 'Cash',
  feeRemarks: '',
  docBirthCertificate: false,
  docAadhaar: false,
  docTransferCertificate: false,
  docMarksheet: false,
  docPhoto: false,
  studentPhoto: '',
  fatherPhoto: '',
  motherPhoto: '',
  declarationAccepted: false,
});

export function fullName(form: StudentAdmissionFormData) {
  return [form.firstName, form.lastName].filter(Boolean).join(' ').trim() || '—';
}

export function formatDisplayDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const ADMISSION_DOCUMENT_FIELDS = [
  { key: 'docBirthCertificate' as const, label: 'Birth Certificate' },
  { key: 'docAadhaar' as const, label: 'Aadhaar Card' },
  { key: 'docTransferCertificate' as const, label: 'Transfer Certificate' },
  { key: 'docMarksheet' as const, label: 'Previous Marksheet' },
  { key: 'docPhoto' as const, label: 'Passport Size Photo' },
];

export function getAdmissionDocuments(form: StudentAdmissionFormData) {
  return ADMISSION_DOCUMENT_FIELDS.map((d) => ({
    ...d,
    submitted: Boolean(form[d.key]),
  }));
}

export function getSubmittedDocumentLabels(form: StudentAdmissionFormData): string[] {
  return getAdmissionDocuments(form).filter((d) => d.submitted).map((d) => d.label);
}

export function schoolFromInstitutionSetup(setup: Record<string, unknown> | null): SchoolBranding {
  const basic = setup?.basicInformation as { sections?: Record<string, Record<string, string>> } | undefined;
  const profile = basic?.sections?.['Institution Profile'] || {};
  const address = basic?.sections?.['Address & Contact'] || {};
  const logo = basic?.sections?.['Logo & Branding'] || {};
  const sessionTile = setup?.sessionTermSetup as { sections?: Record<string, Record<string, string>> } | undefined;
  const session = sessionTile?.sections?.['Academic Session'] || sessionTile?.sections?.Session || {};

  const addr = [address.addressLine1, address.city, address.state, address.pincode].filter(Boolean).join(', ');

  return {
    name: profile.institutionName || profile.shortName || '360 School ERP Academy',
    address: addr || 'Main Campus',
    phone: address.phone || '—',
    email: address.email || '—',
    affiliation: profile.affiliationNo || profile.registrationNo || '—',
    session: session.sessionName || session.currentSession || session.academicYear || '2025-26',
    logoUrl: logo.logoUrl || undefined,
  };
}
