import { api } from './api';

function qs(params?: Record<string, string | undefined>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type InventoryDashboard = {
  academicYear: string;
  academicYears: string[];
  stores: { id: string; code: string; name: string; accessible: boolean }[];
  selectedStoreId: string;
  userRole: string;
  cacheRefreshMins: number;
  lastCacheRefresh: string | null;
  showFinancials: boolean;
  kpis: {
    totalItems: { value: number; subtitle: string };
    totalStockValue: { value: string; subtitle: string; hidden?: boolean };
    lowStockItems: { value: number; subtitle: string; alert?: boolean };
    outOfStockItems: { value: number; subtitle: string; alert?: boolean };
    stockInHand: { value: number; subtitle: string };
    pendingOrders: { value: number; subtitle: string };
  };
  stockOverview: { name: string; value: number; color: string; percent: string }[];
  stockTrend: { day: string; inward: number; outward: number; value: number }[];
  categoryWiseStock: { name: string; value: number; color: string; percent: string }[];
  topLowStock: { name: string; stock: string; reorder: string; store: string }[];
  recentGrn: { grn: string; date: string; supplier: string; items: number; value: string; status: string }[];
  topByValue: { name: string; category: string; value: string }[];
  topByUsage: { name: string; issued: number; unit: string }[];
  stockMovement: {
    inwardQty: number;
    outwardQty: number;
    transfers: number;
    adjustments: number;
    inwardValue: string;
    outwardValue: string;
    netMovement: string;
  };
  stockStatus: {
    goodStock: { count: number; pct: string };
    lowStock: { count: number; pct: string };
    outOfStock: { count: number; pct: string };
    inTransit: { count: number; pct: string };
  };
  alerts: { text: string; date: string; type: string; severity: string }[];
  storeSummary: { id: string; name: string; value: string; items: number; accessible: boolean }[];
  quickActions: { label: string; target: string }[];
  exportFormats: string[];
  automationRules: string[];
  erpIntegration: string[];
  materializedView: { name: string; refreshIntervalMins: number; lastRefreshed: string };
};

export async function fetchInventoryDashboard(
  seed?: boolean,
  academicYear?: string,
  storeId?: string,
  role?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, storeId, role };
  if (seed) params.seed = '1';
  return api<InventoryDashboard>(`/api/inventory/dashboard${qs(params)}`);
}

export async function exportInventoryDashboard(
  academicYear?: string,
  storeId?: string,
  format = 'PDF',
  role?: string,
) {
  return api<{ success: boolean; message: string }>('/api/inventory/dashboard/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, storeId, format, role }),
  });
}

export type ItemsManagement = {
  academicYear: string;
  academicYears: string[];
  totalItems: number;
  pendingRequests: number;
  items: {
    id: string;
    sku: string;
    name: string;
    brand: string;
    itemType: string;
    itemTypeLabel: string;
    category: string;
    store: string;
    baseUnit: string;
    currentStock: number;
    stockLabel: string;
    stockValue: string;
    barcode: string;
    thumbnailUrl: string;
    approvalStatus: string;
    stockStatus: string;
  }[];
  categories: { id: string; code: string; name: string; skuPrefix: string; color: string }[];
  stores: { id: string; code: string; name: string }[];
  units: { id: string; code: string; name: string }[];
  suppliers: { id: string; code: string; name: string }[];
  itemTypes: { value: string; label: string }[];
  valuationMethods: { value: string; label: string }[];
  typeBreakdown: { type: string; count: number }[];
  permissions: { canCreate: boolean; canEdit: boolean; canDelete: boolean; canApprove: boolean; canRequest: boolean };
  automationRules: string[];
  reports: string[];
  exportFormats: string[];
};

export type ItemDetail = ItemsManagement['items'][0] & {
  description: string;
  storeId: string;
  categoryId: string;
  unitId: string | null;
  defaultSupplierId: string | null;
  reorderLevel: number;
  minLevel: number;
  maxLevel: number;
  valuationMethod: string;
  weightedAvgCost: number;
  taxRate: number;
  color: string;
  size: string;
  hasTransactions: boolean;
  customFields: { id: string; key: string; label: string; value: string }[];
  auditTrail: { field: string; from: string; to: string; by: string; at: string }[];
};

export async function fetchItemsManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { q?: string; categoryId?: string; itemType?: string; storeId?: string; approvalStatus?: string },
) {
  const params: Record<string, string | undefined> = { academicYear, ...filters };
  if (seed) params.seed = '1';
  return api<ItemsManagement>(`/api/inventory/items${qs(params)}`);
}

export async function fetchItemDetail(itemId: string) {
  return api<ItemDetail>(`/api/inventory/items/${itemId}`);
}

export async function previewItemSku(categoryId: string) {
  return api<{ sku: string }>(`/api/inventory/items/sku-preview${qs({ categoryId })}`);
}

