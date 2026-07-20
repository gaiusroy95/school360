import { useState } from 'react';
import { Download, Plus, Trash2, UploadCloud } from 'lucide-react';
import type { SetupTileSchema } from '../../../lib/institutionSetupSchema';
import {
  downloadMasterListTemplate,
  parseMasterListWorkbook,
  type RecordColumn,
} from './masterListExcel';

export function RecordsEditor({
  schema,
  columns,
  records,
  onAdd,
  onChange,
  onRemove,
  onReplaceMasterList,
}: {
  schema: SetupTileSchema;
  columns: RecordColumn[];
  records: Record<string, string>[];
  onAdd: () => void;
  onChange: (index: number, key: string, value: string) => void;
  onRemove: (index: number) => void;
  onReplaceMasterList: (columns: RecordColumn[], rows: Record<string, string>[]) => void;
}) {
  const [importError, setImportError] = useState('');
  const [importMessage, setImportMessage] = useState('');

  const handleUpload = async (file: File) => {
    setImportError('');
    setImportMessage('');
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseMasterListWorkbook(buffer);
      if (!parsed.columns.length) {
        throw new Error('No columns found in Excel. Row 1 must contain headers.');
      }
      onReplaceMasterList(parsed.columns, parsed.rows);
      setImportMessage(
        `Loaded from Excel (${parsed.columns.length} columns, ${parsed.rows.length} row${
          parsed.rows.length === 1 ? '' : 's'
        }). Click Save Configuration to apply.`,
      );
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Failed to import Excel');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Records / Master List</h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload Excel to replace this table on screen. Changes are kept only after you click Save Configuration.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadMasterListTemplate(schema, columns, records)}
            className="px-3 py-2 border border-emerald-500 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-50 flex items-center gap-1"
          >
            <Download size={14} /> Excel Template
          </button>
          <label className="px-3 py-2 border border-indigo-500 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 flex items-center gap-1 cursor-pointer">
            <UploadCloud size={14} /> Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            onClick={onAdd}
            className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <Plus size={14} /> Add Row
          </button>
        </div>
      </div>

      {importError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{importError}</p>
      )}
      {importMessage && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">{importMessage}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 font-semibold whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={Math.max(columns.length, 1) + 1} className="px-3 py-6 text-center text-slate-400">
                  No records yet. Upload an Excel file — its header row becomes this table’s columns.
                </td>
              </tr>
            )}
            {records.map((row, i) => (
              <tr key={i} className="border-b border-slate-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-2 py-2">
                    <input
                      className="w-full min-w-[120px] border border-slate-200 rounded px-2 py-1.5"
                      value={row[col.key] || ''}
                      onChange={(e) => onChange(i, col.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <button type="button" onClick={() => onRemove(i)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
