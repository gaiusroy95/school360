import { Prisma, StudentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedRoomsAllotment } from './hostelRoomsAllotment.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const BRANCHES = ['Science', 'Commerce', 'Arts', 'Engineering'];
const BATCHES = ['2023-27', '2024-28', '2025-29'];
const DIETARY = ['VEG', 'NON_VEG', 'EGGETARIAN'];

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function encryptPii(value: string) {
  if (!value) return '';
  return `enc:${Buffer.from(value, 'utf8').toString('base64')}`;
}

function decryptPiiDisplay(encrypted: string) {
  if (!encrypted.startsWith('enc:')) return '••••••••';
  try {
    const raw = Buffer.from(encrypted.slice(4), 'base64').toString('utf8');
    return `${raw.slice(0, 2)}${'•'.repeat(Math.max(0, raw.length - 4))}${raw.slice(-2)}`;
  } catch {
    return '••••••••';
  }
}

function isMinor(dob: Date | null | undefined) {
  if (!dob) return false;
  const age = (Date.now() - dob.getTime()) / (365.25 * 86400000);
  return age < 18;
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Hostel Admin',
) {
  await prisma.hostelActivityLog.create({
    data: {
      institutionId,
      action,
      details,
      filterSnapshot: snapshot as Prisma.InputJsonValue,
      performedBy,
    },
  });
}

function mapProfileRow(
  p: {
    id: string;
    studentId: string;
    photoUrl: string;
    mobile: string;
    email: string;
    branchName: string;
    batchLabel: string;
    roomNumber: string;
    bedNumber: string;
    blockName: string;
    bloodGroup: string;
    dietaryPreference: string;
    disciplinaryPoints: number;
    docVerificationStatus: string;
    residentStatus: string;
    lastSyncedAt: Date | null;
    allergies: string;
    localGuardianName: string;
    localGuardianMobile: string;
    academicYear: string;
    student: {
      firstName: string;
      lastName: string;
      admissionNumber: string;
      className: string;
      sectionName: string;
      gender: string;
      status: string;
    };
    hostel: { hostelName: string; hostelCode: string } | null;
  },
) {
  const name = `${p.student.firstName} ${p.student.lastName}`.trim();
  return {
    id: p.id,
    studentId: p.studentId,
    name,
    admissionNumber: p.student.admissionNumber,
    classLabel: `${p.student.className}${p.student.sectionName ? `-${p.student.sectionName}` : ''}`,
    gender: p.student.gender,
    photoUrl: p.photoUrl,
    mobile: p.mobile,
    email: p.email,
    branch: p.branchName,
    batch: p.batchLabel,
    hostel: p.hostel?.hostelName ?? '—',
    hostelCode: p.hostel?.hostelCode ?? '',
    room: p.roomNumber,
    bed: p.bedNumber,
    block: p.blockName,
    bloodGroup: p.bloodGroup,
    dietaryPreference: p.dietaryPreference,
    disciplinaryPoints: p.disciplinaryPoints,
    docStatus: p.docVerificationStatus,
    residentStatus: p.residentStatus,
    enrollmentStatus: p.student.status,
    lastSyncedAt: p.lastSyncedAt ? formatDate(p.lastSyncedAt) : null,
    hasSevereAllergy: /severe|anaphylaxis|peanut|shellfish/i.test(p.allergies),
    guardianName: p.localGuardianName,
    guardianMobile: p.localGuardianMobile,
    academicYear: p.academicYear,
  };
}