export async function createInventoryItem(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; sku?: string; barcode?: string }>('/api/inventory/items', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateInventoryItem(itemId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteInventoryItem(itemId: string, role = 'Super Admin') {
  return api<{ success: boolean; message: string }>(`/api/inventory/items/${itemId}`, {
    method: 'DELETE',
    body: JSON.stringify({ role }),
  });
}

export async function approveInventoryItem(itemId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/items/${itemId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Inventory Manager' }),
  });
}

export async function requestNewInventoryItem(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>('/api/inventory/items/request', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function exportItemMaster(academicYear?: string, format = 'PDF') {
  return api<{ success: boolean; message: string }>('/api/inventory/items/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format }),
  });
}

export type InvCategoryNode = {
  id: string;
  parentId: string | null;
  categoryCode: string;
  categoryName: string;
  skuPrefix: string;
  baseUnit: string;
  ledgerCode: string;
  description: string;
  color: string;
  sortOrder: number;
  itemCount: number;
  childCount: number;
  children: InvCategoryNode[];
};

export type CategoriesUnits = {
  academicYear: string;
  academicYears: string[];
  tree: InvCategoryNode[];
  flatCategories: InvCategoryNode[];
  totalCategories: number;
  totalUnits: number;
  totalConversions: number;
  units: { id: string; code: string; name: string; isBase: boolean; itemCount: number; typeLabel: string }[];
  conversions: {
    id: string;
    baseUnitId: string;
    baseUnitCode: string;
    baseUnitName: string;
    alternateUnitId: string;
    alternateUnitCode: string;
    alternateUnitName: string;
    conversionFactor: number;
    formula: string;
  }[];
  baseUnits: { id: string; code: string; name: string }[];
  alternateUnits: { id: string; code: string; name: string }[];
  permissions: { canCreate: boolean; canEdit: boolean; canDelete: boolean };
  automationRules: string[];
  validationRules: string[];
  workflow: string[];
};

export async function fetchCategoriesUnits(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<CategoriesUnits>(`/api/inventory/categories-units${qs(params)}`);
}

export async function suggestInvCategoryCode(name: string, parentId?: string) {
  return api<{ categoryCode: string; skuPrefix: string }>(
    `/api/inventory/categories-units/code-suggest${qs({ name, parentId })}`,
  );
}

export async function createInvCategory(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; categoryId?: string; categoryCode?: string }>(
    '/api/inventory/categories',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function updateInvCategory(categoryId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteInvCategory(categoryId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export async function moveInvCategory(categoryId: string, parentId: string | null, sortOrder = 0) {
  return api<CategoriesUnits>(`/api/inventory/categories/${categoryId}/move`, {
    method: 'POST',
    body: JSON.stringify({ parentId, sortOrder }),
  });
}

export async function createInvUnit(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>('/api/inventory/units', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateInvUnit(unitId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/units/${unitId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteInvUnit(unitId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/units/${unitId}`, {
    method: 'DELETE',
  });
}

export async function createInvUnitConversion(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>('/api/inventory/unit-conversions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateInvUnitConversion(conversionId: string, conversionFactor: number) {
  return api<{ success: boolean; message: string }>(`/api/inventory/unit-conversions/${conversionId}`, {
    method: 'PUT',
    body: JSON.stringify({ conversionFactor }),
  });
}

export async function deleteInvUnitConversion(conversionId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/unit-conversions/${conversionId}`, {
    method: 'DELETE',
  });
}

export type GrnManagement = {
  academicYear: string;
  academicYears: string[];
  grns: {
    id: string;
    grnNumber: string;
    date: string;
    challanNumber: string;
    billNumber: string;
    supplier: string;
    store: string;
    poNumber: string;
    items: number;
    value: string;
    status: string;
    statusLabel: string;
    hasVariance: boolean;
    varianceApproved: boolean;
    apQueued: boolean;
  }[];
  pendingPos: {
    id: string;
    poNumber: string;
    poDate: string;
    supplierId: string | null;
    supplier: string;
    storeId: string;
    totalValue: string;
    status: string;
    pendingQty: number;
    lines: {
      id: string;
      itemId: string;
      sku: string;
      itemName: string;
      unit: string;
      itemType: string;
      orderedQty: number;
      receivedQty: number;
      pendingQty: number;
      unitCost: number;
    }[];
  }[];
  stores: { id: string; code: string; name: string }[];
  suppliers: { id: string; code: string; name: string }[];
  statusBreakdown: { status: string; label: string; count: number }[];
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canSubmit: boolean;
    canApprove: boolean;
    canView: boolean;
    canViewFinancials: boolean;
    canPrintBarcode: boolean;
    canMarkBilled: boolean;
  };
  stateMachine: string[];
  automationRules: string[];
  validationRules: string[];
  reports: string[];
  erpIntegration: string[];
};

export type GrnDetail = GrnManagement['grns'][0] & {
  storeId: string;
  supplierId: string | null;
  purchaseOrderId: string | null;
  qualityNotes: string;
  grnDate: string;
  lines: {
    id: string;
    itemId: string;
    poLineId: string | null;
    sku: string;
    itemName: string;
    unit: string;
    itemType: string;
    requiresExpiry: boolean;
    orderedQty: number;
    pendingQty: number;
    receivedQty: number;
    unitCost: number;
    batchNo: string;
    manufacturingDate: string;
    expiryDate: string;
    overReceipt: boolean;
    varianceOverride: boolean;
  }[];
  batches: { id: string; batchNo: string; quantity: number; expiryDate: string }[];
  ledger: { referenceNo: string; quantityIn: number; unitCost: number; balanceQty: number; date: string }[];
};

export async function fetchGrnManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { status?: string; storeId?: string; q?: string },
  role?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, role, ...filters };
  if (seed) params.seed = '1';
  return api<GrnManagement>(`/api/inventory/grn${qs(params)}`);
}

export async function fetchGrnDetail(grnId: string) {
  return api<GrnDetail>(`/api/inventory/grn/${grnId}`);
}

export async function previewGrnNumber() {
  return api<{ grnNumber: string }>('/api/inventory/grn/number-preview');
}

export async function createGrn(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; grnId?: string; grnNumber?: string }>('/api/inventory/grn', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateGrn(grnId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/grn/${grnId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteGrn(grnId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/grn/${grnId}`, {
    method: 'DELETE',
  });
}

export async function submitGrn(grnId: string) {
  return api<{ success: boolean; message: string; status?: string }>(`/api/inventory/grn/${grnId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Store Keeper' }),
  });
}

export async function approveGrn(grnId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/grn/${grnId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Inventory Manager', overrideVariance: true }),
  });
}

export async function markGrnBilled(grnId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/grn/${grnId}/bill`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Accountant' }),
  });
}

export async function exportGrnRegister(academicYear?: string, format = 'PDF') {
  return api<{ success: boolean; message: string }>('/api/inventory/grn/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format }),
  });
}

export type StockOutwardManagement = {
  academicYear: string;
  academicYears: string[];
  outwards: {
    id: string;
    outwardNumber: string;
    date: string;
    outwardType: string;
    outwardTypeLabel: string;
    consumerType: string;
    consumerName: string;
    store: string;
    items: number;
    value: string;
    status: string;
    salesInvoiceNo: string;
    paymentMethod: string;
    paymentStatus: string;
  }[];
  stores: { id: string; code: string; name: string }[];
  catalog: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    barcode: string;
    availableQty: number;
    unitCost: number;
    salePrice: number;
    itemType: string;
  }[];
  consumers: {
    students: { id: string; name: string; class: string }[];
    staff: { id: string; name: string; dept: string }[];
    departments: { id: string; name: string }[];
  };
  approvedIndents: {
    id: string;
    indentNumber: string;
    department: string;
    approvedBy: string;
    lines: {
      itemId: string;
      sku: string;
      itemName: string;
      unit: string;
      requestedQty: number;
      pendingQty: number;
      unitCost: number;
      availableStock: number;
    }[];
  }[];
  outwardTypes: { value: string; label: string }[];
  consumerTypes: { value: string; label: string }[];
  paymentMethods: string[];
  typeBreakdown: { type: string; label: string; count: number; value: string }[];
  permissions: {
    canCreate: boolean;
    canCheckout: boolean;
    canApproveIndent: boolean;
    canViewSales: boolean;
    canViewFinancials: boolean;
  };
  automationRules: string[];
  validationRules: string[];
  erpIntegration: string[];
  notifications: string[];
};

export type OutwardDetail = StockOutwardManagement['outwards'][0] & {
  lines: { sku: string; itemName: string; quantity: number; unit: string; unitPrice: number; batchNo: string }[];
  ledger: { referenceNo: string; quantityOut: number; balanceQty: number; date: string }[];
  receiptSent: boolean;
  feeLedgerPosted: boolean;
};

type CartLine = { itemId: string; sku: string; name: string; unit: string; quantity: number; unitPrice: number; availableQty: number };

export async function fetchStockOutwardManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { outwardType?: string; storeId?: string; q?: string },
  role?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, role, ...filters };
  if (seed) params.seed = '1';
  return api<StockOutwardManagement>(`/api/inventory/outward${qs(params)}`);
}

export async function lookupOutwardItem(code: string, academicYear?: string) {
  return api<StockOutwardManagement['catalog'][0]>(`/api/inventory/outward/lookup${qs({ code, academicYear })}`);
}

export async function fetchOutwardDetail(outwardId: string) {
  return api<OutwardDetail>(`/api/inventory/outward/${outwardId}`);
}

export async function checkoutStockOutward(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; outwardNumber?: string; salesInvoiceNo?: string; totalValue?: string }>(
    '/api/inventory/outward/checkout',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function exportOutwardRegister(academicYear?: string, format = 'PDF') {
  return api<{ success: boolean; message: string }>('/api/inventory/outward/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format }),
  });
}

export type { CartLine };

export type TransferManagement = {
  academicYear: string;
  academicYears: string[];
  transfers: {
    id: string;
    transferNumber: string;
    date: string;
    fromStore: string;
    toStore: string;
    items: number;
    value: string;
    status: string;
    statusLabel: string;
    vehicleInfo: string;
    driverName: string;
  }[];
  stores: { id: string; code: string; name: string }[];
  catalog: {
    id: string;
    storeId: string;
    sku: string;
    name: string;
    unit: string;
    availableQty: number;
    inTransitQty: number;
    unitCost: number;
  }[];
  kpis: { inTransit: number; totalTransfers: number };
  statusBreakdown: { status: string; label: string; count: number }[];
  permissions: { canCreate: boolean; canDispatch: boolean; canReceive: boolean; canDispute: boolean };
  stateMachine: string[];
  automationRules: string[];
  validationRules: string[];
};

export type TransferDetail = TransferManagement['transfers'][0] & {
  fromStoreId: string;
  toStoreId: string;
  lines: {
    id: string;
    itemId: string;
    sku: string;
    itemName: string;
    unit: string;
    quantity: number;
    receivedQty: number;
    pendingReceive: number;
  }[];
  ledger: { type: string; quantityIn: number; quantityOut: number; balanceQty: number; date: string }[];
  notes: string;
  disputeReason: string;
};

export async function fetchTransferManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { status?: string; storeId?: string; q?: string },
  role?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, role, ...filters };
  if (seed) params.seed = '1';
  return api<TransferManagement>(`/api/inventory/transfers${qs(params)}`);
}

export async function fetchTransferDetail(transferId: string) {
  return api<TransferDetail>(`/api/inventory/transfers/${transferId}`);
}

export async function previewTransferNumber() {
  return api<{ transferNumber: string }>('/api/inventory/transfers/number-preview');
}

export async function createTransfer(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; transferId?: string; transferNumber?: string }>(
    '/api/inventory/transfers',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function updateTransfer(transferId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/transfers/${transferId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteTransfer(transferId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/transfers/${transferId}`, {
    method: 'DELETE',
  });
}

export async function dispatchTransfer(transferId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/transfers/${transferId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Store Keeper' }),
  });
}

export async function receiveTransfer(transferId: string, lines?: { lineId: string; receivedQty: number }[]) {
  return api<{ success: boolean; message: string; status?: string }>(`/api/inventory/transfers/${transferId}/receive`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Store Keeper', lines }),
  });
}

export async function exportTransferRegister(academicYear?: string, format = 'PDF') {
  return api<{ success: boolean; message: string }>('/api/inventory/transfers/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format }),
  });
}

export type SupplierManagement = {
  academicYear: string;
  academicYears: string[];
  suppliers: {
    id: string;
    code: string;
    name: string;
    contactPerson: string;
    mobile: string;
    email: string;
    city: string;
    gstId: string;
    apLedgerAccount: string;
    approvalStatus: string;
    rating: number;
    ratingStars: number;
    ratingLabel: string;
    grnCount: number;
    poCount: number;
    docCount: number;
    categoryCount: number;
  }[];
  categories: { id: string; code: string; name: string; color: string }[];
  totalSuppliers: number;
  approvedCount: number;
  pendingCount: number;
  statusBreakdown: { status: string; count: number }[];
  permissions: { canCreate: boolean; canEdit: boolean; canApprove: boolean; canDelete: boolean };
  docTypes: string[];
  validationRules: string[];
  erpIntegration: string[];
  workflow: string[];
};

export type SupplierDetail = SupplierManagement['suppliers'][0] & {
  address: string;
  state: string;
  pincode: string;
  taxId: string;
  bankName: string;
  bankAccount: string;
  ifscCode: string;
  approvedBy: string;
  approvedAt: string;
  onboardingNotes: string;
  documents: { id: string; docType: string; docName: string; fileUrl: string; uploadedAt: string }[];
  categories: { id: string; code: string; name: string; color: string }[];
  performance: {
    totalPurchaseOrders: number;
    totalGrns: number;
    totalPoValue: string;
    totalGrnValue: string;
    onTimeDeliveryPct: string;
    qualityScorePct: string;
    avgOrderValue: string;
  };
};

export async function fetchSupplierManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { approvalStatus?: string; q?: string },
  role?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, role, ...filters };
  if (seed) params.seed = '1';
  return api<SupplierManagement>(`/api/inventory/suppliers${qs(params)}`);
}

