import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShoppingCart, RefreshCw, Download, Barcode, Trash2,
  User, Building2, GraduationCap, CheckCircle2, ClipboardList, ScanLine,
} from 'lucide-react';
import {
  fetchStockOutwardManagement,
  fetchOutwardDetail,
  lookupOutwardItem,
  checkoutStockOutward,
  exportOutwardRegister,
  type StockOutwardManagement,
  type OutwardDetail,
  type CartLine,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const TYPE_STYLE: Record<string, string> = {
  ISSUE_TO_DEPT: 'bg-purple-50 text-purple-700',
  ISSUE_TO_STAFF: 'bg-blue-50 text-blue-700',
  SALE_TO_STUDENT: 'bg-green-50 text-green-700',
};

export function StockOutwardView() {
  const [data, setData] = useState<StockOutwardManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [storeId, setStoreId] = useState('');
  const [consumerType, setConsumerType] = useState('STAFF');
  const [consumerId, setConsumerId] = useState('');
  const [indentId, setIndentId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('WALLET');
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [detail, setDetail] = useState<OutwardDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchStockOutwardManagement(seed, academicYear, { q: search || undefined, storeId: storeId || undefined });
      setData(result);
      setStoreId((s) => s || result.stores[0]?.id || '');
    } finally {
      setLoading(false);
    }
  }, [academicYear, search, storeId]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const consumers = consumerType === 'STUDENT'
    ? data?.consumers.students ?? []
    : consumerType === 'DEPARTMENT'
      ? data?.consumers.departments ?? []
      : data?.consumers.staff ?? [];

  const addToCart = (item: { id: string; sku: string; name: string; unit: string; availableQty: number; salePrice: number; unitCost: number }, qty = 1) => {
    if (qty > item.availableQty) {
      flash(`Only ${item.availableQty} ${item.unit} available`, 'error');
      return;
    }
    const price = consumerType === 'STUDENT' ? item.salePrice : item.unitCost;
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > item.availableQty) {
          flash(`Only ${item.availableQty} ${item.unit} available`, 'error');
          return prev;
        }
        return prev.map((c) => c.itemId === item.id ? { ...c, quantity: newQty } : c);
      }
      return [...prev, { itemId: item.id, sku: item.sku, name: item.name, unit: item.unit, quantity: qty, unitPrice: price, availableQty: item.availableQty }];
    });
  };

  const handleBarcodeScan = async () => {
    if (!barcode.trim()) return;
    try {
      const item = await lookupOutwardItem(barcode.trim(), academicYear);
      addToCart(item);
      setBarcode('');
      barcodeRef.current?.focus();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Scan failed', 'error');
    }
  };

  const loadIndent = (indent: StockOutwardManagement['approvedIndents'][0]) => {
    setConsumerType('DEPARTMENT');
    setIndentId(indent.id);
    setConsumerId(indent.department);
    setCart(indent.lines.filter((l) => l.pendingQty > 0).map((l) => ({
      itemId: l.itemId,
      sku: l.sku,
      name: l.itemName,
      unit: l.unit,
      quantity: Math.min(l.pendingQty, l.availableStock),
      unitPrice: l.unitCost,
      availableQty: l.availableStock,
    })));
    flash(`Loaded indent ${indent.indentNumber}`, 'success');
  };

  const cartTotal = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  const handleCheckout = async () => {
    if (!cart.length) {
      flash('Cart is empty', 'error');
      return;
    }
    if (!consumerId) {
      flash('Select a consumer', 'error');
      return;
    }
    if (consumerType === 'DEPARTMENT' && !indentId) {
      flash('Department issue requires approved indent', 'error');
      return;
    }

    const consumer = consumers.find((c) => c.id === consumerId);
    const consumerName = consumer && 'name' in consumer ? consumer.name : consumerId;

    setCheckoutLoading(true);
    try {
      const r = await checkoutStockOutward({
        storeId,
        consumerType,
        consumerId,
        consumerName,
        indentId: indentId || undefined,
        academicYear,
        paymentMethod: consumerType === 'STUDENT' ? paymentMethod : undefined,
        lines: cart.map((c) => ({ itemId: c.itemId, quantity: c.quantity, unitPrice: c.unitPrice })),
        issuedBy: 'Store Keeper',
      });
      flash(r.message, 'success');
      setCart([]);
      setBarcode('');
      setIndentId('');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Checkout failed', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openDetail = async (id: string) => {
    try {
      const d = await fetchOutwardDetail(id);
      setDetail(d);
      setDetailOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to load', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;
  const isSale = consumerType === 'STUDENT';

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Stock Outward</h2>
          <p className="text-xs text-slate-500">POS checkout — Issue to staff/dept or sell to students with real-time stock deduction</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void exportOutwardRegister(academicYear).then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
        {(data?.typeBreakdown ?? []).map((t) => (
          <div key={t.type} className={`rounded-lg p-2 border ${TYPE_STYLE[t.type] ?? 'bg-slate-50'}`}>
            <p className="font-bold text-lg">{t.count}</p>
            <span>{t.label}</span>
            {perms?.canViewSales && <p className="text-[8px] mt-0.5">{t.value}</p>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* POS Panel */}
        <div className="lg:col-span-2 bg-white border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl">
            <ScanLine size={18} className="text-green-400 shrink-0" />
            <input
              ref={barcodeRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleBarcodeScan(); }}
              placeholder="Scan barcode or enter SKU..."
              className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-400 outline-none"
              autoFocus
            />
            <button type="button" onClick={() => void handleBarcodeScan()} className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
              <Barcode size={12} /> Add
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['STAFF', 'STUDENT', 'DEPARTMENT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setConsumerType(t); setConsumerId(''); setIndentId(''); setCart([]); }}
                className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 ${consumerType === t ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-slate-50'}`}
              >
                {t === 'STAFF' && <User size={12} />}
                {t === 'STUDENT' && <GraduationCap size={12} />}
                {t === 'DEPARTMENT' && <Building2 size={12} />}
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select value={consumerId} onChange={(e) => setConsumerId(e.target.value)} className="text-xs border rounded-lg px-2 py-2">
              <option value="">Select {consumerType.toLowerCase()}...</option>
              {consumers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{'class' in c ? ` (${c.class})` : 'dept' in c ? ` — ${c.dept}` : ''}
                </option>
              ))}
            </select>
            {isSale && (
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="text-xs border rounded-lg px-2 py-2">
                {(data?.paymentMethods ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500">
                  <th className="p-2 text-left">Item</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {cart.map((line) => (
                  <tr key={line.itemId}>
                    <td className="p-2">
                      <p className="font-bold">{line.name}</p>
                      <p className="text-slate-400">{line.sku} · max {line.availableQty}</p>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={line.availableQty}
                        value={line.quantity}
                        onChange={(e) => {
                          const q = Number(e.target.value);
                          if (q > line.availableQty) { flash(`Max ${line.availableQty}`, 'error'); return; }
                          setCart((prev) => prev.map((c) => c.itemId === line.itemId ? { ...c, quantity: q } : c));
                        }}
                        className="w-14 border rounded px-1 py-0.5 text-center text-xs"
                      />
                    </td>
                    <td className="text-center">{perms?.canViewFinancials ? `₹${line.unitPrice}` : '***'}</td>
                    <td className="text-center font-bold">{perms?.canViewFinancials ? `₹${line.quantity * line.unitPrice}` : '***'}</td>
                    <td>
                      <button type="button" onClick={() => setCart((prev) => prev.filter((c) => c.itemId !== line.itemId))} className="text-red-500 p-1">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400">Scan items or load an approved indent</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-xs text-slate-500">{cart.length} item(s)</p>
              <p className="text-xl font-bold text-slate-900">{perms?.canViewFinancials ? `₹ ${cartTotal.toLocaleString('en-IN')}` : '***'}</p>
            </div>
            {perms?.canCheckout && (
              <button
                type="button"
                onClick={() => void handleCheckout()}
                disabled={checkoutLoading || !cart.length}
                className="px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              >
                <ShoppingCart size={16} />
                {isSale ? 'Checkout & Invoice' : 'Issue Items'}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <ClipboardList size={14} className="text-blue-600" /> Approved Indents
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(data?.approvedIndents ?? []).map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => loadIndent(ind)}
                  className="w-full text-left p-2 border rounded-lg hover:border-blue-300 text-[10px]"
                >
                  <p className="font-bold">{ind.indentNumber}</p>
                  <p className="text-slate-500">{ind.department} · {ind.lines.length} items</p>
                </button>
              ))}
              {!data?.approvedIndents.length && <p className="text-xs text-slate-400 text-center py-4">No approved indents</p>}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 flex-1">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Recent Outward</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(data?.outwards ?? []).slice(0, 10).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => void openDetail(o.id)}
                  className="w-full text-left p-2 border rounded-lg hover:bg-slate-50 text-[10px]"
                >
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-blue-600">{o.outwardNumber}</span>
                    <span className={`px-1 rounded text-[8px] ${TYPE_STYLE[o.outwardType] ?? ''}`}>{o.outwardTypeLabel}</span>
                  </div>
                  <p className="text-slate-600">{o.consumerName} · {o.date}</p>
                  {o.salesInvoiceNo !== '—' && <p className="text-green-600">{o.salesInvoiceNo}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border rounded-lg p-3 text-[9px] text-slate-600 grid md:grid-cols-3 gap-2">
        <div><p className="font-bold mb-1">Validation</p><ul>{(data?.validationRules ?? []).map((r, i) => <li key={i}>• {r}</li>)}</ul></div>
        <div><p className="font-bold mb-1">ERP</p><ul>{(data?.erpIntegration ?? []).map((r, i) => <li key={i}>• {r}</li>)}</ul></div>
        <div><p className="font-bold mb-1">Notifications</p><ul>{(data?.notifications ?? []).map((r, i) => <li key={i}>• {r}</li>)}</ul></div>
      </div>

      <AcademicModal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `${detail.outwardNumber} — ${detail.outwardTypeLabel}` : 'Detail'} wide>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Consumer</span><p className="font-bold">{detail.consumerName}</p></div>
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Value</span><p className="font-bold">{detail.value}</p></div>
              {detail.salesInvoiceNo !== '—' && (
                <div className="p-2 bg-green-50 rounded col-span-2 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span>Invoice {detail.salesInvoiceNo} · {detail.paymentMethod} · {detail.paymentStatus}</span>
                </div>
              )}
            </div>
            <table className="w-full text-[10px] border rounded-lg overflow-hidden">
              <thead className="bg-slate-50"><tr><th className="p-2 text-left">Item</th><th>Qty</th><th>Batch</th></tr></thead>
              <tbody className="divide-y">
                {detail.lines.map((l) => (
                  <tr key={l.sku}><td className="p-2">{l.itemName}</td><td className="text-center">{l.quantity} {l.unit}</td><td>{l.batchNo}</td></tr>
                ))}
              </tbody>
            </table>
            {detail.receiptSent && <p className="text-[10px] text-green-600">✓ Receipt notification sent</p>}
            {detail.feeLedgerPosted && <p className="text-[10px] text-blue-600">✓ Posted to student fee ledger</p>}
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