export async function syncHostelStudentsFromErp(institutionId: string, academicYear = '2025-26') {
  const allotments = await prisma.hostelAllotment.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE', allotmentStatus: { in: ['PENDING', 'CONFIRMED'] } },
    include: {
      hostel: true,
      bed: { include: { room: { include: { floor: { include: { block: true } } } } } },
    },
  });

  let synced = 0;
  let created = 0;

  for (const a of allotments) {
    let student = a.studentId
      ? await prisma.student.findFirst({ where: { id: a.studentId, institutionId } })
      : null;

    if (!student) {
      student = await prisma.student.findFirst({
        where: { institutionId, admissionNumber: a.admissionNumber || undefined, academicYear, status: StudentStatus.ACTIVE },
      });
    }

    if (!student) {
      const [first, ...rest] = a.studentName.split(' ');
      student = await prisma.student.create({
        data: {
          institutionId,
          admissionNumber: a.admissionNumber || `ADM-HST-${Date.now().toString(36)}`,
          firstName: first || a.studentName,
          lastName: rest.join(' '),
          className: a.className || 'XII',
          sectionName: 'A',
          academicYear,
          gender: a.studentGender === 'FEMALE' ? 'FEMALE' : 'MALE',
          bloodGroup: ['A+', 'B+', 'O+', 'AB+'][synced % 4],
          mobile: `98${String(10000000 + synced).slice(-8)}`,
          email: `${first?.toLowerCase() ?? 'student'}@school.edu`,
          status: StudentStatus.ACTIVE,
        },
      });
    }

    if (student.status !== StudentStatus.ACTIVE) continue;

    const blockName = a.bed?.room.floor.block.blockName ?? '';
    const payload = {
      institutionId,
      studentId: student.id,
      hostelId: a.hostelId,
      allotmentId: a.id,
      photoUrl: student.photoUrl,
      mobile: student.mobile,
      email: student.email,
      branchName: BRANCHES[synced % BRANCHES.length],
      batchLabel: BATCHES[synced % BATCHES.length],
      roomNumber: a.roomNumber,
      bedNumber: a.bedNumber,
      blockName,
      bloodGroup: student.bloodGroup,
      isMinor: isMinor(student.dateOfBirth),
      lastSyncedAt: new Date(),
      academicYear,
      residentStatus: 'ACTIVE',
    };

    const existing = await prisma.hostelStudentProfile.findUnique({ where: { studentId: student.id } });
    if (existing) {
      await prisma.hostelStudentProfile.update({ where: { id: existing.id }, data: payload });
      synced += 1;
    } else {
      await prisma.hostelStudentProfile.create({ data: payload });
      created += 1;
    }

    if (a.studentId !== student.id) {
      await prisma.hostelAllotment.update({ where: { id: a.id }, data: { studentId: student.id } });
    }
  }

  await logActivity(institutionId, 'ERP_SYNC', `Synced ${synced + created} hostel student profiles from ERP`, { academicYear, synced, created });
  return { synced, created, total: synced + created, message: `ERP sync complete — ${synced + created} profiles updated` };
}

