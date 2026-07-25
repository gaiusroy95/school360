import { SubModuleView } from './shared/SubModuleView';
import { InventoryDashboardView } from './inventory/InventoryDashboardView';
import { ItemsProductsView } from './inventory/ItemsProductsView';
import { CategoriesUnitsView } from './inventory/CategoriesUnitsView';
import { StockInwardGrnView } from './inventory/StockInwardGrnView';
import { StockOutwardView } from './inventory/StockOutwardView';
import { TransferStockMovementView } from './inventory/TransferStockMovementView';
import { SupplierManagementView } from './inventory/SupplierManagementView';
import { PurchaseOrdersView } from './inventory/PurchaseOrdersView';
import { VendorBillsView } from './inventory/VendorBillsView';
import { StockAdjustmentView } from './inventory/StockAdjustmentView';
import { BarcodeQrCodeView } from './inventory/BarcodeQrCodeView';
import { StockVerificationView } from './inventory/StockVerificationView';
import { ReorderLevelView } from './inventory/ReorderLevelView';
import { InventoryReportsAnalyticsView } from './inventory/InventoryReportsAnalyticsView';

export function InventoryManagementCRM({
  currentView = 'Inventory Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Inventory Dashboard' || !currentView) {
    return <InventoryDashboardView onNavigate={onNavigate} />;
  }
  if (currentView === 'Items / Products') {
    return <ItemsProductsView />;
  }
  if (currentView === 'Categories & Units') {
    return <CategoriesUnitsView />;
  }
  if (currentView === 'Stock Inward (GRN)') {
    return <StockInwardGrnView />;
  }
  if (currentView === 'Stock Outward') {
    return <StockOutwardView />;
  }
  if (currentView === 'Transfer / Stock Movement') {
    return <TransferStockMovementView />;
  }
  if (currentView === 'Supplier Management') {
    return <SupplierManagementView />;
  }
  if (currentView === 'Purchase Orders') {
    return <PurchaseOrdersView />;
  }
  if (currentView === 'Vendor Bills') {
    return <VendorBillsView />;
  }
  if (currentView === 'Stock Adjustment') {
    return <StockAdjustmentView />;
  }
  if (currentView === 'Barcode / QR Code') {
    return <BarcodeQrCodeView />;
  }
  if (currentView === 'Stock Verification') {
    return <StockVerificationView />;
  }
  if (currentView === 'Reorder Level') {
    return <ReorderLevelView />;
  }
  if (currentView === 'Reports & Analytics') {
    return <InventoryReportsAnalyticsView />;
  }
  if (currentView) {
    return <SubModuleView module="Inventory Management" title={currentView} />;
  }
  return <InventoryDashboardView onNavigate={onNavigate} />;
}
