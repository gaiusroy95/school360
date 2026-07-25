import { useCallback, useEffect, useRef, useState } from 'react';
import {
  QrCode, RefreshCw, Search, Printer, Plus, Trash2, ScanLine, Smartphone,
  Package, CheckCircle2,
} from 'lucide-react';
import {
  fetchBarcodeManagement,
  lookupInventoryBarcode,
  generateInventoryBarcodes,
  printInventoryLabels,
  deleteInventoryBarcode,
  type BarcodeManagement,
  type BarcodeLookup,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

type SelectedItem = {
  itemId: string;
  name: string;
  code: string;
  itemType: string;
  labelType: string;
  batchId?: string;
  quantity: number;
};

export function BarcodeQrCodeView() {
  const [data, setData] = useState<BarcodeManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [labelTemplate, setLabelTemplate] = useState('2x4');
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [toolOpen, setToolOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState<BarcodeLookup | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchBarcodeManagement(seed, academicYear, {
        codeType: typeFilter !== 'ALL' ? typeFilter : undefined,
        q: search || undefined,
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, typeFilter, search]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    if (type === 'success') void load();
    setTimeout(() => setMessage(''), 6000);
  };

  const filteredItems = (data?.items ?? []).filter((i) => {
    if (!itemSearch) return true;
    const q = itemSearch.toLowerCase();
    return i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
  });

  const toggleItem = (item: BarcodeManagement['items'][0]) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.itemId === item.id);
      if (exists) return prev.filter((s) => s.itemId !== item.id);
      return [...prev, {
        itemId: item.id,
        name: item.name,
        code: item.code,
        itemType: item.itemType,
        labelType: item.labelType,
        quantity: item.itemType === 'ASSET' ? 1 : 4,
      }];
    });
  };

  const handleGenerate = async () => {
    if (!selected.length) {
      flash('Select at least one item', 'error');
      return;
    }
    try {
      const r = await generateInventoryBarcodes({
        academicYear,
        labelTemplate,
        items: selected.map((s) => ({
          itemId: s.itemId,
          batchId: s.batchId,
          quantity: s.quantity,
        })),
      });
      flash(r.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Generate failed', 'error');
    }
  };

  const handlePrint = async () => {
    if (!selected.length) {
      flash('Select items to print labels', 'error');
      return;
    }
    try {
      const r = await printInventoryLabels({
        academicYear,
        labelTemplate,
        items: selected.map((s) => ({
          itemId: s.itemId,
          batchId: s.batchId,
          quantity: s.quantity,
        })),
      });
      const win = window.open('', '_blank');
      if (win && r.printHtml) {
        win.document.write(r.printHtml);
        win.document.close();
      }
      flash(r.message, 'success');
      setToolOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Print failed', 'error');
    }
  };

  const handleScan = async () => {
    if (!scanCode.trim()) return;
    try {
      const r = await lookupInventoryBarcode(scanCode.trim(), academicYear);
      setScanResult(r);
      flash(`Found: ${r.item.name}`, 'success');
    } catch (e) {
      setScanResult(null);
      flash(e instanceof Error ? e.message : 'Scan failed', 'error');
    }
    setScanCode('');
    scanRef.current?.focus();
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this barcode?')) return;
    try {
      await deleteInventoryBarcode(id);
      flash('Barcode deactivated', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Barcode / QR Code</h2>
          <p className="text-xs text-slate-500">Generate, print & scan labels for GRN, outward & audit</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Types</option>
            <option value="BARCODE">Barcode</option>
            <option value="QR">QR Code</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => setToolOpen(true)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
            <Printer size={12} /> Label Tool
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[9px]">
        <div className="bg-white border rounded-xl p-3">
          <p className="text-slate-500">Total Codes</p>
          <p className="font-bold text-xl">{data?.kpis.totalBarcodes}</p>
        </div>
        <div className="bg-slate-50 border rounded-xl p-3">
          <p className="text-slate-500">Barcodes (SKU)</p>
          <p className="font-bold text-xl">{data?.kpis.barcodeCount}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <p className="text-indigo-600">QR (Assets)</p>
          <p className="font-bold text-xl text-indigo-800">{data?.kpis.qrCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-green-600">Labels Printed</p>
          <p className="font-bold text-xl text-green-800">{data?.kpis.printedLabels}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-bold text-sm">Registered Codes</h3>
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search codes..." className="text-xs border rounded pl-7 pr-2 py-1 w-36" />
            </div>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <th className="text-left px-4 py-2">Code</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Item</th>
                  <th className="text-left px-4 py-2">Batch/S/N</th>
                  <th className="text-right px-4 py-2">Prints</th>
                  <th className="text-right px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(data?.barcodes ?? []).map((b) => (
                  <tr key={b.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono font-bold text-blue-700">{b.code}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded ${b.codeType === 'QR' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100'}`}>
                        {b.codeTypeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="block font-medium">{b.itemName}</span>
                      <span className="text-slate-400">{b.sku}</span>
                    </td>
                    <td className="px-4 py-2 text-[10px]">{b.serialNo !== '—' ? b.serialNo : b.batchNo}</td>
                    <td className="px-4 py-2 text-right">{b.printCount}</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => void handleDeactivate(b.id)} className="text-red-500 p-1"><Trash2 size={11} /></button>
                    </td>
                  </tr>
                ))}
                {(data?.barcodes ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No barcodes — use Label Tool</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <ScanLine size={16} className="text-blue-600" /> Scanner (Mobile Sync)
            </h3>
            <p className="text-[10px] text-slate-500 mb-2">{(data?.mobileSync ?? []).join(' · ')}</p>
            <div className="flex gap-2">
              <input
                ref={scanRef}
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleScan(); }}
                placeholder="Scan barcode / QR..."
                className="flex-1 text-xs border rounded-lg px-3 py-2 font-mono"
              />
              <button type="button" onClick={() => void handleScan()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs">Lookup</button>
            </div>
            {scanResult && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-[10px]">
                <p className="font-bold text-green-800 flex items-center gap-1"><CheckCircle2 size={12} /> {scanResult.item.name}</p>
                <p className="text-slate-600 mt-1">SKU: {scanResult.item.sku} · Stock: {scanResult.item.availableQty} {scanResult.item.unit}</p>
                <p className="text-slate-500">{scanResult.item.store} · {scanResult.item.category}</p>
                {scanResult.batch && <p className="text-amber-700">Batch: {scanResult.batch.batchNo}</p>}
                {scanResult.assetSerialNo && <p className="text-indigo-700">Serial: {scanResult.assetSerialNo}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {scanResult.mobileActions.map((a) => (
                    <span key={a} className="text-[8px] bg-white border px-1.5 py-0.5 rounded">{a.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border rounded-xl p-3 text-[9px] text-slate-600">
            <p className="font-bold flex items-center gap-1 mb-1"><Smartphone size={12} /> Automation</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {(data?.automationRules ?? []).map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <AcademicModal open={toolOpen} onClose={() => setToolOpen(false)} title="Label Generator" wide>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Label Template</p>
              <div className="flex gap-2">
                {(data?.labelTemplates ?? []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLabelTemplate(t.id)}
                    className={`flex-1 text-xs py-2 rounded-lg border ${labelTemplate === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex items-end">
              Selected: {selected.length} item(s) · Template {labelTemplate}
            </div>
          </div>

          <input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search items to add..."
            className="w-full text-xs border rounded px-3 py-2"
          />

          <div className="border rounded-lg max-h-48 overflow-auto">
            {filteredItems.map((item) => {
              const sel = selected.find((s) => s.itemId === item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-3 py-2 border-b text-xs cursor-pointer ${sel ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  onClick={() => toggleItem(item)}
                >
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(sel)} readOnly className="rounded" />
                    <Package size={14} className="text-slate-400" />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.code} · {item.itemType} → {item.labelType}</p>
                    </div>
                  </div>
                  {sel && (
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={sel.quantity}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setSelected((prev) => prev.map((s) => s.itemId === item.id ? { ...s, quantity: Number(e.target.value) } : s))}
                      className="w-14 text-right text-xs border rounded px-1 py-0.5"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {selected.length > 0 && (
            <div className="bg-slate-50 rounded p-2 text-[10px]">
              {selected.map((s) => (
                <div key={s.itemId} className="flex justify-between py-0.5">
                  <span>{s.name} ({s.labelType})</span>
                  <span>× {s.quantity} labels</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => void handleGenerate()} className="flex-1 border py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
              <Plus size={14} /> Generate Codes
            </button>
            <button type="button" onClick={() => void handlePrint()} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
              <Printer size={14} /> Generate PDF for Thermal Printer
            </button>
          </div>
        </div>
      </AcademicModal>
    </div>
  );
}