export async function fetchSupplierDetail(supplierId: string) {
  return api<SupplierDetail>(`/api/inventory/suppliers/${supplierId}`);
}

export async function createSupplier(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; supplierId?: string }>('/api/inventory/suppliers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateSupplier(supplierId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/suppliers/${supplierId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteSupplier(supplierId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/suppliers/${supplierId}`, {
    method: 'DELETE',
  });
}

export async function approveSupplier(supplierId: string, rating = 4) {
  return api<{ success: boolean; message: string }>(`/api/inventory/suppliers/${supplierId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Inventory Manager', rating }),
  });
}

export async function rejectSupplier(supplierId: string, reason?: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/suppliers/${supplierId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Inventory Manager', reason }),
  });
}

export async function addSupplierDocument(supplierId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/suppliers/${supplierId}/documents`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteSupplierDocument(docId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/suppliers/documents/${docId}`, {
    method: 'DELETE',
  });
}

export type PurchaseOrderManagement = {
  academicYear: string;
  academicYears: string[];
  purchaseOrders: {
    id: string;
    poNumber: string;
    date: string;
    supplier: string;
    value: string;
    totalValue: number;
    status: string;
    statusLabel: string;
    department: string;
    budgetCode: string;
    progressPct: number;
    progressLabel: string;
    ordered: boolean;
    received: boolean;
    billed: boolean;
    emailed: boolean;
  }[];
  suppliers: { id: string; name: string; code: string; email: string }[];
  stores: { id: string; name: string }[];
  items: { id: string; code: string; name: string; unit: string; rate: number; taxRate: number; storeId: string }[];
  approvedIndents: {
    id: string;
    indentNumber: string;
    department: string;
    requestedBy: string;
    lines: { id: string; itemId: string; sku: string; itemName: string; unit: string; requestedQty: number; remainingQty: number; unitEstimate: number }[];
  }[];
  budgets: { code: string; name: string; department: string; allocated: string }[];
  kpis: { totalOrders: number; pendingOrders: number; pendingApproval: number; totalValue: string };
  statusBreakdown: { status: string; count: number }[];
  permissions: { canCreate: boolean; canEdit: boolean; canApprove: boolean; canEmail: boolean; canDelete: boolean };
  autoApproveLimit: number;
  autoApproveLimitLabel: string;
  validationRules: string[];
  erpIntegration: string[];
  workflow: string[];
};

export type PurchaseOrderDetail = PurchaseOrderManagement['purchaseOrders'][0] & {
  storeId: string;
  storeName: string;
  supplierId: string | null;
  supplierEmail: string;
  indentId: string | null;
  indentNumber: string;
  poDate: string;
  expectedDate: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  encumbranceAmount: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy: string;
  approvedAt: string;
  rejectedReason: string;
  emailedAt: string;
  emailedTo: string;
  notes: string;
  approvalInfo: { route: string; requiresPrincipal: boolean; label: string };
  lines: {
    id: string; itemId: string; sku: string; itemName: string; unit: string;
    orderedQty: number; receivedQty: number; unitCost: number;
    taxRate: number; taxAmount: number; discountPct: number; discountAmount: number;
    lineValue: number; lineValueFmt: string;
  }[];
  grns: { id: string; grnNumber: string; date: string; status: string; value: string }[];
  progress: { stage: string; progressPct: number; progressLabel: string; ordered: boolean; received: boolean; billed: boolean };
};

export async function fetchPurchaseOrderManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { status?: string; q?: string; supplierId?: string },
  role?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, role, ...filters };
  if (seed) params.seed = '1';
  return api<PurchaseOrderManagement>(`/api/inventory/purchase-orders${qs(params)}`);
}

export async function fetchPurchaseOrderDetail(poId: string) {
  return api<PurchaseOrderDetail>(`/api/inventory/purchase-orders/${poId}`);
}

export async function previewPoNumber() {
  return api<{ poNumber: string }>('/api/inventory/purchase-orders/po-number-preview');
}

export async function createPurchaseOrder(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; poId?: string; poNumber?: string }>('/api/inventory/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createPoFromIndent(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; poId?: string; poNumber?: string }>('/api/inventory/purchase-orders/from-indent', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updatePurchaseOrder(poId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/purchase-orders/${poId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deletePurchaseOrder(poId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/purchase-orders/${poId}`, {
    method: 'DELETE',
  });
}

export async function submitPurchaseOrder(poId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/purchase-orders/${poId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Purchase Manager' }),
  });
}

