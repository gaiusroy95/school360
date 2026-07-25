import { useCallback, useEffect, useState } from 'react';
import {
  BookPlus, Search, Barcode, Printer, Trash2, RefreshCw, Package,
  FileText, IndianRupee, Layers,
} from 'lucide-react';
import {
  fetchBookManagement,
  fetchIsbnMetadata,
  createLibraryBook,
  addLibraryBookCopies,
  printLibraryBarcodes,
  deleteLibraryBook,
  type BookManagement,
  type BookManagementTitle,
  type CreateBookPayload,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

const emptyForm = (): CreateBookPayload => ({
  title: '',
  author: '',
  categoryId: '',
  branchId: '',
  isbn: '',
  publisher: '',
  edition: '',
  summary: '',
  deweyDecimal: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchasePrice: 0,
  invoiceNo: '',
  vendorId: '',
  rackLocation: '',
  copyCount: 1,
  condition: 'GOOD',
  resourceType: 'PHYSICAL',
  isNewArrival: true,
  language: 'English',
  pageCount: 0,
});

export function AddManageBooksView() {
  const [data, setData] = useState<BookManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Catalog');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CreateBookPayload>(emptyForm());
  const [fetchingIsbn, setFetchingIsbn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedBook, setSelectedBook] = useState<BookManagementTitle | null>(null);
  const [lastAccessions, setLastAccessions] = useState<string[]>([]);
  const [addCopyCount, setAddCopyCount] = useState(1);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchBookManagement(seed, academicYear, search || undefined);
      setData(result);
      if (!form.branchId && result.branches[0]) {
        setForm((f) => ({ ...f, branchId: result.branches[0].id }));
      }
      if (!form.categoryId && result.categories[0]) {
        setForm((f) => ({ ...f, categoryId: result.categories[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }, [academicYear, search, form.branchId, form.categoryId]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleFetchIsbn = async () => {
    if (!form.isbn?.trim()) {
      flash('Enter ISBN first', 'error');
      return;
    }
    setFetchingIsbn(true);
    try {
      const meta = await fetchIsbnMetadata(form.isbn);
      setForm((f) => ({
        ...f,
        title: meta.title || f.title,
        author: meta.author || f.author,
        publisher: meta.publisher || f.publisher,
        edition: meta.edition || f.edition,
        summary: meta.summary || f.summary,
        deweyDecimal: meta.deweyDecimal || f.deweyDecimal,
        language: meta.language || f.language,
        pageCount: meta.pageCount || f.pageCount,
      }));
      flash(meta.title ? 'Metadata fetched from Open Library' : 'ISBN not found — enter details manually', meta.title ? 'success' : 'info');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'ISBN fetch failed', 'error');
    } finally {
      setFetchingIsbn(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const result = await createLibraryBook({ ...form, academicYear });
      setLastAccessions(result.accessionNumbers ?? []);
      setData(result);
      flash(result.message, 'success');
      setForm(emptyForm());
      if (data?.branches[0]) setForm((f) => ({ ...emptyForm(), branchId: data.branches[0].id, categoryId: data.categories[0]?.id ?? '' }));
      setTab('Catalog');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to add book', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintBarcodes = async (copyIds: string[]) => {
    try {
      await printLibraryBarcodes(copyIds);
      flash(`Marked ${copyIds.length} barcode(s) as printed`, 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Print failed', 'error');
    }
  };

  const handleAddCopies = async () => {
    if (!selectedBook) return;
    try {
      const result = await addLibraryBookCopies(selectedBook.id, addCopyCount, form.rackLocation, form.condition);
      setLastAccessions(result.accessionNumbers);
      flash(`Added ${result.accessionNumbers.length} cop${result.accessionNumbers.length === 1 ? 'y' : 'ies'}${result.notifiedWaitlist ? ` — ${result.notifiedWaitlist} waitlist notified` : ''}`, 'success');
      setSelectedBook(null);
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!window.confirm('Delete this book title and all copies?')) return;
    try {
      await deleteLibraryBook(bookId);
      flash('Book deleted', 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const selectedCategory = data?.categories.find((c) => c.id === form.categoryId);

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Add / Manage Books</h2>
          <p className="text-xs text-slate-500 mt-0.5">Procurement, cataloging, accession numbers & barcode management</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded px-3 py-1.5"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Titles', value: data?.procurementSummary.titlesAdded ?? 0, icon: <BookPlus size={16} /> },
          { label: 'Total Copies', value: data?.procurementSummary.totalCopies ?? 0, icon: <Layers size={16} /> },
          { label: 'Procurement Value', value: data?.procurementSummary.totalCost ?? '₹ 0', icon: <IndianRupee size={16} />, small: true },
          { label: 'Vendors', value: data?.procurementSummary.vendors ?? 0, icon: <Package size={16} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className={`font-bold text-slate-900 ${k.small ? 'text-sm' : 'text-lg'}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <FeeTabs tabs={['Catalog', 'Add New Book', 'Accession Register']} active={tab} onChange={setTab} />

      {tab === 'Catalog' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void load(); }}
                placeholder="Search title, author, ISBN..."
                className="w-full pl-9 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <button type="button" onClick={() => void load()} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg">Search</button>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50 border-b">
                <tr className="text-slate-500 text-left">
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Author</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">ISBN</th>
                  <th className="px-3 py-2">Copies</th>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.books ?? []).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-slate-800 max-w-[140px] truncate">{b.title}</td>
                    <td className="px-3 py-2 text-slate-600">{b.author}</td>
                    <td className="px-3 py-2 text-slate-600">{b.category}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{b.isbn || '—'}</td>
                    <td className="px-3 py-2">{b.availableCopies}/{b.totalCopies}</td>
                    <td className="px-3 py-2 text-slate-500">{b.vendor}</td>
                    <td className="px-3 py-2">{b.purchasePriceFormatted}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setSelectedBook(b)} className="px-2 py-1 text-[9px] font-bold bg-purple-50 text-purple-700 rounded">Copies</button>
                        <button
                          type="button"
                          onClick={() => void handlePrintBarcodes(b.copies.map((c) => c.id))}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Print barcodes"
                        >
                          <Printer size={12} />
                        </button>
                        <button type="button" onClick={() => void handleDelete(b.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Add New Book' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">ISBN Fetcher</label>
                <input
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  placeholder="9780062315007"
                  className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleFetchIsbn()}
                disabled={fetchingIsbn}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
              >
                {fetchingIsbn ? 'Fetching...' : 'Fetch Metadata'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Author *</label>
                <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Publisher</label>
                <input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Category *</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2">
                  {(data?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} (prefix: {c.accessionPrefix})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Branch *</label>
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2">
                  {(data?.branches ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Dewey Decimal</label>
                <input value={form.deweyDecimal} onChange={(e) => setForm({ ...form, deweyDecimal: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Purchase Date *</label>
                <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Price per Copy (₹)</label>
                <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Vendor</label>
                <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2">
                  <option value="">— Select —</option>
                  {(data?.vendors ?? []).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Invoice No.</label>
                <input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rack Location</label>
                <input value={form.rackLocation} onChange={(e) => setForm({ ...form, rackLocation: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" placeholder="Rack A-12" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Number of Copies</label>
                <input type="number" min={1} max={50} value={form.copyCount} onChange={(e) => setForm({ ...form, copyCount: Number(e.target.value) })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Condition</label>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full mt-1 text-sm border rounded-lg px-3 py-2">
                  {(data?.conditions ?? ['GOOD']).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Summary</label>
                <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl disabled:opacity-50"
            >
              {saving ? 'Cataloging...' : `Generate ${form.copyCount ?? 1} Accession Number(s) & Add to Inventory`}
            </button>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                <Barcode size={14} /> Accession Preview
              </h3>
              <p className="text-[10px] text-slate-600 mb-2">
                Prefix: <span className="font-bold font-mono">{selectedCategory?.accessionPrefix ?? 'CAT'}-###</span>
              </p>
              <p className="text-[9px] text-slate-500">Auto-incrementing per category (e.g. FIC-001, SCI-050). Each copy gets a unique accession number.</p>
            </div>
            {lastAccessions.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-green-800 mb-2">Generated Accessions</h3>
                <div className="space-y-1">
                  {lastAccessions.map((a) => (
                    <div key={a} className="flex items-center justify-between text-[10px] font-mono bg-white rounded px-2 py-1 border">
                      <span>{a}</span>
                      <Barcode size={12} className="text-slate-400" />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => flash('Barcode labels sent to print queue', 'info')}
                  className="mt-3 w-full py-2 bg-white border border-green-300 text-green-800 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
                >
                  <Printer size={12} /> Print Barcodes
                </button>
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-[9px] text-slate-500">
              <p className="font-bold text-slate-700 mb-1">{data?.financeIntegration}</p>
              <p className="mt-2">{(data?.mobileSync ?? []).join(' · ')}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'Accession Register' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <FileText size={14} className="text-purple-600" />
            <h3 className="text-xs font-bold text-slate-800">Accession Register</h3>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 text-left">
                  <th className="px-3 py-2">Accession No.</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Author</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Purchase Date</th>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Condition</th>
                  <th className="px-3 py-2">Rack</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.accessionRegister ?? []).map((r) => (
                  <tr key={r.accessionNo} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-bold text-purple-700">{r.accessionNo}</td>
                    <td className="px-3 py-2 font-medium text-slate-800 max-w-[120px] truncate">{r.title}</td>
                    <td className="px-3 py-2 text-slate-600">{r.author}</td>
                    <td className="px-3 py-2">{r.category}</td>
                    <td className="px-3 py-2">{r.purchaseDate}</td>
                    <td className="px-3 py-2">{r.vendor}</td>
                    <td className="px-3 py-2"><StatusBadge status={r.condition} /></td>
                    <td className="px-3 py-2">{r.rackLocation || '—'}</td>
                    <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2">{r.barcodePrinted ? '✓ Printed' : 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AcademicModal open={!!selectedBook} onClose={() => setSelectedBook(null)} title={selectedBook?.title ?? 'Copies'} large>
        {selectedBook && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">{selectedBook.author} · {selectedBook.totalCopies} copies</p>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left py-1">Accession</th>
                  <th>Rack</th>
                  <th>Condition</th>
                  <th>Status</th>
                  <th>Barcode</th>
                </tr>
              </thead>
              <tbody>
                {selectedBook.copies.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="py-2 font-mono font-bold">{c.accessionNo}</td>
                    <td className="text-center">{c.rackLocation || '—'}</td>
                    <td className="text-center"><StatusBadge status={c.condition} /></td>
                    <td className="text-center"><StatusBadge status={c.status} /></td>
                    <td className="text-center">{c.barcodePrinted ? 'Printed' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2 items-end border-t pt-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500">Add Copies</label>
                <input type="number" min={1} max={20} value={addCopyCount} onChange={(e) => setAddCopyCount(Number(e.target.value))} className="w-20 mt-1 text-sm border rounded px-2 py-1" />
              </div>
              <button type="button" onClick={() => void handleAddCopies()} className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg">
                Generate Accessions
              </button>
              <button
                type="button"
                onClick={() => void handlePrintBarcodes(selectedBook.copies.map((c) => c.id))}
                className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Printer size={12} /> Print All Barcodes
              </button>
            </div>
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