export async function getHostelStudents(
  institutionId: string,
  academicYear = '2025-26',
  filters: {
    q?: string;
    branch?: string;
    batch?: string;
    hostelId?: string;
    room?: string;
    docStatus?: string;
    userRole?: string;
  } = {},
) {
  const where: Prisma.HostelStudentProfileWhereInput = {
    institutionId,
    academicYear,
    residentStatus: 'ACTIVE',
    student: { status: StudentStatus.ACTIVE },
  };

  if (filters.branch && filters.branch !== 'ALL') where.branchName = filters.branch;
  if (filters.batch && filters.batch !== 'ALL') where.batchLabel = filters.batch;
  if (filters.hostelId && filters.hostelId !== 'ALL') where.hostelId = filters.hostelId;
  if (filters.room?.trim()) where.roomNumber = { contains: filters.room, mode: 'insensitive' };
  if (filters.docStatus && filters.docStatus !== 'ALL') where.docVerificationStatus = filters.docStatus;

  if (filters.q?.trim()) {
    where.OR = [
      { student: { firstName: { contains: filters.q, mode: 'insensitive' } } },
      { student: { lastName: { contains: filters.q, mode: 'insensitive' } } },
      { student: { admissionNumber: { contains: filters.q, mode: 'insensitive' } } },
      { localGuardianName: { contains: filters.q, mode: 'insensitive' } },
      { localGuardianMobile: { contains: filters.q, mode: 'insensitive' } },
      { roomNumber: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const [profiles, hostels, branches, batches, totalActive, verified, pendingDocs, allergyCount, pendingUpdates] = await Promise.all([
    prisma.hostelStudentProfile.findMany({
      where,
      include: { student: true, hostel: true },
      orderBy: { student: { firstName: 'asc' } },
      take: 100,
    }),
    prisma.hostelMaster.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { hostelName: 'asc' } }),
    prisma.hostelStudentProfile.findMany({ where: { institutionId, academicYear }, select: { branchName: true }, distinct: ['branchName'] }),
    prisma.hostelStudentProfile.findMany({ where: { institutionId, academicYear }, select: { batchLabel: true }, distinct: ['batchLabel'] }),
    prisma.hostelStudentProfile.count({ where: { institutionId, academicYear, residentStatus: 'ACTIVE' } }),
    prisma.hostelStudentProfile.count({ where: { institutionId, academicYear, docVerificationStatus: 'VERIFIED' } }),
    prisma.hostelStudentProfile.count({ where: { institutionId, academicYear, docVerificationStatus: 'PENDING' } }),
    prisma.hostelStudentProfile.count({
      where: {
        institutionId,
        academicYear,
        OR: [
          { allergies: { contains: 'severe', mode: 'insensitive' } },
          { allergies: { contains: 'anaphylaxis', mode: 'insensitive' } },
        ],
      },
    }),
    prisma.hostelStudentUpdateRequest.count({ where: { institutionId, status: 'PENDING' } }),
  ]);

  const rows = profiles.map(mapProfileRow);

  await logActivity(institutionId, 'VIEW_HOSTEL_STUDENTS', 'Hostel students directory accessed', { academicYear, ...filters }, filters.userRole ?? 'Admin');

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    hostels: hostels.map((h) => ({ id: h.id, name: h.hostelName, code: h.hostelCode })),
    branches: ['ALL', ...branches.map((b) => b.branchName).filter(Boolean)],
    batches: ['ALL', ...batches.map((b) => b.batchLabel).filter(Boolean)],
    docStatuses: ['ALL', 'PENDING', 'VERIFIED', 'REJECTED'],
    dietaryOptions: DIETARY,
    kpis: {
      totalResidents: totalActive,
      verifiedDocs: verified,
      pendingDocs,
      severeAllergyCases: allergyCount,
      pendingUpdateRequests: pendingUpdates,
    },
    students: rows,
    permissions: rolePermissions(filters.userRole ?? 'Admin'),
    reports: ['Hostel Directory', 'Local Guardian Register', 'Medical Emergency Contact List'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    automationRules: ['Daily auto-sync of photo and contact from Core ERP', 'Warden alert on severe allergy allotment to block'],
    erpIntegration: ['Student Management — core demographics', 'Medical Room — health records & medications'],
    lastSyncNote: 'Profile picture and contact details sync daily from Core ERP',
  };
}

function rolePermissions(role: string) {
  if (role === 'Admin' || role === 'Hostel Administrator' || role === 'Warden') {
    return { canEdit: true, canVerifyDocs: role !== 'Warden', canExport: true, canRequestUpdate: false };
  }
  return { canEdit: false, canVerifyDocs: false, canExport: false, canRequestUpdate: true };
}

export async function getHostelStudentDetail(institutionId: string, profileId: string) {
  const profile = await prisma.hostelStudentProfile.findFirst({
    where: { id: profileId, institutionId },
    include: {
      student: true,
      hostel: true,
      documents: { orderBy: { createdAt: 'desc' } },
      updateRequests: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!profile) throw new Error('Hostel student profile not found');

  const roommates = profile.roomNumber
    ? await prisma.hostelStudentProfile.findMany({
      where: {
        institutionId,
        hostelId: profile.hostelId ?? undefined,
        roomNumber: profile.roomNumber,
        academicYear: profile.academicYear,
        NOT: { id: profile.id },
      },
      include: { student: true },
      take: 6,
    })
    : [];

  const warden = profile.hostelId
    ? await prisma.hostelStaff.findFirst({
      where: { institutionId, hostelId: profile.hostelId, role: 'WARDEN', status: 'ACTIVE' },
    })
    : null;

  return {
    ...mapProfileRow({ ...profile, student: profile.student, hostel: profile.hostel }),
    dateOfBirth: profile.student.dateOfBirth ? formatDate(profile.student.dateOfBirth) : '',
    isMinor: profile.isMinor,
    fatherName: profile.student.fatherName,
    fatherMobile: profile.student.fatherMobile,
    motherName: profile.student.motherName,
    motherMobile: profile.student.motherMobile,
    address: profile.student.address,
    localGuardian: {
      name: profile.localGuardianName,
      mobile: profile.localGuardianMobile,
      relation: profile.localGuardianRelation,
      address: profile.localGuardianAddress,
      idType: profile.localGuardianIdType,
      idMasked: decryptPiiDisplay(profile.localGuardianIdEncrypted),
    },
    medical: {
      restrictions: profile.medicalRestrictions,
      allergies: profile.allergies,
      currentMedications: profile.currentMedications,
      bloodGroup: profile.bloodGroup || profile.student.bloodGroup,
    },
    dietaryPreference: profile.dietaryPreference,
    disciplinaryPoints: profile.disciplinaryPoints,
    docVerificationStatus: profile.docVerificationStatus,
    documents: profile.documents.map((d) => ({
      id: d.id,
      docType: d.docType,
      fileName: d.fileName,
      verificationStatus: d.verificationStatus,
      verifiedBy: d.verifiedBy,
      verifiedAt: d.verifiedAt ? formatDate(d.verifiedAt) : null,
    })),
    pendingUpdateRequests: profile.updateRequests.map((r) => ({
      id: r.id,
      requestedBy: r.requestedBy,
      fieldChanges: r.fieldChanges,
      createdAt: formatDate(r.createdAt),
    })),
    roommates: roommates.map((r) => ({
      name: `${r.student.firstName} ${r.student.lastName}`.trim(),
      bed: r.bedNumber,
    })),
    warden: warden ? { name: warden.staffName, mobile: warden.mobile } : null,
    allotmentId: profile.allotmentId,
  };
}

export async function updateHostelStudentProfile(
  institutionId: string,
  profileId: string,
  body: Record<string, unknown>,
  performedBy = 'Hostel Admin',
) {
  const profile = await prisma.hostelStudentProfile.findFirst({ where: { id: profileId, institutionId } });
  if (!profile) throw new Error('Profile not found');

  const data: Prisma.HostelStudentProfileUpdateInput = {};
  const contactFields = ['localGuardianName', 'localGuardianMobile', 'localGuardianRelation', 'localGuardianAddress'];
  let contactChanged = false;

  if (body.localGuardianName !== undefined) { data.localGuardianName = String(body.localGuardianName); contactChanged = true; }
  if (body.localGuardianMobile !== undefined) { data.localGuardianMobile = String(body.localGuardianMobile); contactChanged = true; }
  if (body.localGuardianRelation !== undefined) data.localGuardianRelation = String(body.localGuardianRelation);
  if (body.localGuardianAddress !== undefined) data.localGuardianAddress = String(body.localGuardianAddress);
  if (body.localGuardianIdType !== undefined) data.localGuardianIdType = String(body.localGuardianIdType);
  if (body.localGuardianIdNumber !== undefined) {
    data.localGuardianIdEncrypted = encryptPii(String(body.localGuardianIdNumber));
    contactChanged = true;
  }
  if (body.dietaryPreference !== undefined) data.dietaryPreference = String(body.dietaryPreference);
  if (body.medicalRestrictions !== undefined) data.medicalRestrictions = String(body.medicalRestrictions);
  if (body.allergies !== undefined) data.allergies = String(body.allergies);
  if (body.currentMedications !== undefined) data.currentMedications = String(body.currentMedications);
  if (body.bloodGroup !== undefined) data.bloodGroup = String(body.bloodGroup);
  if (body.disciplinaryPoints !== undefined) data.disciplinaryPoints = Number(body.disciplinaryPoints);
  if (body.isMinor !== undefined) data.isMinor = Boolean(body.isMinor);

  if (profile.isMinor && !data.localGuardianName && !profile.localGuardianName && body.localGuardianName === undefined) {
    throw new Error('Local Guardian Name is mandatory for minor students');
  }

  const updated = await prisma.hostelStudentProfile.update({ where: { id: profileId }, data });

  if (contactChanged) {
    await logActivity(
      institutionId,
      'EMERGENCY_CONTACT_CHANGE',
      `Emergency contact updated for profile ${profileId}`,
      { profileId, fields: contactFields.filter((f) => body[f] !== undefined) },
      performedBy,
    );
  }

  if (updated.allergies && /severe|anaphylaxis/i.test(updated.allergies) && updated.blockName) {
    await logActivity(
      institutionId,
      'ALLERGY_WARDEN_ALERT',
      `Warden alerted: student with severe allergies allotted to ${updated.blockName}`,
      { profileId, block: updated.blockName, allergies: updated.allergies },
      'System',
    );
  }

  return getHostelStudentDetail(institutionId, profileId);
}

export async function createProfileUpdateRequest(
  institutionId: string,
  profileId: string,
  fieldChanges: Record<string, unknown>,
  requestedBy = 'Parent',
) {
  const profile = await prisma.hostelStudentProfile.findFirst({ where: { id: profileId, institutionId } });
  if (!profile) throw new Error('Profile not found');

  const row = await prisma.hostelStudentUpdateRequest.create({
    data: {
      institutionId,
      profileId,
      requestedBy,
      fieldChanges: fieldChanges as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  });

  return { success: true, request: row, message: 'Profile update request submitted for admin verification' };
}

export async function reviewProfileUpdateRequest(
  institutionId: string,
  requestId: string,
  action: 'APPROVE' | 'REJECT',
  reviewedBy = 'Hostel Admin',
  rejectionReason = '',
) {
  const request = await prisma.hostelStudentUpdateRequest.findFirst({
    where: { id: requestId, institutionId },
  });
  if (!request || request.status !== 'PENDING') throw new Error('Request not found or already processed');

  if (action === 'REJECT') {
    await prisma.hostelStudentUpdateRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', reviewedBy, rejectionReason },
    });
    return { success: true, message: 'Update request rejected' };
  }

  const changes = request.fieldChanges as Record<string, unknown>;
  await updateHostelStudentProfile(institutionId, request.profileId, changes, reviewedBy);
  await prisma.hostelStudentUpdateRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED', reviewedBy },
  });
  return { success: true, message: 'Update request approved and applied' };
}