export async function approvePurchaseOrder(poId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/purchase-orders/${poId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Principal' }),
  });
}

export async function rejectPurchaseOrder(poId: string, reason?: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/purchase-orders/${poId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Principal', reason }),
  });
}

export async function emailPurchaseOrderToVendor(poId: string) {
  return api<{ success: boolean; message: string; emailedTo?: string }>(`/api/inventory/purchase-orders/${poId}/email-vendor`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Purchase Manager' }),
  });
}

export type VendorBillManagement = {
  academicYear: string;
  academicYears: string[];
  vendorBills: {
    id: string;
    billRef: string;
    invoiceNumber: string;
    date: string;
    supplier: string;
    grnNumber: string;
    poNumber: string;
    amount: string;
    totalAmount: number;
    status: string;
    statusLabel: string;
    matchStatus: string;
    matchLabel: string;
    hasVariance: boolean;
    rateFlag: boolean;
    qtyFlag: boolean;
    journalEntryRef: string;
  }[];
  eligibleGrns: {
    id: string;
    grnNumber: string;
    date: string;
    supplierId: string | null;
    supplier: string;
    poNumber: string;
    purchaseOrderId: string | null;
    totalValue: string;
    lineCount: number;
    lines: {
      grnLineId: string;
      itemId: string;
      sku: string;
      itemName: string;
      unit: string;
      grnQty: number;
      poRate: number;
      defaultInvoiceRate: number;
    }[];
  }[];
  kpis: { totalBills: number; pendingApproval: number; varianceBills: number; sentToFinance: number; totalPayable: string };
  statusBreakdown: { status: string; count: number }[];
  matchBreakdown: { matchStatus: string; count: number }[];
  permissions: { canCreate: boolean; canEdit: boolean; canApprove: boolean; canSendToFinance: boolean; canDelete: boolean };
  validationRules: string[];
  erpIntegration: string[];
  workflow: string[];
};

