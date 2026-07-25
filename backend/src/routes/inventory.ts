import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  exportInventoryDashboard,
  getInventoryDashboard,
  seedInventoryDashboard,
} from '../lib/inventoryDashboard.js';
import {
  approveInventoryItem,
  createInventoryItem,
  deleteInventoryItem,
  exportItemMasterReport,
  generateItemSku,
  getItemDetail,
  getItemsManagement,
  requestNewInventoryItem,
  seedItemsManagement,
  updateInventoryItem,
} from '../lib/inventoryItems.js';
import {
  createInvCategory,
  createInvUnit,
  createInvUnitConversion,
  deleteInvCategory,
  deleteInvUnit,
  deleteInvUnitConversion,
  getCategoriesUnits,
  moveInvCategory,
  seedCategoriesUnits,
  suggestInvCategoryCode,
  updateInvCategory,
  updateInvUnit,
  updateInvUnitConversion,
} from '../lib/inventoryCategoriesUnits.js';
import {
  approveGrn,
  createGrn,
  deleteGrn,
  exportGrnRegister,
  generateGrnNumber,
  getGrnDetail,
  getGrnManagement,
  markGrnBilled,
  seedGrnManagement,
  submitGrn,
  updateGrn,
} from '../lib/inventoryGrn.js';
import {
  checkoutStockOutward,
  exportOutwardRegister,
  getOutwardDetail,
  getStockOutwardManagement,
  lookupItemByBarcode,
  seedStockOutward,
} from '../lib/inventoryStockOutward.js';
import {
  createTransfer,
  deleteTransfer,
  dispatchTransfer,
  exportTransferRegister,
  generateTransferNumber,
  getTransferDetail,
  getTransferManagement,
  markTransferDispatched,
  receiveTransfer,
  seedTransferManagement,
  updateTransfer,
} from '../lib/inventoryTransfers.js';
import {
  addSupplierDocument,
  approveSupplier,
  createSupplier,
  deleteSupplier,
  deleteSupplierDocument,
  getSupplierDetail,
  getSupplierManagement,
  rejectSupplier,
  seedSupplierManagement,
  updateSupplier,
} from '../lib/inventorySuppliers.js';
import {
  approvePurchaseOrder,
  createPoFromIndent,
  createPurchaseOrder,
  deletePurchaseOrder,
  emailPurchaseOrderToVendor,
  generatePoNumber,
  getPurchaseOrderDetail,
  getPurchaseOrderManagement,
  rejectPurchaseOrder,
  seedPurchaseOrderManagement,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from '../lib/inventoryPurchaseOrders.js';
import {
  approveVariance,
  approveVendorBill,
  createVendorBill,
  deleteVendorBill,
  getVendorBillDetail,
  getVendorBillManagement,
  rejectVendorBill,
  runThreeWayMatch,
  seedVendorBillManagement,
  sendVendorBillToFinance,
  updateVendorBill,
} from '../lib/inventoryVendorBills.js';
import {
  approveStockAdjustment,
  createStockAdjustment,
  deleteStockAdjustment,
  generateAdjustmentNumber,
  getStockAdjustmentDetail,
  getStockAdjustmentManagement,
  rejectStockAdjustment,
  seedStockAdjustmentManagement,
  submitStockAdjustment,
  updateStockAdjustment,
} from '../lib/inventoryStockAdjustment.js';
import {
  deleteBarcode,
  generateBarcodes,
  generateLabelPdf,
  getBarcodeManagement,
  lookupBarcode,
  seedBarcodeManagement,
} from '../lib/inventoryBarcodes.js';
import {
  approveAuditVariances,
  cancelAuditSession,
  completeAuditSession,
  createAdjustmentsFromAudit,
  createAuditSession,
  freezeAuditSession,
  generateVarianceReport,
  getStockVerificationManagement,
  recordAuditCount,
  scanAuditItem,
  seedStockVerification,
} from '../lib/inventoryStockVerification.js';
import {
  createReorderPurchaseIndent,
  getReorderLevelManagement,
  runReorderScan,
  seedReorderLevel,
} from '../lib/inventoryReorderLevel.js';
import {
  exportInventoryReport,
  generateInventoryReport,
  getInventoryReportsAnalytics,
  seedInventoryReports,
} from '../lib/inventoryReportsAnalytics.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

inventoryRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedInventoryDashboard(institutionId);
    const data = await getInventoryDashboard(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      req.query.storeId && req.query.storeId !== 'ALL' ? String(req.query.storeId) : undefined,
      String(req.query.role ?? 'Inventory Manager'),
      String(req.query.performedBy ?? 'Inventory Manager'),
    );
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/dashboard/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, storeId, format, role } = req.body;
    const result = await exportInventoryDashboard(
      institutionId,
      academicYear ?? '2025-26',
      storeId && storeId !== 'ALL' ? storeId : undefined,
      format ?? 'PDF',
      role ?? 'Inventory Manager',
    );
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/items',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedItemsManagement(institutionId);
    const data = await getItemsManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        q: req.query.q ? String(req.query.q) : undefined,
        categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined,
        itemType: req.query.itemType ? String(req.query.itemType) : undefined,
        storeId: req.query.storeId ? String(req.query.storeId) : undefined,
        approvalStatus: req.query.approvalStatus ? String(req.query.approvalStatus) : undefined,
      },
      String(req.query.role ?? 'Inventory Manager'),
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/items/sku-preview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const sku = await generateItemSku(institutionId, String(req.query.categoryId));
    return res.json({ sku });
  }),
);