export async function verifyHostelStudentDocument(
  institutionId: string,
  documentId: string,
  status: 'VERIFIED' | 'REJECTED',
  verifiedBy = 'Hostel Admin',
) {
  const doc = await prisma.hostelStudentDocument.findFirst({
    where: { id: documentId, institutionId },
    include: { profile: true },
  });
  if (!doc) throw new Error('Document not found');

  await prisma.hostelStudentDocument.update({
    where: { id: documentId },
    data: { verificationStatus: status, verifiedBy, verifiedAt: new Date() },
  });

  const pending = await prisma.hostelStudentDocument.count({
    where: { profileId: doc.profileId, verificationStatus: 'PENDING' },
  });

  if (pending === 0 && status === 'VERIFIED') {
    await prisma.hostelStudentProfile.update({
      where: { id: doc.profileId },
      data: { docVerificationStatus: 'VERIFIED' },
    });
  } else if (status === 'REJECTED') {
    await prisma.hostelStudentProfile.update({
      where: { id: doc.profileId },
      data: { docVerificationStatus: 'REJECTED' },
    });
  }

  await logActivity(institutionId, 'DOC_VERIFICATION', `Document ${doc.fileName} marked ${status}`, { documentId }, verifiedBy);
  return { success: true, message: `Document ${status.toLowerCase()}` };
}

