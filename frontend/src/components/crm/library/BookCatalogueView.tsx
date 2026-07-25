import { useCallback, useEffect, useState } from 'react';
import {
  Search, LayoutGrid, List, Filter, BookOpen, ChevronLeft, ChevronRight,
  X, Bookmark, MapPin, BarChart2, AlertCircle, Laptop, RefreshCw,
} from 'lucide-react';
import {
  fetchBookCatalogue,
  fetchBookCatalogueDetail,
  reserveCatalogueBook,
  type BookCatalogue,
  type BookCatalogueDetail,
  type CatalogueBook,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const AVAILABILITY_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
  ISSUED: 'bg-amber-100 text-amber-800 border-amber-200',
  RESERVED: 'bg-purple-100 text-purple-800 border-purple-200',
};

export function BookCatalogueView() {
  const [data, setData] = useState<BookCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [branchId, setBranchId] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');
  const [resourceType, setResourceType] = useState('ALL');
  const [authorFilter, setAuthorFilter] = useState('');
  const [publisherFilter, setPublisherFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBook, setSelectedBook] = useState<BookCatalogueDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [reserving, setReserving] = useState(false);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchBookCatalogue(seed, {
        q: search || undefined,
        academicYear,
        branchId: branchId || undefined,
        categoryId: categoryId !== 'ALL' ? categoryId : undefined,
        availability: availability !== 'ALL' ? availability : undefined,
        resourceType: resourceType !== 'ALL' ? resourceType : undefined,
        author: authorFilter || undefined,
        publisher: publisherFilter || undefined,
        tag: tagFilter || undefined,
        page,
        pageSize: 12,
      });
      setData(result);
      if (!branchId && result.branches[0]) setBranchId(result.branches[0].id);
      if (!memberId && result.members[0]) setMemberId(result.members[0].id);
    } finally {
      setLoading(false);
    }
  }, [search, academicYear, branchId, categoryId, availability, resourceType, authorFilter, publisherFilter, tagFilter, page, memberId]);

  useEffect(() => { void load(true); }, [load]);

  const openDetail = async (book: CatalogueBook) => {
    setDetailLoading(true);
    setSelectedBook(null);
    try {
      setSelectedBook(await fetchBookCatalogueDetail(book.id));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedBook || !memberId) return;
    setReserving(true);
    setMessage('');
    try {
      const result = await reserveCatalogueBook(selectedBook.id, memberId, academicYear);
      setMessage(result.message);
      setMessageType('success');
      setSelectedBook(await fetchBookCatalogueDetail(selectedBook.id));
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Reservation failed');
      setMessageType('error');
    } finally {
      setReserving(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load();
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Book Catalogue</h2>
          <p className="text-xs text-slate-500 mt-0.5">Online Public Access Catalog (OPAC) — Search, locate & reserve resources</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => { setAcademicYear(e.target.value); setPage(1); }}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={branchId}
            onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm"
          >
            {(data?.branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="p-2 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Title, Author, ISBN, Tags, Book Code..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg border transition-colors ${
            showFilters ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter size={14} /> Advanced Filters
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          Search
        </button>
      </form>

      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
            <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="w-full mt-1 text-xs border border-slate-200 rounded px-2 py-1.5">
              <option value="ALL">All Categories</option>
              {(data?.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Availability</label>
            <select value={availability} onChange={(e) => { setAvailability(e.target.value); setPage(1); }} className="w-full mt-1 text-xs border border-slate-200 rounded px-2 py-1.5">
              {(data?.availabilityOptions ?? ['ALL']).map((o) => (
                <option key={o} value={o}>{o === 'ALL' ? 'All Status' : o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Resource Type</label>
            <select value={resourceType} onChange={(e) => { setResourceType(e.target.value); setPage(1); }} className="w-full mt-1 text-xs border border-slate-200 rounded px-2 py-1.5">
              {(data?.resourceTypes ?? ['ALL']).map((o) => (
                <option key={o} value={o}>{o === 'ALL' ? 'All Types' : o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Author</label>
            <input value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} className="w-full mt-1 text-xs border border-slate-200 rounded px-2 py-1.5" placeholder="Author name" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Publisher</label>
            <input value={publisherFilter} onChange={(e) => setPublisherFilter(e.target.value)} className="w-full mt-1 text-xs border border-slate-200 rounded px-2 py-1.5" placeholder="Publisher" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tag</label>
            <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="w-full mt-1 text-xs border border-slate-200 rounded px-2 py-1.5" placeholder="e.g. fiction" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          <span className="font-bold text-slate-700">{data?.pagination.total ?? 0}</span> resources found
        </p>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button type="button" onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow text-purple-700' : 'text-slate-400'}`}>
            <LayoutGrid size={14} />
          </button>
          <button type="button" onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow text-purple-700' : 'text-slate-400'}`}>
            <List size={14} />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(data?.books ?? []).map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => void openDetail(book)}
              className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md hover:border-purple-200 transition-all group"
            >
              <div className="flex gap-3">
                <div className={`w-12 h-16 rounded-lg ${book.coverColor} flex items-center justify-center shrink-0 border border-slate-200/50 shadow-sm`}>
                  {book.resourceType === 'DIGITAL' ? <Laptop size={20} className="text-indigo-600" /> : <BookOpen size={20} className="text-white/80" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-purple-700">{book.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">{book.author}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{book.category}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${AVAILABILITY_COLORS[book.availabilityStatus]}`}>
                      {book.availabilityStatus}
                    </span>
                    {book.isNewArrival && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">NEW</span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1.5">
                    {book.availableCopies}/{book.totalCopies} copies available
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-left">
                <th className="px-4 py-2.5 font-semibold">Title</th>
                <th className="px-4 py-2.5 font-semibold">Author</th>
                <th className="px-4 py-2.5 font-semibold">Category</th>
                <th className="px-4 py-2.5 font-semibold">ISBN</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Copies</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.books ?? []).map((book) => (
                <tr
                  key={book.id}
                  onClick={() => void openDetail(book)}
                  className="hover:bg-purple-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-bold text-slate-800 max-w-[180px] truncate">{book.title}</td>
                  <td className="px-4 py-3 text-slate-600">{book.author}</td>
                  <td className="px-4 py-3 text-slate-600">{book.category}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{book.isbn || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={book.availabilityStatus} /></td>
                  <td className="px-4 py-3 text-slate-600">{book.availableCopies}/{book.totalCopies}</td>
                  <td className="px-4 py-3 text-slate-500">{book.resourceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(data?.books ?? []).length === 0 && (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <AlertCircle size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">No books match your search</p>
          <p className="text-xs text-slate-400 mt-1">Try different keywords or clear filters</p>
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-slate-600">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-purple-600" />
            <h3 className="text-xs font-bold text-slate-800">Most Searched Books</h3>
          </div>
          <div className="flex flex-col gap-2">
            {(data?.reports.mostSearched ?? []).map((b, i) => (
              <div key={i} className="flex justify-between text-[10px]">
                <span className="text-slate-700 truncate flex-1">{i + 1}. {b.title}</span>
                <span className="text-slate-500 ml-2">{b.searchCount} searches</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={14} className="text-amber-600" />
            <h3 className="text-xs font-bold text-slate-800">Zero-Result Queries (Procurement)</h3>
          </div>
          <div className="flex flex-col gap-2">
            {(data?.reports.zeroResultQueries ?? []).length === 0 ? (
              <p className="text-[10px] text-slate-400">No zero-result queries logged yet</p>
            ) : (
              (data?.reports.zeroResultQueries ?? []).map((q, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="text-slate-700 truncate">&quot;{q.query}&quot;</span>
                  <span className="text-slate-400 ml-2 shrink-0">{new Date(q.searchedAt).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AcademicModal
        open={!!selectedBook || detailLoading}
        onClose={() => { setSelectedBook(null); setMessage(''); }}
        title={selectedBook?.title ?? 'Loading...'}
        large
      >
        {detailLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading book details...</div>
        ) : selectedBook ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className={`w-20 h-28 rounded-lg ${selectedBook.coverColor} flex items-center justify-center shrink-0 border shadow-sm`}>
                {selectedBook.resourceType === 'DIGITAL' ? <Laptop size={28} className="text-indigo-600" /> : <BookOpen size={28} className="text-white/80" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{selectedBook.title}</h3>
                <p className="text-xs text-slate-600 mt-1">by {selectedBook.author}</p>
                <p className="text-[10px] text-slate-500 mt-1">{selectedBook.publisher} {selectedBook.edition && `· ${selectedBook.edition} Ed.`}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <StatusBadge status={selectedBook.availabilityStatus} />
                  <span className="text-[9px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{selectedBook.category}</span>
                  {selectedBook.tags.map((t) => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">#{t}</span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">ISBN: {selectedBook.isbn || 'N/A'} · Code: {selectedBook.bookCode}</p>
              </div>
            </div>

            {selectedBook.summary && (
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                {selectedBook.summary}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                <span className="text-[9px] text-slate-500 block">Available</span>
                <span className="text-sm font-bold text-green-700">{selectedBook.availableCopies}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                <span className="text-[9px] text-slate-500 block">Total Copies</span>
                <span className="text-sm font-bold text-slate-800">{selectedBook.totalCopies}</span>
              </div>
              <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                <span className="text-[9px] text-slate-500 block">Reservations</span>
                <span className="text-sm font-bold text-purple-700">{selectedBook.pendingReservations}</span>
              </div>
            </div>

            {selectedBook.copies.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-2 flex items-center gap-1">
                  <MapPin size={12} /> Copy Locations
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBook.copies.map((c) => (
                    <span key={c.id} className="text-[9px] px-2 py-1 rounded border border-slate-200 bg-white">
                      {c.copyCode} · {c.rackLocation} · <StatusBadge status={c.status} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedBook.canReserve && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                <p className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                  <Bookmark size={12} /> Reserve this book (all copies currently issued)
                </p>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full text-xs border border-amber-200 rounded px-2 py-1.5 bg-white"
                >
                  {(data?.members ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={reserving}
                  onClick={() => void handleReserve()}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  {reserving ? 'Reserving...' : 'Reserve Book'}
                </button>
              </div>
            )}

            {selectedBook.availabilityStatus === 'AVAILABLE' && (
              <div className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Copies are available on shelf — proceed to Book Issue / Return to borrow directly.
              </div>
            )}

            {message && <FeeMessage message={message} type={messageType} />}

            {selectedBook.reservationQueue.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-2">Reservation Queue</h4>
                <div className="space-y-1">
                  {selectedBook.reservationQueue.map((r) => (
                    <div key={r.position} className="text-[10px] flex justify-between text-slate-600">
                      <span>#{r.position} {r.memberName}</span>
                      <span className="text-slate-400">{new Date(r.reservedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </AcademicModal>
    </div>
  );
}
