import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const InventoryDashboardView = lazy(() =>
  import('./inventory/InventoryDashboardView').then((m) => ({ default: m.InventoryDashboardView })),
);
const ItemsProductsView = lazy(() =>
  import('./inventory/ItemsProductsView').then((m) => ({ default: m.ItemsProductsView })),
);
const CategoriesUnitsView = lazy(() =>
  import('./inventory/CategoriesUnitsView').then((m) => ({ default: m.CategoriesUnitsView })),
);
const StockInwardGrnView = lazy(() =>
  import('./inventory/StockInwardGrnView').then((m) => ({ default: m.StockInwardGrnView })),
);
const StockOutwardView = lazy(() =>
  import('./inventory/StockOutwardView').then((m) => ({ default: m.StockOutwardView })),
);
const TransferStockMovementView = lazy(() =>
  import('./inventory/TransferStockMovementView').then((m) => ({ default: m.TransferStockMovementView })),
);
const SupplierManagementView = lazy(() =>
  import('./inventory/SupplierManagementView').then((m) => ({ default: m.SupplierManagementView })),
);
const PurchaseOrdersView = lazy(() =>
  import('./inventory/PurchaseOrdersView').then((m) => ({ default: m.PurchaseOrdersView })),
);
const VendorBillsView = lazy(() =>
  import('./inventory/VendorBillsView').then((m) => ({ default: m.VendorBillsView })),
);
const StockAdjustmentView = lazy(() =>
  import('./inventory/StockAdjustmentView').then((m) => ({ default: m.StockAdjustmentView })),
);
const BarcodeQrCodeView = lazy(() =>
  import('./inventory/BarcodeQrCodeView').then((m) => ({ default: m.BarcodeQrCodeView })),
);
const StockVerificationView = lazy(() =>
  import('./inventory/StockVerificationView').then((m) => ({ default: m.StockVerificationView })),
);
const ReorderLevelView = lazy(() =>
  import('./inventory/ReorderLevelView').then((m) => ({ default: m.ReorderLevelView })),
);
const InventoryReportsAnalyticsView = lazy(() =>
  import('./inventory/InventoryReportsAnalyticsView').then((m) => ({ default: m.InventoryReportsAnalyticsView })),
);

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function InventoryManagementCRM({
  currentView = 'Inventory Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Inventory Dashboard' || !currentView) {
    return wrap(<InventoryDashboardView onNavigate={onNavigate} />);
  }
  if (currentView === 'Items / Products') {
    return wrap(<ItemsProductsView />);
  }
  if (currentView === 'Categories & Units') {
    return wrap(<CategoriesUnitsView />);
  }
  if (currentView === 'Stock Inward (GRN)') {
    return wrap(<StockInwardGrnView />);
  }
  if (currentView === 'Stock Outward') {
    return wrap(<StockOutwardView />);
  }
  if (currentView === 'Transfer / Stock Movement') {
    return wrap(<TransferStockMovementView />);
  }
  if (currentView === 'Supplier Management') {
    return wrap(<SupplierManagementView />);
  }
  if (currentView === 'Purchase Orders') {
    return wrap(<PurchaseOrdersView />);
  }
  if (currentView === 'Vendor Bills') {
    return wrap(<VendorBillsView />);
  }
  if (currentView === 'Stock Adjustment') {
    return wrap(<StockAdjustmentView />);
  }
  if (currentView === 'Barcode / QR Code') {
    return wrap(<BarcodeQrCodeView />);
  }
  if (currentView === 'Stock Verification') {
    return wrap(<StockVerificationView />);
  }
  if (currentView === 'Reorder Level') {
    return wrap(<ReorderLevelView />);
  }
  if (currentView === 'Reports & Analytics') {
    return wrap(<InventoryReportsAnalyticsView />);
  }
  if (currentView) {
    return <SubModuleView module="Inventory Management" title={currentView} />;
  }
  return wrap(<InventoryDashboardView onNavigate={onNavigate} />);
}
