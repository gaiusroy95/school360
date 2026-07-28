import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

const STAFF_ROLES = [
  { value: 'WARDEN', label: 'Warden' },
  { value: 'ASSISTANT_WARDEN', label: 'Assistant Warden' },
  { value: 'HOUSEKEEPING', label: 'Housekeeping' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'MESS', label: 'Mess Staff' },
  { value: 'LAUNDRY', label: 'Laundry Staff' },
  { value: 'TECHNICIAN', label: 'Technician' },
];

export async function getHostelStaffManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { hostelId?: string; role?: string; status?: string } = {},
) {
  const where: { institutionId: string; hostelId?: string; role?: string; status?: string } = { institutionId };
  if (filters.hostelId && filters.hostelId !== 'ALL') where.hostelId = filters.hostelId;
  if (filters.role && filters.role !== 'ALL') where.role = filters.role;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;

  const [staff, hostels, allStaff] = await Promise.all([
    prisma.hostelStaff.findMany({
      where,
      include: { hostel: true },
      orderBy: [{ role: 'asc' }, { staffName: 'asc' }],
    }),
    prisma.hostelMaster.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: { hostelName: 'asc' },
    }),
    prisma.hostelStaff.findMany({ where: { institutionId } }),
  ]);

  const active = allStaff.filter((s) => s.status === 'ACTIVE');
  const wardens = active.filter((s) => s.role === 'WARDEN' || s.role === 'ASSISTANT_WARDEN');

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    roles: STAFF_ROLES,
    hostels: hostels.map((h) => ({ id: h.id, name: h.hostelName })),
    kpis: {
      totalStaff: active.length,
      wardens: wardens.length,
      onDuty: active.length,
      inactive: allStaff.filter((s) => s.status !== 'ACTIVE').length,
      unassigned: active.filter((s) => !s.hostelId).length,
    },
    staff: staff.map((s) => ({
      id: s.id,
      staffName: s.staffName,
      role: s.role,
      roleLabel: STAFF_ROLES.find((r) => r.value === s.role)?.label ?? s.role,
      mobile: s.mobile,
      status: s.status,
      hostelId: s.hostelId,
      hostelName: s.hostel?.hostelName ?? '—',
      createdAt: s.createdAt.toISOString(),
    })),
    permissions: { canManage: true, canAssign: true },
  };
}

export async function createHostelStaff(
  institutionId: string,
  body: { staffName: string; role?: string; mobile?: string; hostelId?: string; status?: string },
) {
  if (!body.staffName?.trim()) throw new Error('Staff name is required.');

  const staff = await prisma.hostelStaff.create({
    data: {
      institutionId,
      staffName: body.staffName.trim(),
      role: body.role ?? 'WARDEN',
      mobile: body.mobile ?? '',
      hostelId: body.hostelId || null,
      status: body.status ?? 'ACTIVE',
    },
    include: { hostel: true },
  });

  return {
    message: `${staff.staffName} added as ${staff.role}`,
    staffId: staff.id,
    data: await getHostelStaffManagement(institutionId),
  };
}

export async function updateHostelStaff(
  institutionId: string,
  staffId: string,
  body: { staffName?: string; role?: string; mobile?: string; hostelId?: string | null; status?: string },
) {
  const existing = await prisma.hostelStaff.findFirst({ where: { id: staffId, institutionId } });
  if (!existing) throw new Error('Staff member not found.');

  await prisma.hostelStaff.update({
    where: { id: staffId },
    data: {
      ...(body.staffName != null ? { staffName: body.staffName.trim() } : {}),
      ...(body.role != null ? { role: body.role } : {}),
      ...(body.mobile != null ? { mobile: body.mobile } : {}),
      ...(body.hostelId !== undefined ? { hostelId: body.hostelId || null } : {}),
      ...(body.status != null ? { status: body.status } : {}),
    },
  });

  return {
    message: 'Staff record updated',
    data: await getHostelStaffManagement(institutionId),
  };
}

export async function seedHostelStaffManagement(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.hostelStaff.count({ where: { institutionId } });
  if (existing > 0) {
    return getHostelStaffManagement(institutionId, academicYear);
  }

  const hostels = await prisma.hostelMaster.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    take: 3,
  });

  const samples = [
    { staffName: 'Mr. Rajesh Kumar', role: 'WARDEN', mobile: '9876543210' },
    { staffName: 'Mrs. Priya Sharma', role: 'ASSISTANT_WARDEN', mobile: '9876543211' },
    { staffName: 'Mr. Suresh Patel', role: 'SECURITY', mobile: '9876543212' },
    { staffName: 'Ms. Anita Desai', role: 'HOUSEKEEPING', mobile: '9876543213' },
    { staffName: 'Mr. Vikram Singh', role: 'MESS', mobile: '9876543214' },
    { staffName: 'Mr. Ramesh Iyer', role: 'TECHNICIAN', mobile: '9876543215' },
  ];

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    await prisma.hostelStaff.create({
      data: {
        institutionId,
        staffName: sample.staffName,
        role: sample.role,
        mobile: sample.mobile,
        hostelId: hostels[i % Math.max(1, hostels.length)]?.id ?? null,
        status: 'ACTIVE',
      },
    });
  }

  return getHostelStaffManagement(institutionId, academicYear);
}
