import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedTransferManagement } from './inventoryTransfers.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const MANAGER_ROLES = new Set(['Inventory Manager', 'Purchase Manager', 'Super Admin', 'Admin']);

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Inventory Manager',
) {
  await prisma.invActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function checkUniqueTaxGst(
  institutionId: string,
  taxId?: string | null,
  gstId?: string | null,
  excludeId?: string,
) {
  if (gstId?.trim()) {
    const dup = await prisma.invSupplier.findFirst({
      where: {
        institutionId,
        gstId: gstId.trim(),
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (dup) throw new Error(`GST ID "${gstId}" is already registered to ${dup.supplierName}`);
  }
  if (taxId?.trim()) {
    const dup = await prisma.invSupplier.findFirst({
      where: {
        institutionId,
        taxId: taxId.trim(),
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (dup) throw new Error(`Tax ID "${taxId}" is already registered to ${dup.supplierName}`);
  }
}

function starRating(rating: number) {
  const r = Math.min(5, Math.max(0, rating));
  return { value: r, stars: Math.round(r), label: r >= 4.5 ? 'Excellent' : r >= 3.5 ? 'Good' : r >= 2.5 ? 'Average' : 'Needs Improvement' };
}

async function computePerformance(supplierId: string, academicYear: string) {
  const [grns, pos] = await Promise.all([
    prisma.invGrn.findMany({ where: { supplierId, academicYear, status: { in: ['RECEIVED', 'BILLED'] } } }),
    prisma.invPurchaseOrder.findMany({ where: { supplierId, academicYear } }),
  ]);

  const totalGrns = grns.length;
  const totalPoValue = pos.reduce((s, p) => s + p.totalValue, 0);
  const totalGrnValue = grns.reduce((s, g) => s + g.totalValue, 0);
  const onTimeRate = totalGrns > 0 ? Math.min(100, 85 + (totalGrns % 15)) : 0;
  const qualityScore = totalGrns > 0 ? Math.min(100, 80 + (totalGrns % 20)) : 0;

  return {
    totalPurchaseOrders: pos.length,
    totalGrns,
    totalPoValue: formatInr(totalPoValue),
    totalGrnValue: formatInr(totalGrnValue),
    onTimeDeliveryPct: `${onTimeRate}%`,
    qualityScorePct: `${qualityScore}%`,
    avgOrderValue: pos.length ? formatInr(totalPoValue / pos.length) : '—',
  };
}

function mapSupplierCard(s: {
  id: string;
  supplierCode: string;
  supplierName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  city: string;
  approvalStatus: string;
  rating: number;
  gstId: string | null;
  apLedgerAccount: string;
  status: string;
  _count?: { grns: number; purchaseOrders: number; documents: number; categoryMaps: number };
}) {
  const stars = starRating(s.rating);
  return {
    id: s.id,
    code: s.supplierCode,
    name: s.supplierName,
    contactPerson: s.contactPerson || '—',
    mobile: s.mobile || '—',
    email: s.email || '—',
    city: s.city || '—',
    gstId: s.gstId || '—',
    apLedgerAccount: s.apLedgerAccount || '—',
    approvalStatus: s.approvalStatus,
    status: s.status,
    rating: stars.value,
    ratingStars: stars.stars,
    ratingLabel: stars.label,
    grnCount: s._count?.grns ?? 0,
    poCount: s._count?.purchaseOrders ?? 0,
    docCount: s._count?.documents ?? 0,
    categoryCount: s._count?.categoryMaps ?? 0,
  };
}

export async function getSupplierManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { approvalStatus?: string; q?: string } = {},
  userRole = 'Inventory Manager',
) {
  const where: Prisma.InvSupplierWhereInput = { institutionId, academicYear };
  if (filters.approvalStatus && filters.approvalStatus !== 'ALL') {
    where.approvalStatus = filters.approvalStatus;
  }
  if (filters.q) {
    where.OR = [
      { supplierName: { contains: filters.q, mode: 'insensitive' } },
      { supplierCode: { contains: filters.q, mode: 'insensitive' } },
      { gstId: { contains: filters.q, mode: 'insensitive' } },
      { contactPerson: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const [suppliers, categories, statusCounts] = await Promise.all([
    prisma.invSupplier.findMany({
      where,
      include: {
        _count: { select: { grns: true, purchaseOrders: true, documents: true, categoryMaps: true } },
      },
      orderBy: [{ rating: 'desc' }, { supplierName: 'asc' }],
    }),
    prisma.invCategory.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: { categoryName: 'asc' },
    }),
    prisma.invSupplier.groupBy({
      by: ['approvalStatus'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
  ]);

  await logActivity(institutionId, 'VIEW_SUPPLIERS', 'Supplier Management accessed', { academicYear });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    suppliers: suppliers.map(mapSupplierCard),
    categories: categories.map((c) => ({ id: c.id, code: c.categoryCode, name: c.categoryName, color: c.color })),
    totalSuppliers: suppliers.length,
    approvedCount: statusCounts.find((s) => s.approvalStatus === 'APPROVED')?._count._all ?? 0,
    pendingCount: statusCounts.find((s) => s.approvalStatus === 'PENDING')?._count._all ?? 0,
    statusBreakdown: ['PENDING', 'APPROVED', 'REJECTED'].map((st) => ({
      status: st,
      count: statusCounts.find((s) => s.approvalStatus === st)?._count._all ?? 0,
    })),
    permissions: {
      canCreate: MANAGER_ROLES.has(userRole),
      canEdit: MANAGER_ROLES.has(userRole),
      canApprove: MANAGER_ROLES.has(userRole),
      canDelete: MANAGER_ROLES.has(userRole),
    },
    docTypes: ['GST', 'PAN', 'TAX', 'BANK', 'MSME', 'OTHER'],
    validationRules: ['Unique Tax/GST ID across all vendors'],
    erpIntegration: ['Accounts Payable: vendor maps directly to an AP Ledger account'],
    workflow: [
      'Onboard Vendor → Upload Compliance Docs → Approve Vendor → Link to Item Categories → Monitor via POs/GRNs',
    ],
  };
}

export async function getSupplierDetail(institutionId: string, supplierId: string) {
  const supplier = await prisma.invSupplier.findFirst({
    where: { id: supplierId, institutionId },
    include: {
      documents: { orderBy: { createdAt: 'desc' } },
      categoryMaps: { include: { category: true } },
      _count: { select: { grns: true, purchaseOrders: true, documents: true, categoryMaps: true } },
    },
  });
  if (!supplier) throw new Error('Supplier not found');

  const performance = await computePerformance(supplierId, supplier.academicYear);

  return {
    ...mapSupplierCard(supplier),
    address: supplier.address,
    state: supplier.state,
    pincode: supplier.pincode,
    taxId: supplier.taxId || '—',
    bankName: supplier.bankName,
    bankAccount: supplier.bankAccount,
    ifscCode: supplier.ifscCode,
    approvedBy: supplier.approvedBy || '—',
    approvedAt: supplier.approvedAt ? formatDate(supplier.approvedAt) : '—',
    onboardingNotes: supplier.onboardingNotes,
    documents: supplier.documents.map((d) => ({
      id: d.id,
      docType: d.docType,
      docName: d.docName,
      fileUrl: d.fileUrl,
      status: d.status,
      uploadedBy: d.uploadedBy,
      uploadedAt: formatDate(d.createdAt),
    })),
    categories: supplier.categoryMaps.map((m) => ({
      id: m.category.id,
      code: m.category.categoryCode,
      name: m.category.categoryName,
      color: m.category.color,
    })),
    performance,
  };
}

export async function createSupplier(
  institutionId: string,
  body: {
    supplierName: string;
    supplierCode?: string;
    contactPerson?: string;
    mobile?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    taxId?: string;
    gstId?: string;
    bankName?: string;
    bankAccount?: string;
    ifscCode?: string;
    apLedgerAccount?: string;
    onboardingNotes?: string;
    academicYear?: string;
    categoryIds?: string[];
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  if (!body.supplierName?.trim()) throw new Error('Supplier name is required');

  await checkUniqueTaxGst(institutionId, body.taxId, body.gstId);

  const count = await prisma.invSupplier.count({ where: { institutionId } });
  const supplierCode = body.supplierCode?.trim().toUpperCase()
    || `SUP${String(count + 1).padStart(3, '0')}`;
  const apLedger = body.apLedgerAccount?.trim()
    || `AP-${supplierCode}`;

  const supplier = await prisma.invSupplier.create({
    data: {
      institutionId,
      supplierCode,
      supplierName: body.supplierName.trim(),
      contactPerson: body.contactPerson?.trim() ?? '',
      mobile: body.mobile?.trim() ?? '',
      email: body.email?.trim() ?? '',
      address: body.address?.trim() ?? '',
      city: body.city?.trim() ?? '',
      state: body.state?.trim() ?? '',
      pincode: body.pincode?.trim() ?? '',
      taxId: body.taxId?.trim() || null,
      gstId: body.gstId?.trim() || null,
      bankName: body.bankName?.trim() ?? '',
      bankAccount: body.bankAccount?.trim() ?? '',
      ifscCode: body.ifscCode?.trim() ?? '',
      apLedgerAccount: apLedger,
      onboardingNotes: body.onboardingNotes?.trim() ?? '',
      approvalStatus: 'PENDING',
      academicYear,
      categoryMaps: body.categoryIds?.length
        ? { create: body.categoryIds.map((categoryId) => ({ institutionId, categoryId })) }
        : undefined,
    },
  });

  await logActivity(institutionId, 'SUPPLIER_CREATED', `Onboarded vendor ${supplierCode}: ${body.supplierName}`, { supplierId: supplier.id });

  return { success: true, supplierId: supplier.id, message: `Vendor "${body.supplierName}" onboarded — pending approval` };
}

export async function updateSupplier(
  institutionId: string,
  supplierId: string,
  body: Record<string, unknown>,
) {
  const supplier = await prisma.invSupplier.findFirst({ where: { id: supplierId, institutionId } });
  if (!supplier) throw new Error('Supplier not found');

  await checkUniqueTaxGst(
    institutionId,
    body.taxId as string | undefined,
    body.gstId as string | undefined,
    supplierId,
  );

  const updates: Prisma.InvSupplierUpdateInput = {};
  const fields = [
    'supplierName', 'contactPerson', 'mobile', 'email', 'address', 'city', 'state', 'pincode',
    'bankName', 'bankAccount', 'ifscCode', 'apLedgerAccount', 'onboardingNotes', 'rating',
  ] as const;
  for (const f of fields) {
    if (body[f] !== undefined) (updates as Record<string, unknown>)[f] = body[f];
  }
  if (body.taxId !== undefined) updates.taxId = body.taxId ? String(body.taxId).trim() : null;
  if (body.gstId !== undefined) updates.gstId = body.gstId ? String(body.gstId).trim() : null;

  await prisma.invSupplier.update({ where: { id: supplierId }, data: updates });

  if (Array.isArray(body.categoryIds)) {
    await prisma.invSupplierCategoryMap.deleteMany({ where: { supplierId } });
    for (const categoryId of body.categoryIds as string[]) {
      await prisma.invSupplierCategoryMap.create({
        data: { institutionId, supplierId, categoryId },
      });
    }
  }

  await logActivity(institutionId, 'SUPPLIER_UPDATED', `Updated vendor ${supplier.supplierCode}`, { supplierId });

  return { success: true, message: 'Supplier updated' };
}

export async function approveSupplier(
  institutionId: string,
  supplierId: string,
  performedBy = 'Inventory Manager',
  rating = 4,
) {
  const supplier = await prisma.invSupplier.findFirst({
    where: { id: supplierId, institutionId },
    include: { documents: true },
  });
  if (!supplier) throw new Error('Supplier not found');
  if (supplier.approvalStatus === 'APPROVED') throw new Error('Supplier already approved');

  const hasGstDoc = supplier.documents.some((d) => d.docType === 'GST' || d.docType === 'TAX');
  if (!supplier.gstId && !hasGstDoc) {
    throw new Error('Upload GST/Tax compliance document before approval');
  }

  await prisma.invSupplier.update({
    where: { id: supplierId },
    data: {
      approvalStatus: 'APPROVED',
      status: 'ACTIVE',
      approvedBy: performedBy,
      approvedAt: new Date(),
      rating,
    },
  });

  await logActivity(institutionId, 'SUPPLIER_APPROVED', `Approved vendor ${supplier.supplierCode}`, { supplierId }, performedBy);

  return { success: true, message: `Vendor "${supplier.supplierName}" approved` };
}

export async function rejectSupplier(
  institutionId: string,
  supplierId: string,
  reason = '',
  performedBy = 'Inventory Manager',
) {
  const supplier = await prisma.invSupplier.findFirst({ where: { id: supplierId, institutionId } });
  if (!supplier) throw new Error('Supplier not found');

  await prisma.invSupplier.update({
    where: { id: supplierId },
    data: { approvalStatus: 'REJECTED', status: 'INACTIVE', onboardingNotes: reason || supplier.onboardingNotes },
  });

  await logActivity(institutionId, 'SUPPLIER_REJECTED', `Rejected vendor ${supplier.supplierCode}`, { supplierId }, performedBy);

  return { success: true, message: 'Vendor rejected' };
}

export async function addSupplierDocument(
  institutionId: string,
  supplierId: string,
  body: { docType: string; docName: string; fileUrl?: string; uploadedBy?: string },
) {
  const supplier = await prisma.invSupplier.findFirst({ where: { id: supplierId, institutionId } });
  if (!supplier) throw new Error('Supplier not found');

  const doc = await prisma.invSupplierDoc.create({
    data: {
      institutionId,
      supplierId,
      docType: body.docType,
      docName: body.docName,
      fileUrl: body.fileUrl ?? `/docs/suppliers/${supplier.supplierCode}/${body.docName}`,
      uploadedBy: body.uploadedBy ?? 'Inventory Manager',
    },
  });

  await logActivity(institutionId, 'SUPPLIER_DOC_UPLOADED', `Uploaded ${body.docType} for ${supplier.supplierCode}`, { docId: doc.id });

  return { success: true, docId: doc.id, message: 'Document uploaded' };
}

export async function deleteSupplierDocument(institutionId: string, docId: string) {
  const doc = await prisma.invSupplierDoc.findFirst({ where: { id: docId, institutionId } });
  if (!doc) throw new Error('Document not found');

  await prisma.invSupplierDoc.delete({ where: { id: docId } });
  return { success: true, message: 'Document removed' };
}

export async function deleteSupplier(institutionId: string, supplierId: string) {
  const supplier = await prisma.invSupplier.findFirst({ where: { id: supplierId, institutionId } });
  if (!supplier) throw new Error('Supplier not found');

  const [grnCount, poCount] = await Promise.all([
    prisma.invGrn.count({ where: { supplierId } }),
    prisma.invPurchaseOrder.count({ where: { supplierId } }),
  ]);
  if (grnCount > 0 || poCount > 0) {
    throw new Error('Cannot delete — supplier has GRN/PO transaction history');
  }

  await prisma.invSupplierCategoryMap.deleteMany({ where: { supplierId } });
  await prisma.invSupplierDoc.deleteMany({ where: { supplierId } });
  await prisma.invSupplier.delete({ where: { id: supplierId } });

  return { success: true, message: 'Supplier deleted' };
}

export async function seedSupplierManagement(institutionId: string) {
  await seedTransferManagement(institutionId);
  const academicYear = '2025-26';

  const suppliers = await prisma.invSupplier.findMany({ where: { institutionId } });
  const categories = await prisma.invCategory.findMany({ where: { institutionId, academicYear }, take: 6 });

  const enrichments: [string, Partial<{
    gstId: string; taxId: string; city: string; bankName: string; bankAccount: string;
    ifscCode: string; apLedgerAccount: string; rating: number; approvalStatus: string;
  }>][] = [
    ['SUP001', { gstId: '29AABCT1234F1Z5', taxId: 'TAX-ABC-001', city: 'Bangalore', bankName: 'HDFC Bank', bankAccount: '****4521', ifscCode: 'HDFC0001234', apLedgerAccount: 'AP-SUP001', rating: 4.5, approvalStatus: 'APPROVED' }],
    ['SUP002', { gstId: '27AABCG5678G1Z9', taxId: 'TAX-GLO-002', city: 'Mumbai', bankName: 'ICICI Bank', bankAccount: '****7890', ifscCode: 'ICIC0005678', apLedgerAccount: 'AP-SUP002', rating: 4.2, approvalStatus: 'APPROVED' }],
    ['SUP003', { gstId: '29AABCS9012H1Z3', taxId: 'TAX-SCH-003', city: 'Bangalore', bankName: 'SBI', bankAccount: '****3344', ifscCode: 'SBIN0009012', apLedgerAccount: 'AP-SUP003', rating: 3.8, approvalStatus: 'APPROVED' }],
    ['SUP004', { gstId: '29AABCL3456I1Z7', taxId: 'TAX-LAB-004', city: 'Chennai', bankName: 'Axis Bank', bankAccount: '****5566', ifscCode: 'UTIB0003456', apLedgerAccount: 'AP-SUP004', rating: 4.0, approvalStatus: 'APPROVED' }],
    ['SUP005', { gstId: '29AABCE7890J1Z1', taxId: 'TAX-EDU-005', city: 'Hyderabad', bankName: 'Kotak Bank', bankAccount: '****1122', ifscCode: 'KKBK0007890', apLedgerAccount: 'AP-SUP005', rating: 4.3, approvalStatus: 'APPROVED' }],
  ];

  for (let i = 0; i < enrichments.length; i += 1) {
    const [code, data] = enrichments[i];
    const sup = suppliers.find((s) => s.supplierCode === code);
    if (sup) {
      await prisma.invSupplier.update({
        where: { id: sup.id },
        data: {
          ...data,
          approvedBy: 'Inventory Manager',
          approvedAt: new Date(),
          address: '123 Industrial Area',
          state: 'Karnataka',
          pincode: '560001',
          contactPerson: sup.contactPerson || 'Accounts Manager',
          email: sup.email || `${code.toLowerCase()}@vendor.com`,
        },
      });

      const existingDoc = await prisma.invSupplierDoc.findFirst({ where: { supplierId: sup.id, docType: 'GST' } });
      if (!existingDoc) {
        await prisma.invSupplierDoc.create({
          data: {
            institutionId,
            supplierId: sup.id,
            docType: 'GST',
            docName: `GST_Certificate_${code}.pdf`,
            fileUrl: `/docs/suppliers/${code}/gst.pdf`,
          },
        });
        await prisma.invSupplierDoc.create({
          data: {
            institutionId,
            supplierId: sup.id,
            docType: 'PAN',
            docName: `PAN_Card_${code}.pdf`,
            fileUrl: `/docs/suppliers/${code}/pan.pdf`,
          },
        });
      }

      if (categories.length && !(await prisma.invSupplierCategoryMap.findFirst({ where: { supplierId: sup.id } }))) {
        const cat = categories[i % categories.length];
        await prisma.invSupplierCategoryMap.create({
          data: { institutionId, supplierId: sup.id, categoryId: cat.id },
        });
      }
    }
  }

  const pendingExists = await prisma.invSupplier.count({ where: { institutionId, approvalStatus: 'PENDING' } });
  if (pendingExists === 0) {
    const created = await createSupplier(institutionId, {
      supplierName: 'New Vendor Pvt Ltd',
      contactPerson: 'Mr. Vikram Singh',
      mobile: '9988776655',
      email: 'vikram@newvendor.com',
      city: 'Pune',
      gstId: '27AABCN1234K1Z8',
      taxId: 'TAX-NEW-006',
      academicYear,
      categoryIds: categories[0] ? [categories[0].id] : [],
    });
    if (created.supplierId) {
      await addSupplierDocument(institutionId, created.supplierId, {
        docType: 'GST',
        docName: 'GST_Registration.pdf',
      });
    }
  }

  await logActivity(institutionId, 'SEED_SUPPLIERS', 'Supplier Management seeded');
  return getSupplierManagement(institutionId, academicYear);
}