export async function exportHostelStudentsReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Hostel Directory',
) {
  const data = await getHostelStudents(institutionId, academicYear);
  const fileName = `hostel_students_${reportType.replace(/\s/g, '_').toLowerCase()}_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_STUDENTS', `Exported ${reportType} as ${format}`, { academicYear, reportType, format });
  return { success: true, format, fileName, message: `${reportType} exported as ${format}`, snapshot: data };
}

export async function seedHostelStudents(institutionId: string) {
  await seedRoomsAllotment(institutionId);

  const existing = await prisma.hostelStudentProfile.count({ where: { institutionId } });
  if (existing >= 10) {
    await syncHostelStudentsFromErp(institutionId);
    return getHostelStudents(institutionId);
  }

  await syncHostelStudentsFromErp(institutionId);

  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId },
    include: { student: true },
    take: 30,
  });

  const guardians = [
    ['Rajesh Kumar', '9876543210', 'Uncle', '12 MG Road, Pune'],
    ['Sunita Devi', '9876543211', 'Aunt', '45 Civil Lines, Delhi'],
    ['Mohammed Ali', '9876543212', 'Guardian', '78 Park Street, Kolkata'],
    ['Lakshmi Iyer', '9876543213', 'Grandmother', '23 Anna Salai, Chennai'],
  ];

  for (let i = 0; i < profiles.length; i += 1) {
    const p = profiles[i];
    const [gName, gMobile, gRel, gAddr] = guardians[i % guardians.length];
    const allergies = i === 2 ? 'Severe peanut allergy — anaphylaxis risk' : i === 5 ? 'Shellfish — severe reaction' : i % 4 === 0 ? 'Dust mites' : '';

    await prisma.hostelStudentProfile.update({
      where: { id: p.id },
      data: {
        localGuardianName: gName,
        localGuardianMobile: gMobile,
        localGuardianRelation: gRel,
        localGuardianAddress: gAddr,
        localGuardianIdType: 'AADHAAR',
        localGuardianIdEncrypted: encryptPii(`1234${5678 + i}${9012 + i}`),
        isMinor: isMinor(p.student.dateOfBirth) || i % 7 === 0,
        dietaryPreference: DIETARY[i % DIETARY.length],
        medicalRestrictions: i % 3 === 0 ? 'No strenuous exercise' : '',
        allergies,
        currentMedications: i % 5 === 0 ? 'Inhaler (as needed)' : '',
        disciplinaryPoints: i % 9 === 0 ? 2 : 0,
        docVerificationStatus: i % 3 === 0 ? 'VERIFIED' : 'PENDING',
      },
    });

    await prisma.hostelStudentDocument.create({
      data: {
        institutionId,
        profileId: p.id,
        docType: 'GUARDIAN_ID',
        fileName: `guardian_id_${p.student.admissionNumber}.pdf`,
        encryptedRef: encryptPii(`DOC-REF-${p.id}`),
        verificationStatus: i % 3 === 0 ? 'VERIFIED' : 'PENDING',
        verifiedBy: i % 3 === 0 ? 'Hostel Admin' : '',
        verifiedAt: i % 3 === 0 ? new Date() : null,
      },
    });

    if (i % 4 === 0) {
      await prisma.hostelStudentDocument.create({
        data: {
          institutionId,
          profileId: p.id,
          docType: 'MEDICAL_CERT',
          fileName: `medical_cert_${p.student.admissionNumber}.pdf`,
          verificationStatus: 'PENDING',
        },
      });
    }
  }

  if (profiles[0]) {
    await createProfileUpdateRequest(
      institutionId,
      profiles[0].id,
      { localGuardianMobile: '9999888877' },
      'Parent',
    );
  }

  await logActivity(institutionId, 'SEED_STUDENTS', 'Hostel students demo data seeded');
  return getHostelStudents(institutionId);
}
