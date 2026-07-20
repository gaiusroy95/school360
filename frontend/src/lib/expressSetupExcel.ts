import * as XLSX from 'xlsx';
import {
  INSTITUTION_SETUP_TILES,
  emptyTileData,
  type SetupTileSchema,
} from './institutionSetupSchema';

export type ParsedExpressSetup = {
  tiles: Record<string, Record<string, unknown>>;
  summary: { sheet: string; fields: number; records: number }[];
  errors: string[];
};

function settingsSheetName(tile: SetupTileSchema) {
  return tile.sheetName;
}

function recordsSheetName(tile: SetupTileSchema) {
  return `${tile.sheetName} Data`.slice(0, 31);
}

/** Build Master Institution Setup Excel (one settings sheet per tile + data sheets where needed). */
export function downloadInstitutionSetupTemplate() {
  const wb = XLSX.utils.book_new();

  // Index sheet
  const indexRows = [
    ['Tile #', 'Tile Name', 'Settings Sheet', 'Data Sheet', 'Description'],
    ...INSTITUTION_SETUP_TILES.map((tile, i) => [
      String(i + 1),
      tile.title,
      settingsSheetName(tile),
      tile.hasRecords ? recordsSheetName(tile) : '',
      tile.desc,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(indexRows), '00 Index');

  for (const tile of INSTITUTION_SETUP_TILES) {
    const rows: string[][] = [['Section', 'Field Key', 'Field Label', 'Value', 'Required', 'Notes']];
    for (const section of tile.sections) {
      for (const field of section.fields) {
        rows.push([
          section.title,
          field.key,
          field.label,
          '',
          field.required ? 'Yes' : 'No',
          field.placeholder || field.help || (field.options || []).join(' | '),
        ]);
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), settingsSheetName(tile));

    if (tile.hasRecords && tile.recordColumns) {
      const header = tile.recordColumns.map((c) => c.label);
      const keys = tile.recordColumns.map((c) => c.key);
      const dataRows = [header, ...(tile.sampleRecords || []).map((r) => keys.map((k) => r[k] || ''))];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dataRows), recordsSheetName(tile));
    }
  }

  XLSX.writeFile(wb, 'Institution_Master_Setup.xlsx');
}

function sheetToMatrix(wb: XLSX.WorkBook, name: string): string[][] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
}

function parseSettingsSheet(tile: SetupTileSchema, matrix: string[][]): Record<string, Record<string, string>> {
  const base = emptyTileData(tile) as { sections: Record<string, Record<string, string>> };
  const sections = { ...base.sections };

  // Expect header row then Section | Field Key | Field Label | Value | ...
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i] || [];
    const section = String(row[0] || '').trim();
    const fieldKey = String(row[1] || '').trim();
    const value = String(row[3] ?? '').trim();
    if (!section || !fieldKey) continue;
    if (!sections[section]) sections[section] = {};
    sections[section][fieldKey] = value;
  }
  return sections;
}

function parseRecordsSheet(tile: SetupTileSchema, matrix: string[][]): Record<string, string>[] {
  if (!tile.recordColumns || matrix.length < 2) return [];
  const header = (matrix[0] || []).map((h) => String(h).trim().toLowerCase());
  const colIndex = tile.recordColumns.map((col) => {
    const idx = header.findIndex((h) => h === col.label.toLowerCase() || h === col.key.toLowerCase());
    return { key: col.key, idx };
  });

  const records: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    if (row.every((c) => String(c).trim() === '')) continue;
    const obj: Record<string, string> = {};
    let hasAny = false;
    for (const { key, idx } of colIndex) {
      const val = idx >= 0 ? String(row[idx] ?? '').trim() : '';
      obj[key] = val;
      if (val) hasAny = true;
    }
    if (hasAny) records.push(obj);
  }
  return records;
}

export function parseInstitutionSetupWorkbook(file: ArrayBuffer): ParsedExpressSetup {
  const wb = XLSX.read(file, { type: 'array' });
  const tiles: Record<string, Record<string, unknown>> = {};
  const summary: ParsedExpressSetup['summary'] = [];
  const errors: string[] = [];

  for (const tile of INSTITUTION_SETUP_TILES) {
    const settingsName = settingsSheetName(tile);
    const settingsMatrix = sheetToMatrix(wb, settingsName);
    if (!settingsMatrix.length) {
      errors.push(`Missing sheet: ${settingsName}`);
      continue;
    }

    const sections = parseSettingsSheet(tile, settingsMatrix);
    let fieldCount = 0;
    for (const section of Object.values(sections)) {
      fieldCount += Object.values(section).filter((v) => String(v).trim() !== '').length;
    }

    let records: Record<string, string>[] | undefined;
    let recordCount = 0;
    if (tile.hasRecords) {
      const dataName = recordsSheetName(tile);
      const dataMatrix = sheetToMatrix(wb, dataName);
      if (!dataMatrix.length) {
        errors.push(`Missing data sheet: ${dataName}`);
      } else {
        records = parseRecordsSheet(tile, dataMatrix);
        recordCount = records.length;
      }
    }

    // Light required-field validation
    for (const section of tile.sections) {
      for (const field of section.fields) {
        if (!field.required) continue;
        const val = sections[section.title]?.[field.key];
        if (!val || !String(val).trim()) {
          // warn but don't hard-fail entire import — collect as soft errors
          errors.push(`${tile.title} → ${section.title}: "${field.label}" is required`);
        }
      }
    }

    tiles[tile.key] = {
      sections,
      ...(tile.hasRecords ? { records: records || [] } : {}),
    };

    summary.push({
      sheet: tile.title,
      fields: fieldCount,
      records: recordCount,
    });
  }

  return { tiles, summary, errors };
}