export type VendorBillDetail = VendorBillManagement['vendorBills'][0] & {
  supplierId: string;
  grnId: string;
  purchaseOrderId: string | null;
  invoiceDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  varianceNotes: string;
  varianceApproved: boolean;
  varianceApprovedBy: string;
  approvedBy: string;
  approvedAt: string;
  sentToFinanceAt: string;
  apLedgerAccount: string;
  journalEntryPayload: Record<string, unknown>;
  lines: {
    id: string;
    grnLineId: string | null;
    itemId: string;
    sku: string;
    itemName: string;
    unit: string;
    invoiceQty: number;
    invoiceRate: number;
    grnQty: number;
    poRate: number;
    poQty: number;
    lineValue: string;
    hasRateVariance: boolean;
    hasQtyVariance: boolean;
    varianceNote: string;
  }[];
  threeWayMatch: {
    poNumber: string;
    grnNumber: string;
    invoiceNumber: string;
    matchStatus: string;
    rateVariance: boolean;
    qtyVariance: boolean;
  };
};

export async function fetchVendorBillManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { status?: string; q?: string; matchStatus?: string },
  role?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, role, ...filters };
  if (seed) params.seed = '1';
  return api<VendorBillManagement>(`/api/inventory/vendor-bills${qs(params)}`);
}

