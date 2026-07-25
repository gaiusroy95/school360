import * as XLSX from 'xlsx';

export type StopImportRow = {
  stopCode?: string;
  stopName: string;
  stopType?: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  address?: string;
  city?: string;
  pincode?: string;
  routeCode?: string;
  sequence?: number;
  geofenceRadiusMeters?: number;
  notes?: string;
};

function getCell(row: Record<string, unknown>, ...names: string[]) {
  const keys = Object.keys(row);
  const found = keys.find((k) => names.some((n) => k.trim().toLowerCase() === n.toLowerCase()));
  return found ? row[found] : '';
}

function toNum(value: unknown): number {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

export function parseStopWorkbook(file: ArrayBuffer): StopImportRow[] {
  const wb = XLSX.read(file, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return matrix
    .map((row) => {
      const lat = toNum(getCell(row, 'Latitude', 'Lat', 'GPS Lat'));
      const lng = toNum(getCell(row, 'Longitude', 'Lng', 'Long', 'GPS Lng'));
      const seqRaw = getCell(row, 'Sequence', 'Seq', 'Stop Order');
      const radiusRaw = getCell(row, 'Geofence Radius (m)', 'Radius', 'Geofence Radius');
      return {
        stopCode: String(getCell(row, 'Stop Code', 'Code') || '').trim() || undefined,
        stopName: String(getCell(row, 'Stop Name', 'Name', 'Stop') || '').trim(),
        stopType: String(getCell(row, 'Stop Type', 'Type') || 'PICKUP').trim().toUpperCase(),
        latitude: lat,
        longitude: lng,
        landmark: String(getCell(row, 'Landmark') || '').trim(),
        address: String(getCell(row, 'Address') || '').trim(),
        city: String(getCell(row, 'City') || '').trim(),
        pincode: String(getCell(row, 'Pincode', 'PIN') || '').trim(),
        routeCode: String(getCell(row, 'Route Code', 'Route') || '').trim(),
        sequence: seqRaw ? Number(seqRaw) : undefined,
        geofenceRadiusMeters: radiusRaw ? Number(radiusRaw) : undefined,
        notes: String(getCell(row, 'Notes', 'Remark') || '').trim(),
      };
    })
    .filter((r) => r.stopName && Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
}

export function downloadStopTemplate() {
  const wb = XLSX.utils.book_new();
  const rows = [
    ['Stop Code', 'Stop Name', 'Stop Type', 'Latitude', 'Longitude', 'Landmark', 'Address', 'City', 'Pincode', 'Route Code', 'Sequence', 'Geofence Radius (m)', 'Notes'],
    ['STP-0001', 'City Center', 'PICKUP', 26.9124, 75.7873, 'Near Metro', 'MI Road', 'Jaipur', '302001', 'R01', 1, 150, 'Morning pickup'],
    ['STP-0002', 'Malviya Nagar', 'PICKUP', 26.8546, 75.8142, 'Near Petrol Pump', 'Main Road', 'Jaipur', '302017', 'R01', 2, 120, ''],
    ['STP-0003', 'Vaishali Nagar', 'DROP', 26.9128, 75.7431, 'Circle', 'Sector 3', 'Jaipur', '302021', 'R02', 1, 150, 'Afternoon drop'],
    ['', 'C-Scheme', 'PICKUP', 26.9067, 75.8047, 'Statue Circle', '', 'Jaipur', '302001', 'R02', 2, 130, 'Auto code if blank'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Stops');
  XLSX.writeFile(wb, 'Transport_Stops_Geo_Template.xlsx');
}

export function exportStopsToExcel(
  stops: {
    stopCode: string; stopName: string; stopType: string;
    latitude: number; longitude: number; landmark: string;
    address: string; city: string; pincode: string;
    routeCode: string; sequenceOrder: number | null;
    geofenceRadiusMeters: number; geoValidated: boolean;
    geoTagSource: string; notes: string;
  }[],
  filename = 'Transport_Stops_Export.xlsx',
) {
  const wb = XLSX.utils.book_new();
  const header = [
    'Stop Code', 'Stop Name', 'Stop Type', 'Latitude', 'Longitude',
    'Landmark', 'Address', 'City', 'Pincode', 'Route Code', 'Sequence',
    'Geofence Radius (m)', 'Geo Validated', 'Source', 'Notes',
  ];
  const rows = stops.map((s) => [
    s.stopCode, s.stopName, s.stopType, s.latitude, s.longitude,
    s.landmark, s.address, s.city, s.pincode, s.routeCode,
    s.sequenceOrder ?? '', s.geofenceRadiusMeters,
    s.geoValidated ? 'Yes' : 'No', s.geoTagSource, s.notes,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), 'Stops');
  XLSX.writeFile(wb, filename);
}

export const GOOGLE_MAPS_PASTE_HELP = `Paste one stop per line. Formats supported:
• Stop Name | https://maps.google.com/?q=26.9124,75.7873
• Stop Name | 26.9124, 75.7873
• https://www.google.com/maps/@26.9124,75.7873,17z
• 26.9124, 75.7873`;
