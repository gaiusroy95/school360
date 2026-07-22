import { api } from './api';

export type StudentCategory = {
  id: string;
  categoryId: string;
  categoryGroup: string;
  categoryGroupLabel: string;
  name: string;
  shortCode: string;
  categoryType: string;
  categoryTypeLabel: string;
  description: string;
  status: string;
  statusLabel: string;
  displayOrder: number;
  colorCode: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentCategoryAssignment = {
  id: string;
  recordId: string;
  studentId: string;
  categoryId: string;
  name: string;
  classGroup: string;
  details: string;
  categoryName: string;
  categoryGroup: string;
  categoryGroupLabel: string;
  categoryColor: string;
  categoryIcon: string;
  status: string;
  statusLabel: string;
  updatedAt: string;
  createdAt: string;
};

export type CategorySummary = {
  totalCategories: number;
  activeOpen: number;
  pending: number;
  thisMonth: number;
};

export type CategoryInput = {
  categoryGroup: string;
  name: string;
  shortCode: string;
  categoryType?: string;
  description?: string;
  status?: string;
  displayOrder?: number;
  colorCode?: string;
  icon?: string;
};

export const CATEGORY_GROUPS = [
  { value: 'ADMISSION', label: 'Admission Categories' },
  { value: 'TALENT', label: 'Talent Category' },
  { value: 'ATTENDANCE', label: 'Attendance Category' },
  { value: 'GOVERNMENT_RESERVATION', label: 'Government Reservation Category' },
];

export const ASSIGNMENT_STATUSES = ['ACTIVE', 'PENDING', 'DRAFT', 'DUE', 'OPEN', 'COMPLETED', 'APPROVED', 'PAID'];

export async function fetchCategoryMeta() {
  return api<{ summary: CategorySummary; groupCounts: { group: string; count: number }[] }>(
    '/api/student-categories/meta',
  );
}

export async function fetchCategories(params?: {
  q?: string;
  categoryGroup?: string;
  status?: string;
  categoryType?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.categoryGroup) q.set('categoryGroup', params.categoryGroup);
  if (params?.status) q.set('status', params.status);
  if (params?.categoryType) q.set('categoryType', params.categoryType);
  const qs = q.toString();
  return api<{ categories: StudentCategory[] }>(`/api/student-categories${qs ? `?${qs}` : ''}`);
}

export async function fetchCategoryAssignments(params?: {
  q?: string;
  categoryGroup?: string;
  status?: string;
  className?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.categoryGroup) q.set('categoryGroup', params.categoryGroup);
  if (params?.status) q.set('status', params.status);
  if (params?.className) q.set('className', params.className);
  const qs = q.toString();
  return api<{ assignments: StudentCategoryAssignment[] }>(
    `/api/student-categories/assignments${qs ? `?${qs}` : ''}`,
  );
}

export async function seedDefaultCategories() {
  return api<{ created: number; message: string }>('/api/student-categories/seed', { method: 'POST' });
}

export async function createCategory(payload: CategoryInput) {
  return api<{ category: StudentCategory }>('/api/student-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(id: string, payload: Partial<CategoryInput>) {
  return api<{ category: StudentCategory }>(`/api/student-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(id: string) {
  return api<{ ok: boolean }>(`/api/student-categories/${id}`, { method: 'DELETE' });
}

export async function createCategoryAssignment(payload: {
  studentId: string;
  categoryId: string;
  details?: string;
  status?: string;
}) {
  return api<{ assignment: StudentCategoryAssignment }>('/api/student-categories/assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCategoryAssignment(
  id: string,
  payload: { details?: string; status?: string; categoryId?: string },
) {
  return api<{ assignment: StudentCategoryAssignment }>(`/api/student-categories/assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCategoryAssignment(id: string) {
  return api<{ ok: boolean }>(`/api/student-categories/assignments/${id}`, { method: 'DELETE' });
}

export async function exportCategoryData() {
  return api<{ categories: StudentCategory[]; assignments: StudentCategoryAssignment[] }>(
    '/api/student-categories/export',
  );
}

export async function importCategoryData(payload: {
  categories?: CategoryInput[];
  assignments?: Record<string, unknown>[];
}) {
  return api<{ categoriesCreated: number; assignmentsCreated: number; errors: { row: number; message: string }[] }>(
    '/api/student-categories/import',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}