export async function fetchVendorBillDetail(billId: string) {
  return api<VendorBillDetail>(`/api/inventory/vendor-bills/${billId}`);
}

export async function createVendorBill(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; billId?: string; billRef?: string; matchStatus?: string }>('/api/inventory/vendor-bills', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateVendorBill(billId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/vendor-bills/${billId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteVendorBill(billId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/vendor-bills/${billId}`, {
    method: 'DELETE',
  });
}

export async function runVendorBillMatch(billId: string) {
  return api<{ success: boolean; message: string; matchStatus?: string }>(`/api/inventory/vendor-bills/${billId}/match`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function approveVendorBillVariance(billId: string, notes?: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/vendor-bills/${billId}/approve-variance`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Finance Head', notes }),
  });
}

export async function approveVendorBill(billId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/vendor-bills/${billId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Finance Head' }),
  });
}

export async function sendVendorBillToFinance(billId: string) {
  return api<{ success: boolean; message: string; journalEntryRef?: string }>(`/api/inventory/vendor-bills/${billId}/send-to-finance`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Accountant' }),
  });
}

export async function rejectVendorBill(billId: string, reason?: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/vendor-bills/${billId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Finance Head', reason }),
  });
}

export type StockAdjustmentManagement = {
  academicYear: string;
  academicYears: string[];
  adjustments: {
    id: string;
    adjustmentNumber: string;
    date: string;
    store: string;
    type: string;
    reasonCode: string;
    reasonLabel: string;
    totalQty: number;
    value: string;
    financialImpact: string;
    pnlLabel: string;
    status: string;
    statusLabel: string;
    createdBy: string;
    lineCount: number;
  }[];
  stores: { id: string; name: string }[];
  items: { id: string; storeId: string; code: string; name: string; unit: string; stockQty: number; unitCost: number }[];
  reasonCodes: { code: string; label: string }[];
  kpis: { totalAdjustments: number; monthAdjustments: number; pendingApproval: number; totalImpact: string };
  statusBreakdown: { status: string; count: number }[];
  permissions: { canCreate: boolean; canEdit: boolean; canApprove: boolean; canDelete: boolean };
  validationRules: string[];
  auditPolicy: string;
  workflow: string[];
  dashboardFeed: { adjustments: number };
};

export type StockAdjustmentDetail = StockAdjustmentManagement['adjustments'][0] & {
  storeId: string;
  adjustmentDate: string;
  reason: string;
  remarks: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy: string;
  approvedAt: string;
  rejectedReason: string;
  lines: {
    id: string;
    itemId: string;
    sku: string;
    itemName: string;
    unit: string;
    direction: string;
    directionLabel: string;
    quantity: number;
    unitCost: number;
    lineValue: string;
    reasonCode: string;
    reasonLabel: string;
    remarks: string;
    stockBefore: number;
  }[];
  auditTrail: { id: string; action: string; details: string; performedBy: string; at: string }[];
  ledgerEntries: { id: string; item: string; type: string; qtyIn: number; qtyOut: number; balance: number; date: string }[];
};

export async function fetchStockAdjustmentManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { status?: string; reasonCode?: string; q?: string },
  role?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, role, ...filters };
  if (seed) params.seed = '1';
  return api<StockAdjustmentManagement>(`/api/inventory/adjustments${qs(params)}`);
}

export async function fetchStockAdjustmentDetail(adjustmentId: string) {
  return api<StockAdjustmentDetail>(`/api/inventory/adjustments/${adjustmentId}`);
}

export async function previewAdjustmentNumber() {
  return api<{ adjustmentNumber: string }>('/api/inventory/adjustments/number-preview');
}

export async function createStockAdjustment(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; adjustmentId?: string; adjustmentNumber?: string }>('/api/inventory/adjustments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateStockAdjustment(adjustmentId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/inventory/adjustments/${adjustmentId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteStockAdjustment(adjustmentId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/adjustments/${adjustmentId}`, {
    method: 'DELETE',
  });
}

export async function submitStockAdjustment(adjustmentId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/adjustments/${adjustmentId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Store Keeper' }),
  });
}

export async function approveStockAdjustment(adjustmentId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/adjustments/${adjustmentId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Inventory Manager' }),
  });
}

export async function rejectStockAdjustment(adjustmentId: string, reason?: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/adjustments/${adjustmentId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Principal', reason }),
  });
}

export type BarcodeManagement = {
  academicYear: string;
  academicYears: string[];
  barcodes: {
    id: string;
    code: string;
    codeType: string;
    codeTypeLabel: string;
    sku: string;
    itemName: string;
    itemType: string;
    batchNo: string;
    serialNo: string;
    labelTemplate: string;
    status: string;
    printCount: number;
    lastPrinted: string;
  }[];
  items: {
    id: string;
    storeId: string;
    code: string;
    name: string;
    itemType: string;
    unit: string;
    stockQty: number;
    hasBarcode: boolean;
    labelType: string;
  }[];
  batches: { id: string; itemId: string; batchNo: string; itemCode: string; itemName: string; remainingQty: number }[];
  labelTemplates: { id: string; label: string; cols: number; rows: number }[];
  kpis: { totalBarcodes: number; barcodeCount: number; qrCount: number; printedLabels: number };
  automationRules: string[];
  mobileSync: string[];
  erpIntegration: string[];
};

