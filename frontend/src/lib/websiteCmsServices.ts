import { api } from './api';

function qs(params?: Record<string, string | undefined>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type CmsKpi = {
  value: number | string;
  subtitle: string;
  chartColor?: string;
  noSparkline?: boolean;
};

export type CmsDashboard = {
  period: string;
  periods: string[];
  siteUrl: string;
  siteName: string;
  heroTitle: string;
  heroImageUrl: string;
  publishStatus: string;
  themeName: string;
  themeVersion: string;
  lastUpdated: string;
  sslEnabled: boolean;
  kpis: {
    totalPages: CmsKpi;
    blogPosts: CmsKpi;
    mediaFiles: CmsKpi;
    formSubmissions: CmsKpi;
    websiteVisitors: CmsKpi;
    seoScore: CmsKpi;
  };
  visitorTrends: { day: string; visitors: number }[];
  visitorSummary: {
    totalVisitors: number;
    uniqueVisitors: number;
    pageViews: number;
    avgSession: string;
  };
  topPages: { name: string; views: number; max: number }[];
  seoOverview: {
    score: number;
    label: string;
    checklist: { name: string; score: string; color?: string }[];
  };
  recentPages: { title: string; type: string; status: string; date: string }[];
  blogPosts: { title: string; author: string; status: string; date: string }[];
  totalPages: number;
  totalPosts: number;
  mediaLibrary: {
    images: number;
    documents: number;
    videos: number;
    audio: number;
    storageUsedGb: number;
    storageLimitGb: number;
    storagePercent: number;
  };
  formOverview: { name: string; value: number; color: string; percent: string }[];
  totalFormSubmissions: number;
  deviceOverview: { name: string; value: number; color: string; percent: string }[];
  recentActivity: { text: string; by: string; time: string; iconType: string; bg: string }[];
  importantNotices: { text: string; date: string; iconType: string; bg: string }[];
  quickActions: { label: string; target: string }[];
  keyBenefits: { title: string; desc: string; iconType?: string; bg?: string }[];
  permissions?: { canCreate: boolean; canPublish: boolean };
};

export type CmsModuleName =
  | 'pages'
  | 'blog'
  | 'media'
  | 'menus'
  | 'sliders'
  | 'testimonials'
  | 'forms'
  | 'popups'
  | 'seo'
  | 'theme'
  | 'backup'
  | 'analytics';

export type CmsModuleColumn = {
  key: string;
  label: string;
};

export type CmsModuleField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export type CmsModuleItem = Record<string, unknown> & { id: string };

export type CmsModuleManagement = {
  module: CmsModuleName;
  title: string;
  description: string;
  columns: CmsModuleColumn[];
  items: CmsModuleItem[];
  totalItems: number;
  createFields: CmsModuleField[];
  permissions: { canCreate: boolean; canEdit: boolean; canDelete: boolean };
  kpis?: { label: string; value: string | number }[];
};

export async function fetchCmsDashboard(seed?: boolean, period?: string) {
  const params: Record<string, string | undefined> = { period };
  if (seed) params.seed = '1';
  return api<CmsDashboard>(`/api/website-cms/dashboard${qs(params)}`);
}

export async function fetchCmsModule(module: CmsModuleName, seed?: boolean) {
  const params: Record<string, string | undefined> = {};
  if (seed) params.seed = '1';
  return api<CmsModuleManagement>(`/api/website-cms/modules/${module}${qs(params)}`);
}

export async function createCmsItem(module: CmsModuleName, payload: Record<string, unknown>) {
  return api<{ message: string; item: CmsModuleItem; data?: CmsModuleManagement }>(
    `/api/website-cms/modules/${module}`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function updateCmsItem(module: CmsModuleName, id: string, payload: Record<string, unknown>) {
  return api<{ message: string; item: CmsModuleItem; data?: CmsModuleManagement }>(
    `/api/website-cms/modules/${module}/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}