inventoryRouter.get(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getItemDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/items',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createInventoryItem(institutionId, req.body, req.body.role ?? 'Inventory Manager');
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateInventoryItem(institutionId, String(req.params.id), req.body, req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteInventoryItem(institutionId, String(req.params.id), req.body.role);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/items/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await approveInventoryItem(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/items/request',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await requestNewInventoryItem(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/items/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format } = req.body;
    const result = await exportItemMasterReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF');
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/categories-units',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedCategoriesUnits(institutionId);
    const data = await getCategoriesUnits(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      String(req.query.role ?? 'Inventory Manager'),
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/categories-units/code-suggest',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await suggestInvCategoryCode(
      institutionId,
      String(req.query.name ?? ''),
      req.query.parentId ? String(req.query.parentId) : null,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createInvCategory(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateInvCategory(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteInvCategory(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/categories/:id/move',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { parentId, sortOrder } = req.body;
    const data = await moveInvCategory(
      institutionId,
      String(req.params.id),
      parentId ?? null,
      sortOrder ?? 0,
    );
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/units',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createInvUnit(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/units/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateInvUnit(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/units/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteInvUnit(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/unit-conversions',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createInvUnitConversion(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/unit-conversions/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateInvUnitConversion(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/unit-conversions/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteInvUnitConversion(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/grn',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedGrnManagement(institutionId);
    const data = await getGrnManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        status: req.query.status ? String(req.query.status) : undefined,
        storeId: req.query.storeId ? String(req.query.storeId) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
      },
      String(req.query.role ?? 'Store Keeper'),
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/grn/number-preview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const grnNumber = await generateGrnNumber(institutionId);
    return res.json({ grnNumber });
  }),
);

inventoryRouter.get(
  '/grn/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getGrnDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/grn',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createGrn(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/grn/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateGrn(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/grn/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteGrn(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/grn/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await submitGrn(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/grn/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await approveGrn(
      institutionId,
      String(req.params.id),
      req.body.performedBy,
      req.body.overrideVariance,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/grn/:id/bill',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await markGrnBilled(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/grn/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format } = req.body;
    const result = await exportGrnRegister(institutionId, academicYear ?? '2025-26', format ?? 'PDF');
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/outward',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedStockOutward(institutionId);
    const data = await getStockOutwardManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        outwardType: req.query.outwardType ? String(req.query.outwardType) : undefined,
        storeId: req.query.storeId ? String(req.query.storeId) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
      },
      String(req.query.role ?? 'Store Keeper'),
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/outward/lookup',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const item = await lookupItemByBarcode(
      institutionId,
      String(req.query.code ?? ''),
      String(req.query.academicYear ?? '2025-26'),
    );
    return res.json(item);
  }),
);

inventoryRouter.get(
  '/outward/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getOutwardDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/outward/checkout',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await checkoutStockOutward(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/outward/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format } = req.body;
    const result = await exportOutwardRegister(institutionId, academicYear ?? '2025-26', format ?? 'PDF');
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/transfers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedTransferManagement(institutionId);
    const data = await getTransferManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        status: req.query.status ? String(req.query.status) : undefined,
        storeId: req.query.storeId ? String(req.query.storeId) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
      },
      String(req.query.role ?? 'Store Keeper'),
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/transfers/number-preview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const transferNumber = await generateTransferNumber(institutionId);
    return res.json({ transferNumber });
  }),
);

inventoryRouter.get(
  '/transfers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getTransferDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/transfers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createTransfer(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/transfers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateTransfer(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/transfers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteTransfer(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/transfers/:id/dispatch',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await markTransferDispatched(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/transfers/:id/receive',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await receiveTransfer(
      institutionId,
      String(req.params.id),
      req.body.performedBy,
      req.body.lines,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/transfers/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format } = req.body;
    const result = await exportTransferRegister(institutionId, academicYear ?? '2025-26', format ?? 'PDF');
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/suppliers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedSupplierManagement(institutionId);
    const data = await getSupplierManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        approvalStatus: req.query.approvalStatus ? String(req.query.approvalStatus) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
      },
      String(req.query.role ?? 'Inventory Manager'),
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/suppliers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getSupplierDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/suppliers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createSupplier(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/suppliers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateSupplier(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/suppliers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteSupplier(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/suppliers/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await approveSupplier(
      institutionId,
      String(req.params.id),
      req.body.performedBy,
      req.body.rating,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/suppliers/:id/reject',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await rejectSupplier(
      institutionId,
      String(req.params.id),
      req.body.reason,
      req.body.performedBy,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/suppliers/:id/documents',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await addSupplierDocument(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/suppliers/documents/:docId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteSupplierDocument(institutionId, String(req.params.docId));
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/purchase-orders',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedPurchaseOrderManagement(institutionId);
    const data = await getPurchaseOrderManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        status: req.query.status ? String(req.query.status) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
        supplierId: req.query.supplierId ? String(req.query.supplierId) : undefined,
      },
      String(req.query.role ?? 'Purchase Manager'),
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/purchase-orders/po-number-preview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const poNumber = await generatePoNumber(institutionId);
    return res.json({ poNumber });
  }),
);

inventoryRouter.get(
  '/purchase-orders/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getPurchaseOrderDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/purchase-orders',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createPurchaseOrder(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/purchase-orders/from-indent',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createPoFromIndent(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/purchase-orders/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updatePurchaseOrder(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/purchase-orders/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deletePurchaseOrder(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/purchase-orders/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await submitPurchaseOrder(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/purchase-orders/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await approvePurchaseOrder(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/purchase-orders/:id/reject',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await rejectPurchaseOrder(
      institutionId,
      String(req.params.id),
      req.body.reason,
      req.body.performedBy,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/purchase-orders/:id/email-vendor',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await emailPurchaseOrderToVendor(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/vendor-bills',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedVendorBillManagement(institutionId);
    const data = await getVendorBillManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        status: req.query.status ? String(req.query.status) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
        matchStatus: req.query.matchStatus ? String(req.query.matchStatus) : undefined,
      },
      String(req.query.role ?? 'Accountant'),
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/vendor-bills/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getVendorBillDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/vendor-bills',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createVendorBill(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/vendor-bills/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateVendorBill(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/vendor-bills/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteVendorBill(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/vendor-bills/:id/match',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await runThreeWayMatch(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/vendor-bills/:id/approve-variance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await approveVariance(
      institutionId,
      String(req.params.id),
      req.body.notes,
      req.body.performedBy,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/vendor-bills/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await approveVendorBill(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/vendor-bills/:id/send-to-finance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await sendVendorBillToFinance(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/vendor-bills/:id/reject',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await rejectVendorBill(
      institutionId,
      String(req.params.id),
      req.body.reason,
      req.body.performedBy,
    );
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/adjustments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedStockAdjustmentManagement(institutionId);
    const data = await getStockAdjustmentManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        status: req.query.status ? String(req.query.status) : undefined,
        reasonCode: req.query.reasonCode ? String(req.query.reasonCode) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
      },
      String(req.query.role ?? 'Inventory Manager'),
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/adjustments/number-preview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const adjustmentNumber = await generateAdjustmentNumber(institutionId);
    return res.json({ adjustmentNumber });
  }),
);

inventoryRouter.get(
  '/adjustments/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getStockAdjustmentDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/adjustments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createStockAdjustment(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.put(
  '/adjustments/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateStockAdjustment(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/adjustments/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteStockAdjustment(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/adjustments/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await submitStockAdjustment(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/adjustments/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await approveStockAdjustment(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/adjustments/:id/reject',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await rejectStockAdjustment(
      institutionId,
      String(req.params.id),
      req.body.reason,
      req.body.performedBy,
    );
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/barcodes',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedBarcodeManagement(institutionId);
    const data = await getBarcodeManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        codeType: req.query.codeType ? String(req.query.codeType) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
      },
    );
    return res.json(data);
  }),
);

inventoryRouter.get(
  '/barcodes/lookup/:code',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await lookupBarcode(
      institutionId,
      String(req.params.code),
      String(req.query.academicYear ?? '2025-26'),
    );
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/barcodes/generate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await generateBarcodes(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/barcodes/print',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await generateLabelPdf(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.delete(
  '/barcodes/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteBarcode(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/stock-verification',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedStockVerification(institutionId);
    const data = await getStockVerificationManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        sessionId: req.query.sessionId ? String(req.query.sessionId) : undefined,
        storeId: req.query.storeId ? String(req.query.storeId) : undefined,
      },
    );
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/stock-verification/sessions',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createAuditSession(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/stock-verification/sessions/:id/freeze',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await freezeAuditSession(
      institutionId,
      String(req.params.id),
      req.body.frozenBy,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/stock-verification/sessions/:id/scan',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await scanAuditItem(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/stock-verification/sessions/:id/count',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await recordAuditCount(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/stock-verification/sessions/:id/variance-report',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await generateVarianceReport(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/stock-verification/sessions/:id/approve-variances',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await approveAuditVariances(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/stock-verification/sessions/:id/create-adjustments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createAdjustmentsFromAudit(
      institutionId,
      String(req.params.id),
      req.body.performedBy,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/stock-verification/sessions/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await completeAuditSession(
      institutionId,
      String(req.params.id),
      req.body.performedBy,
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/stock-verification/sessions/:id/cancel',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await cancelAuditSession(
      institutionId,
      String(req.params.id),
      req.body.performedBy,
    );
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/reorder-level',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedReorderLevel(institutionId);
    const data = await getReorderLevelManagement(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        storeId: req.query.storeId ? String(req.query.storeId) : undefined,
        categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined,
        itemType: req.query.itemType ? String(req.query.itemType) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
      },
    );
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/reorder-level/scan',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await runReorderScan(
      institutionId,
      String(req.body.academicYear ?? req.query.academicYear ?? '2025-26'),
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/reorder-level/reorder',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createReorderPurchaseIndent(institutionId, req.body);
    return res.json(result);
  }),
);

inventoryRouter.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedInventoryReports(institutionId);
    const data = await getInventoryReportsAnalytics(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      String(req.query.role ?? 'Inventory Manager'),
    );
    return res.json(data);
  }),
);

inventoryRouter.post(
  '/reports/generate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await generateInventoryReport(
      institutionId,
      String(req.body.templateId),
      req.body.filters ?? {},
      String(req.body.userRole ?? 'Inventory Manager'),
    );
    return res.json(result);
  }),
);

inventoryRouter.post(
  '/reports/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await exportInventoryReport(
      institutionId,
      String(req.body.templateId),
      req.body.filters ?? {},
      req.body.format ?? 'CSV',
      String(req.body.userRole ?? 'Inventory Manager'),
    );
    return res.json(result);
  }),
);