export type BarcodeLookup = {
  found: boolean;
  source: string;
  code: string;
  codeType: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    itemType: string;
    barcode: string;
    availableQty: number;
    unitCost: number;
    category: string;
    store: string;
  };
  batch: { id: string; batchNo: string; expiryDate: string | null; remainingQty: number } | null;
  assetSerialNo: string | null;
  mobileActions: string[];
};

export async function fetchBarcodeManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { codeType?: string; q?: string },
) {
  const params: Record<string, string | undefined> = { academicYear, ...filters };
  if (seed) params.seed = '1';
  return api<BarcodeManagement>(`/api/inventory/barcodes${qs(params)}`);
}

export async function lookupInventoryBarcode(code: string, academicYear?: string) {
  const params: Record<string, string | undefined> = { academicYear };
  return api<BarcodeLookup>(`/api/inventory/barcodes/lookup/${encodeURIComponent(code)}${qs(params)}`);
}

export async function generateInventoryBarcodes(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; count: number; codes: { id: string; code: string; codeType: string }[] }>(
    '/api/inventory/barcodes/generate',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function printInventoryLabels(body: Record<string, unknown>) {
  return api<{
    success: boolean;
    message: string;
    fileName: string;
    labelCount: number;
    template: string;
    printHtml: string;
    labels: { code: string; codeType: string; itemName: string; sku: string }[];
  }>('/api/inventory/barcodes/print', { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteInventoryBarcode(barcodeId: string) {
  return api<{ success: boolean; message: string }>(`/api/inventory/barcodes/${barcodeId}`, { method: 'DELETE' });
}

export type InvAuditCount = {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  barcode: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  unitCost: number;
  varianceValue: number;
  varianceValueFormatted: string;
  scanMethod: string;
  scannedBy: string;
  scannedAt: string | null;
  status: string;
  matched: boolean;
};

export type InvAuditVariance = {
  id: string;
  sku: string;
  itemName: string;
  unit: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  varianceLabel: string;
  unitCost: number;
  varianceValue: number;
  varianceValueFormatted: string;
  status: string;
  approvedBy: string;
  approvedAt: string | null;
  notes: string;
};

export type InvAuditSession = {
  id: string;
  sessionCode: string;
  sessionType: string;
  sessionTypeLabel: string;
  status: string;
  statusLabel: string;
  storeFrozen: boolean;
  frozenAt: string | null;
  frozenBy: string;
  initiatedBy: string;
  startedAt: string;
  startedAtIso: string;
  completedAt: string | null;
  academicYear: string;
  storeName: string;
  totalItems: number;
  itemsCounted: number;
  varianceLines: number;
  totalVarianceQty: number;
  totalVarianceValue: number;
  totalVarianceValueFormatted: string;
  adjustmentId: string | null;
  notes: string;
  progress: number;
  counts?: InvAuditCount[];
  variances?: InvAuditVariance[];
  matchedCount?: number;
  pendingVariances?: number;
  approvedVariances?: number;
  canFreeze?: boolean;
  canCount?: boolean;
  canGenerateVariance?: boolean;
  canApproveVariances?: boolean;
  canCreateAdjustments?: boolean;
  canComplete?: boolean;
  canCancel?: boolean;
};

export type InventoryStockVerification = {
  academicYears: string[];
  sessionTypes: { id: string; label: string }[];
  stores: { id: string; storeCode: string; storeName: string }[];
  sessions: InvAuditSession[];
  activeSession: InvAuditSession | null;
  focusSession: InvAuditSession | null;
  frozenStores: { storeId: string; sessionCode: string }[];
  workflow: string[];
  scanMethods: string[];
  roles: string[];
  reports: string[];
};

export async function fetchInventoryStockVerification(
  seed?: boolean,
  academicYear?: string,
  sessionId?: string,
  storeId?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, sessionId, storeId };
  if (seed) params.seed = '1';
  return api<InventoryStockVerification>(`/api/inventory/stock-verification${qs(params)}`);
}

export async function createInventoryAuditSession(body: Record<string, unknown>) {
  return api<{ success: boolean; sessionId: string; sessionCode: string; message: string; data: InventoryStockVerification }>(
    '/api/inventory/stock-verification/sessions',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function freezeInventoryAuditSession(sessionId: string, frozenBy?: string) {
  return api<{ success: boolean; message: string; data: InventoryStockVerification }>(
    `/api/inventory/stock-verification/sessions/${sessionId}/freeze`,
    { method: 'POST', body: JSON.stringify({ frozenBy }) },
  );
}

export async function scanInventoryAuditItem(sessionId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; count: InvAuditCount; data: InventoryStockVerification }>(
    `/api/inventory/stock-verification/sessions/${sessionId}/scan`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function recordInventoryAuditCount(sessionId: string, body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; count: InvAuditCount; data: InventoryStockVerification }>(
    `/api/inventory/stock-verification/sessions/${sessionId}/count`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function generateInventoryVarianceReport(sessionId: string) {
  return api<{ success: boolean; varianceLines: number; message: string; data: InventoryStockVerification }>(
    `/api/inventory/stock-verification/sessions/${sessionId}/variance-report`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function approveInventoryAuditVariances(sessionId: string, body?: Record<string, unknown>) {
  return api<{ success: boolean; approved: number; message: string; data: InventoryStockVerification }>(
    `/api/inventory/stock-verification/sessions/${sessionId}/approve-variances`,
    { method: 'POST', body: JSON.stringify(body ?? {}) },
  );
}

export async function createInventoryAuditAdjustments(sessionId: string, performedBy?: string) {
  return api<{ success: boolean; adjustmentId: string; adjustmentNumber: string; message: string; data: InventoryStockVerification }>(
    `/api/inventory/stock-verification/sessions/${sessionId}/create-adjustments`,
    { method: 'POST', body: JSON.stringify({ performedBy }) },
  );
}

export async function completeInventoryAuditSession(sessionId: string, performedBy?: string) {
  return api<{ success: boolean; message: string; data: InventoryStockVerification }>(
    `/api/inventory/stock-verification/sessions/${sessionId}/complete`,
    { method: 'POST', body: JSON.stringify({ performedBy }) },
  );
}

export async function cancelInventoryAuditSession(sessionId: string, performedBy?: string) {
  return api<{ success: boolean; message: string; data: InventoryStockVerification }>(
    `/api/inventory/stock-verification/sessions/${sessionId}/cancel`,
    { method: 'POST', body: JSON.stringify({ performedBy }) },
  );
}

export type ReorderLevelItem = {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  storeId: string;
  storeName: string;
  itemType: string;
  unit: string;
  currentStock: number;
  availableQty: number;
  inTransitQty: number;
  minLevel: number;
  reorderLevel: number;
  maxLevel: number;
  suggestedReorderQty: number;
  unitCost: number;
  estimatedValue: number;
  defaultSupplierId: string | null;
  status: string;
  lowStock: boolean;
};

export type ReorderLevelManagement = {
  academicYear: string;
  academicYears: string[];
  stores: { id: string; storeCode: string; storeName: string }[];
  categories: { id: string; categoryCode: string; categoryName: string }[];
  lowStockCount: number;
  consumableLowCount: number;
  dashboardAlert: string;
  emailNotification: { sent: boolean; recipient: string; subject: string };
  lowStockItems: ReorderLevelItem[];
  topLowStock: ReorderLevelItem[];
  draftIndents: {
    id: string;
    indentNumber: string;
    department: string;
    status: string;
    lineCount: number;
    totalQty: number;
    requestedBy: string;
    createdAt: string;
    lines: { id: string; itemName: string; sku: string; requestedQty: number; unitEstimate: number }[];
  }[];
  automationRules: string[];
  itemTypes: string[];
};

export async function fetchReorderLevelManagement(
  seed?: boolean,
  academicYear?: string,
  filters?: { storeId?: string; categoryId?: string; itemType?: string; q?: string },
) {
  const params: Record<string, string | undefined> = { academicYear, ...filters };
  if (seed) params.seed = '1';
  return api<ReorderLevelManagement>(`/api/inventory/reorder-level${qs(params)}`);
}

export async function runReorderLevelScan(academicYear?: string) {
  return api<{ success: boolean; message: string; data: ReorderLevelManagement }>(
    '/api/inventory/reorder-level/scan',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function createReorderPurchaseRequest(body: Record<string, unknown>) {
  return api<{
    success: boolean;
    indentId: string;
    indentNumber: string;
    lineCount: number;
    message: string;
    data: ReorderLevelManagement;
  }>('/api/inventory/reorder-level/reorder', { method: 'POST', body: JSON.stringify(body) });
}

export type InventoryReportPreview = {
  templateId: string;
  name: string;
  description: string;
  restricted: boolean;
  generatedAt: string;
  rowCount: number;
  columns: string[];
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
  storeBreakdown?: { store: string; items: number; totalQty: number; value: string }[];
  categoryBreakdown?: { category: string; items: number; totalQty: number; value: string }[];
  detailRows?: Record<string, unknown>[];
  filters: Record<string, unknown>;
  academicYear: string;
};

export type InventoryReportsAnalytics = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  canViewFinancials: boolean;
  stores: { id: string; storeCode: string; storeName: string }[];
  categories: { id: string; categoryCode: string; categoryName: string }[];
  items: { id: string; itemCode: string; itemName: string }[];
  defaultFilters: { dateFrom: string; dateTo: string; expiryWithinDays: number };
  reportCatalog: {
    operational: { label: string; reports: { id: string; name: string; description: string; restricted: boolean }[] };
    financial: { label: string; reports: { id: string; name: string; description: string; restricted: boolean; locked?: boolean }[] };
  };
  securityMatrix: { report: string; roles: string; restricted?: boolean }[];
  financialRoles: string[];
  recentRuns: { id: string; action: string; details: string; performedBy: string; at: string; atLabel: string }[];
  exportFormats: string[];
  complianceNotes: string[];
};

export async function fetchInventoryReportsAnalytics(
  seed?: boolean,
  academicYear?: string,
  role?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<InventoryReportsAnalytics>(`/api/inventory/reports${qs(params)}`);
}

export async function generateInventoryReport(
  templateId: string,
  filters?: Record<string, unknown>,
  userRole?: string,
) {
  return api<InventoryReportPreview>('/api/inventory/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ templateId, filters, userRole }),
  });
}

export async function exportInventoryReport(
  templateId: string,
  filters?: Record<string, unknown>,
  format?: string,
  userRole?: string,
) {
  return api<{ success: boolean; format: string; fileName: string; message: string; preview: InventoryReportPreview }>(
    '/api/inventory/reports/export',
    { method: 'POST', body: JSON.stringify({ templateId, filters, format, userRole }) },
  );
}
