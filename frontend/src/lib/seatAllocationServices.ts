import { api } from './api';

export type SeatCapacity = {
  id: string;
  className: string;
  sectionName: string;
  totalSeats: number;
  academicYear: string;
  sortOrder: number;
  allocatedCount: number;
  remainingSeats: number;
  createdAt: string;
  updatedAt: string;
};

export type SeatCapacityInput = {
  id?: string;
  className: string;
  sectionName: string;
  totalSeats: number;
  sortOrder?: number;
};

export type SeatAllocation = {
  id: string;
  className: string;
  sectionName: string;
  meritRank: number;
  classMeritRank: number;
  entranceScore: number;
  status: string;
  statusKey: string;
  academicYear: string;
  allocatedAt: string;
  allocatedBy: string;
  notes: string;
  applicationDbId: string;
  applicationId: string;
  studentName: string;
  classApplied: string;
  email: string;
  mobile: string;
  applicationStatus: string;
};

export type SeatAllocationMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  setupSuggestions: Array<{ className: string; sectionName: string; capacity: number }>;
  classesFromSetup: string[];
};

export async function fetchSeatAllocationMeta() {
  return api<SeatAllocationMeta>('/api/seat-allocation/meta');
}

export async function fetchSeatCapacities(academicYear?: string) {
  const q = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
  return api<{
    academicYear: string;
    capacities: SeatCapacity[];
    byClass: Array<{
      className: string;
      totalSeats: number;
      allocated: number;
      remaining: number;
      sections: SeatCapacity[];
    }>;
    summary: {
      totalSeats: number;
      allocated: number;
      sections: number;
      classes: number;
    };
  }>(`/api/seat-allocation/capacities${q}`);
}

export async function saveSeatCapacities(academicYear: string, capacities: SeatCapacityInput[]) {
  return api<{ academicYear: string; capacities: SeatCapacity[]; message: string }>(
    '/api/seat-allocation/capacities',
    {
      method: 'PUT',
      body: JSON.stringify({ academicYear, capacities }),
    },
  );
}

export async function importSeatCapacitiesFromSetup(academicYear: string, overwrite = false) {
  return api<{ academicYear: string; created: number; updated: number; message: string }>(
    '/api/seat-allocation/capacities/import-from-setup',
    {
      method: 'POST',
      body: JSON.stringify({ academicYear, overwrite }),
    },
  );
}

export async function deleteSeatCapacity(id: string) {
  return api<{ ok: boolean }>(`/api/seat-allocation/capacities/${id}`, { method: 'DELETE' });
}

export async function fetchSeatAllocations(params?: {
  academicYear?: string;
  className?: string;
  status?: string;
  q?: string;
}) {
  const q = new URLSearchParams();
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.className) q.set('className', params.className);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  if (params?.q) q.set('q', params.q);
  const qs = q.toString();
  return api<{
    academicYear: string;
    summary: { total: number; allocated: number; waitlisted: number };
    allocations: SeatAllocation[];
  }>(`/api/seat-allocation${qs ? `?${qs}` : ''}`);
}

export async function runSeatAllocation(payload?: {
  academicYear?: string;
  clearExisting?: boolean;
  className?: string;
}) {
  return api<{
    academicYear: string;
    candidatesConsidered: number;
    created: number;
    allocated: number;
    waitlisted: number;
    message: string;
  }>('/api/seat-allocation/run', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function clearSeatAllocations(academicYear: string) {
  return api<{ ok: boolean; deleted: number; message: string }>(
    `/api/seat-allocation?academicYear=${encodeURIComponent(academicYear)}`,
    { method: 'DELETE' },
  );
}
