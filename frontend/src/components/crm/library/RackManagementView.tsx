import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapPin, Plus, RefreshCw, ChevronRight, ChevronDown, Layers, Package,
  AlertTriangle, Trash2, Link2, BarChart3, Boxes,
} from 'lucide-react';
import {
  fetchRackManagement,
  createLibraryLocation,
  createLibraryRack,
  createLibraryShelf,
  deleteLibraryLocation,
  deleteLibraryRack,
  deleteLibraryShelf,
  assignBooksToLibraryShelf,
  bulkAssignLibraryByCategory,
  setLibraryCategoryDefaultRack,
  suggestLibraryRackForCategory,
  type RackManagement,
  type RackNode,
  type RackShelf,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

type Selected =
  | { type: 'floor'; id: string; name: string; branchId: string }
  | { type: 'aisle'; id: string; name: string; branchId: string }
  | { type: 'rack'; node: RackNode; aisleName: string; floorName: string }
  | { type: 'shelf'; shelf: RackShelf; rack: RackNode; aisleName: string; floorName: string };

export function RackManagementView() {
  const [data, setData] = useState<RackManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Hierarchy');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Selected | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [modal, setModal] = useState<'floor' | 'aisle' | 'rack' | 'shelf' | null>(null);
  const [saving, setSaving] = useState(false);

  const [floorForm, setFloorForm] = useState({ branchId: '', locationName: '' });
  const [aisleForm, setAisleForm] = useState({ branchId: '', parentId: '', locationName: '' });
  const [rackForm, setRackForm] = useState({ locationId: '', rackNumber: '', capacity: 50, assetTag: '' });
  const [shelfForm, setShelfForm] = useState({ rackId: '', shelfNumber: '', capacity: 20 });

  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkShelfId, setBulkShelfId] = useState('');
  const [selectedCopyIds, setSelectedCopyIds] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState('');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchRackManagement(seed);
      setData(result);
      if (expanded.size === 0 && result.tree[0]) {
        const ids = new Set<string>();
        ids.add(result.tree[0].id);
        result.tree[0].floors.forEach((f) => ids.add(f.id));
        setExpanded(ids);
      }
      if (!floorForm.branchId && result.branches[0]) {
        setFloorForm((f) => ({ ...f, branchId: result.branches[0].id }));
      }
      if (!bulkCategoryId && result.categories[0]) {
        setBulkCategoryId(result.categories[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [expanded.size, floorForm.branchId, bulkCategoryId]);

  useEffect(() => { void load(); }, []);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const allShelves = useMemo(() => {
    const out: Array<RackShelf & { rackId: string; rackNumber: string; path: string }> = [];
    for (const branch of data?.tree ?? []) {
      for (const floor of branch.floors) {
        for (const aisle of floor.aisles) {
          for (const rack of aisle.racks) {
            for (const shelf of rack.shelves) {
              out.push({
                ...shelf,
                rackId: rack.id,
                rackNumber: rack.rackNumber,
                path: `${branch.name} › ${floor.locationName} › ${aisle.locationName} › Rack ${rack.rackNumber} › Shelf ${shelf.shelfNumber}`,
              });
            }
          }
        }
      }
    }
    return out;
  }, [data]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateFloor = async () => {
    if (!floorForm.locationName.trim()) { flash('Floor name required', 'error'); return; }
    setSaving(true);
    try {
      const result = await createLibraryLocation({
        branchId: floorForm.branchId,
        locationType: 'FLOOR',
        locationName: floorForm.locationName,
      });
      setData(result);
      setModal(null);
      setFloorForm((f) => ({ ...f, locationName: '' }));
      flash('Floor created', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAisle = async () => {
    if (!aisleForm.locationName.trim() || !aisleForm.parentId) { flash('Aisle name and floor required', 'error'); return; }
    setSaving(true);
    try {
      const result = await createLibraryLocation({
        branchId: aisleForm.branchId,
        locationType: 'AISLE',
        locationName: aisleForm.locationName,
        parentId: aisleForm.parentId,
      });
      setData(result);
      setModal(null);
      flash('Aisle created', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRack = async () => {
    if (!rackForm.rackNumber.trim() || !rackForm.locationId) { flash('Rack number and aisle required', 'error'); return; }
    setSaving(true);
    try {
      const result = await createLibraryRack(rackForm);
      setData(result);
      setModal(null);
      flash('Rack created', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShelf = async () => {
    if (!shelfForm.shelfNumber.trim() || !shelfForm.rackId) { flash('Shelf number required', 'error'); return; }
    setSaving(true);
    try {
      const result = await createLibraryShelf(shelfForm);
      setData(result);
      setModal(null);
      flash('Shelf created', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async (force = false) => {
    if (!bulkCategoryId) return;
    try {
      const result = await bulkAssignLibraryByCategory(bulkCategoryId, bulkShelfId || undefined, force);
      if (result.data) setData(result.data);
      if (result.success === false && !force) {
        flash(result.message, 'error');
        return;
      }
      flash(result.message, result.warning ? 'info' : 'success');
      setSelectedCopyIds([]);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Bulk assign failed', 'error');
    }
  };

  const handleAssignSelected = async (force = false) => {
    if (!bulkShelfId || !selectedCopyIds.length) {
      flash('Select copies and a target shelf', 'error');
      return;
    }
    try {
      const result = await assignBooksToLibraryShelf(selectedCopyIds, bulkShelfId, force);
      if (result.data) setData(result.data);
      if (!result.success && !force) {
        flash(result.message, 'error');
        return;
      }
      flash(result.message, result.warning ? 'info' : 'success');
      setSelectedCopyIds([]);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Assign failed', 'error');
    }
  };

  const handleSuggest = async () => {
    if (!bulkCategoryId) return;
    try {
      const s = await suggestLibraryRackForCategory(bulkCategoryId);
      if (s.suggested && s.shelfId) {
        setBulkShelfId(s.shelfId);
        setSuggestion(s.locationLabel ?? '');
        flash(`Suggested: ${s.locationLabel}`, 'info');
      } else {
        flash(s.message ?? 'No default rack for category', 'info');
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Suggestion failed', 'error');
    }
  };

  const handleSetDefaultRack = async (categoryId: string, rackId: string) => {
    try {
      const result = await setLibraryCategoryDefaultRack(categoryId, rackId);
      setData(result);
      flash('Default rack set for category', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const utilizationColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Rack Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Branch → Floor → Aisle → Rack → Shelf · physical layout & book placement
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 self-start">
          <RefreshCw size={14} />
        </button>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Racks', value: data?.summary.totalRacks ?? 0, icon: <Boxes size={16} /> },
          { label: 'Shelves', value: data?.summary.totalShelves ?? 0, icon: <Layers size={16} /> },
          { label: 'Capacity', value: data?.summary.totalCapacity ?? 0, icon: <Package size={16} /> },
          { label: 'Occupied', value: data?.summary.totalOccupancy ?? 0, icon: <MapPin size={16} /> },
          { label: 'Utilization', value: `${data?.summary.spaceUtilizationPct ?? 0}%`, icon: <BarChart3 size={16} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className="font-bold text-slate-900 text-lg">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <FeeTabs tabs={['Hierarchy', 'Bulk Update', 'Reports']} active={tab} onChange={setTab} />

      {tab === 'Hierarchy' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 min-h-[480px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Hierarchical Location Builder</h3>
              <button
                type="button"
                onClick={() => setModal('floor')}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Plus size={14} /> Add Floor
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[520px]">
              {(data?.tree ?? []).map((branch) => (
                <div key={branch.id}>
                  <div className="flex items-center gap-2 py-2 px-2 bg-slate-50 rounded-lg font-semibold text-sm text-slate-800">
                    <MapPin size={14} className="text-indigo-600" />
                    {branch.name} ({branch.code})
                  </div>
                  {branch.floors.map((floor) => (
                    <div key={floor.id} className="ml-4">
                      <div
                        className="flex items-center gap-1 py-1.5 px-2 rounded hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          toggle(floor.id);
                          setSelected({ type: 'floor', id: floor.id, name: floor.locationName, branchId: branch.id });
                        }}
                      >
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggle(floor.id); }}>
                          {expanded.has(floor.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <span className="text-xs font-semibold text-slate-700">{floor.locationName}</span>
                        <button
                          type="button"
                          className="ml-auto text-[10px] text-indigo-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAisleForm({ branchId: branch.id, parentId: floor.id, locationName: '' });
                            setModal('aisle');
                          }}
                        >
                          + Aisle
                        </button>
                      </div>
                      {expanded.has(floor.id) && floor.aisles.map((aisle) => (
                        <div key={aisle.id} className="ml-6">
                          <div
                            className="flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer"
                            onClick={() => {
                              toggle(aisle.id);
                              setSelected({ type: 'aisle', id: aisle.id, name: aisle.locationName, branchId: branch.id });
                            }}
                          >
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(aisle.id); }}>
                              {expanded.has(aisle.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                            <span className="text-xs text-slate-600">{aisle.locationName}</span>
                            <button
                              type="button"
                              className="ml-auto text-[10px] text-indigo-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRackForm({ locationId: aisle.id, rackNumber: '', capacity: 50, assetTag: '' });
                                setModal('rack');
                              }}
                            >
                              + Rack
                            </button>
                            <button
                              type="button"
                              className="text-[10px] text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Delete aisle?')) {
                                  void deleteLibraryLocation(aisle.id).then(setData).then(() => flash('Deleted', 'success'));
                                }
                              }}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          {expanded.has(aisle.id) && aisle.racks.map((rack) => (
                            <div key={rack.id} className="ml-6 border-l border-slate-100 pl-2">
                              <div
                                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-indigo-50/50 cursor-pointer"
                                onClick={() => setSelected({ type: 'rack', node: rack, aisleName: aisle.locationName, floorName: floor.locationName })}
                              >
                                <Boxes size={12} className="text-indigo-500" />
                                <span className="text-xs font-medium text-slate-800">Rack {rack.rackNumber}</span>
                                <span className="text-[10px] text-slate-400">{rack.currentOccupancy}/{rack.capacity}</span>
                                {rack.availableSpace <= 5 && rack.capacity > 0 && (
                                  <AlertTriangle size={10} className="text-amber-500" />
                                )}
                                <button
                                  type="button"
                                  className="ml-auto text-[10px] text-indigo-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShelfForm({ rackId: rack.id, shelfNumber: '', capacity: 20 });
                                    setModal('shelf');
                                  }}
                                >
                                  + Shelf
                                </button>
                              </div>
                              <div className="ml-4 space-y-0.5">
                                {rack.shelves.map((shelf) => (
                                  <div
                                    key={shelf.id}
                                    className="flex items-center gap-2 py-0.5 px-2 text-[11px] text-slate-600 hover:bg-slate-50 rounded cursor-pointer"
                                    onClick={() => setSelected({ type: 'shelf', shelf, rack, aisleName: aisle.locationName, floorName: floor.locationName })}
                                  >
                                    <Layers size={10} />
                                    Shelf {shelf.shelfNumber}
                                    <span className={`text-[10px] ${shelf.currentOccupancy >= shelf.capacity ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                                      {shelf.currentOccupancy}/{shelf.capacity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Details</h3>
            {!selected && <p className="text-xs text-slate-400">Select a floor, aisle, rack, or shelf</p>}
            {selected?.type === 'rack' && (
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-slate-800">Rack {selected.node.rackNumber}</p>
                <p className="text-slate-500">{selected.floorName} › {selected.aisleName}</p>
                <p>Capacity: <strong>{selected.node.capacity}</strong></p>
                <p>Occupancy: <strong>{selected.node.currentOccupancy}</strong> · Available: <strong>{selected.node.availableSpace}</strong></p>
                {selected.node.assetTag && <p>Asset Tag: <code className="bg-slate-100 px-1 rounded">{selected.node.assetTag}</code></p>}
                <div className="pt-2 border-t">
                  <p className="font-semibold mb-1">Category default rack</p>
                  {(data?.categories ?? []).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => void handleSetDefaultRack(c.id, selected.node.id)}
                      className={`block w-full text-left px-2 py-1 rounded mb-1 ${c.defaultRackId === selected.node.id ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-slate-50'}`}
                    >
                      {c.name} {c.defaultRackId === selected.node.id && '✓'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete rack?')) {
                      void deleteLibraryRack(selected.node.id).then(setData).then(() => { setSelected(null); flash('Deleted', 'success'); });
                    }
                  }}
                  className="text-red-600 flex items-center gap-1 mt-2"
                >
                  <Trash2 size={12} /> Delete rack
                </button>
              </div>
            )}
            {selected?.type === 'shelf' && (
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-slate-800">Shelf {selected.shelf.shelfNumber}</p>
                <p className="text-slate-500">{selected.shelf.locationLabel}</p>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${utilizationColor((selected.shelf.currentOccupancy / selected.shelf.capacity) * 100)}`}
                    style={{ width: `${Math.min(100, (selected.shelf.currentOccupancy / selected.shelf.capacity) * 100)}%` }}
                  />
                </div>
                <p>Occupancy: {selected.shelf.currentOccupancy} / {selected.shelf.capacity}</p>
                <p className={selected.shelf.availableSpace === 0 ? 'text-red-600 font-semibold' : 'text-emerald-600'}>
                  Available space: {selected.shelf.availableSpace}
                </p>
                <button
                  type="button"
                  onClick={() => setBulkShelfId(selected.shelf.id)}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold"
                >
                  Use for bulk assign
                </button>
              </div>
            )}
            {(selected?.type === 'floor' || selected?.type === 'aisle') && (
              <div className="text-xs text-slate-600">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-slate-400 mt-1">Add child locations using + buttons in the tree</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Bulk Update' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Link2 size={16} className="text-indigo-600" /> Bulk Assign by Category
            </h3>
            <p className="text-xs text-slate-500">When a book&apos;s category changes, the system suggests the default rack for that category.</p>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Category</span>
              <select value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2">
                {(data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Target Shelf</span>
              <select value={bulkShelfId} onChange={(e) => setBulkShelfId(e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2">
                <option value="">— Auto from category default —</option>
                {allShelves.map((s) => (
                  <option key={s.id} value={s.id}>{s.path} ({s.currentOccupancy}/{s.capacity})</option>
                ))}
              </select>
            </label>
            {suggestion && <p className="text-xs text-indigo-600">Suggested: {suggestion}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleSuggest()} className="px-3 py-2 text-xs border border-indigo-200 text-indigo-700 rounded-lg">
                Suggest Rack
              </button>
              <button type="button" onClick={() => void handleBulkAssign()} className="px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg font-semibold">
                Bulk Assign Unassigned
              </button>
              <button type="button" onClick={() => void handleBulkAssign(true)} className="px-3 py-2 text-xs border border-amber-300 text-amber-800 rounded-lg">
                Force (ignore capacity)
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Unassigned Copies ({data?.unassignedCopies.length ?? 0})</h3>
            <div className="max-h-[360px] overflow-y-auto space-y-1">
              {(data?.unassignedCopies ?? []).map((c) => (
                <label key={c.copyId} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCopyIds.includes(c.copyId)}
                    onChange={(e) => {
                      setSelectedCopyIds((prev) => e.target.checked
                        ? [...prev, c.copyId]
                        : prev.filter((id) => id !== c.copyId));
                    }}
                  />
                  <span className="font-mono text-[10px]">{c.accessionNo}</span>
                  <span className="flex-1 truncate">{c.title}</span>
                  <StatusBadge status="ACTIVE" />
                </label>
              ))}
            </div>
            {selectedCopyIds.length > 0 && (
              <button
                type="button"
                onClick={() => void handleAssignSelected()}
                className="mt-3 w-full py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
              >
                Assign {selectedCopyIds.length} selected to shelf
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Space Utilization Report</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="text-left py-2">Rack</th>
                  <th className="text-left">Location</th>
                  <th className="text-right">Occ/Cap</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {(data?.spaceUtilizationReport ?? []).map((r) => (
                  <tr key={r.rackId} className="border-b border-slate-50">
                    <td className="py-2 font-medium">{r.rackNumber}</td>
                    <td className="text-slate-500">{r.floor}, {r.aisle}</td>
                    <td className="text-right">{r.currentOccupancy}/{r.capacity}</td>
                    <td className="text-right font-semibold">{r.utilizationPct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" /> Misplaced Books
            </h3>
            <p className="text-[10px] text-slate-500 mb-2">For stock verification — recorded vs expected shelf location</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(data?.misplacedBooks ?? []).map((b) => (
                <div key={b.copyId} className="p-2 bg-amber-50 border border-amber-100 rounded-lg text-xs">
                  <p className="font-semibold text-slate-800">{b.title}</p>
                  <p className="text-[10px] font-mono">{b.accessionNo}</p>
                  <p className="text-red-600">Recorded: {b.recordedLocation}</p>
                  <p className="text-emerald-700">Expected: {b.expectedLocation}</p>
                </div>
              ))}
              {!data?.misplacedBooks.length && (
                <p className="text-xs text-slate-400 text-center py-8">No misplaced books detected</p>
              )}
            </div>
          </div>
        </div>
      )}

      <AcademicModal open={modal === 'floor'} onClose={() => setModal(null)} title="Add Floor">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Branch</span>
            <select value={floorForm.branchId} onChange={(e) => setFloorForm({ ...floorForm, branchId: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2">
              {(data?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Floor Name *</span>
            <input value={floorForm.locationName} onChange={(e) => setFloorForm({ ...floorForm, locationName: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2" placeholder="Floor 1" />
          </label>
          <button type="button" disabled={saving} onClick={() => void handleCreateFloor()} className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg">Create Floor</button>
        </div>
      </AcademicModal>

      <AcademicModal open={modal === 'aisle'} onClose={() => setModal(null)} title="Add Aisle">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Aisle Name *</span>
            <input value={aisleForm.locationName} onChange={(e) => setAisleForm({ ...aisleForm, locationName: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2" placeholder="Aisle B" />
          </label>
          <button type="button" disabled={saving} onClick={() => void handleCreateAisle()} className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg">Create Aisle</button>
        </div>
      </AcademicModal>

      <AcademicModal open={modal === 'rack'} onClose={() => setModal(null)} title="Add Rack">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Rack Number *</span>
            <input value={rackForm.rackNumber} onChange={(e) => setRackForm({ ...rackForm, rackNumber: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Capacity *</span>
            <input type="number" value={rackForm.capacity} onChange={(e) => setRackForm({ ...rackForm, capacity: Number(e.target.value) })} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Asset Tag (Inventory)</span>
            <input value={rackForm.assetTag} onChange={(e) => setRackForm({ ...rackForm, assetTag: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2" placeholder="AST-RACK-001" />
          </label>
          <button type="button" disabled={saving} onClick={() => void handleCreateRack()} className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg">Create Rack</button>
        </div>
      </AcademicModal>

      <AcademicModal open={modal === 'shelf'} onClose={() => setModal(null)} title="Add Shelf">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Shelf Number *</span>
            <input value={shelfForm.shelfNumber} onChange={(e) => setShelfForm({ ...shelfForm, shelfNumber: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Capacity</span>
            <input type="number" value={shelfForm.capacity} onChange={(e) => setShelfForm({ ...shelfForm, capacity: Number(e.target.value) })} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <button type="button" disabled={saving} onClick={() => void handleCreateShelf()} className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg">Create Shelf</button>
        </div>
      </AcademicModal>
    </div>
  );
}
