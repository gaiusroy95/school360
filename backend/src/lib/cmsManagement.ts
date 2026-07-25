import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export type CmsPeriod = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR';

export type CmsModule =
  | 'pages'
  | 'blog'
  | 'media'
  | 'menus'
  | 'sliders'
  | 'testimonials'
  | 'forms'
  | 'popups'
  | 'seo'
  | 'backups'
  | 'analytics';

const VALID_MODULES = new Set<string>([
  'pages', 'blog', 'media', 'menus', 'sliders', 'testimonials',
  'forms', 'popups', 'seo', 'backups', 'analytics', 'theme',
]);

type CmsFieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

type CmsColumnDef = { key: string; label: string };

type CmsModuleDef = {
  title: string;
  description: string;
  columns: CmsColumnDef[];
  createFields: CmsFieldDef[];
  canCreate?: boolean;
  buildKpis?: (rows: Array<Record<string, unknown>>) => Array<{ label: string; value: string | number }>;
  formatRow?: (row: Record<string, unknown>) => Record<string, unknown>;
};

const PUBLISH_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
];

const CMS_MODULE_DEFS: Record<string, CmsModuleDef> = {
  pages: {
    title: 'Pages Management',
    description: 'Create and manage static and dynamic website pages',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'slug', label: 'Slug' },
      { key: 'pageType', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'viewCount', label: 'Views' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    createFields: [
      { key: 'title', label: 'Page Title', type: 'text', required: true },
      { key: 'slug', label: 'URL Slug', type: 'text', placeholder: 'auto-generated if empty' },
      { key: 'pageType', label: 'Type', type: 'select', options: [
        { value: 'STATIC', label: 'Static' },
        { value: 'DYNAMIC', label: 'Dynamic' },
      ] },
      { key: 'status', label: 'Status', type: 'select', options: PUBLISH_STATUS_OPTIONS },
      { key: 'content', label: 'Content', type: 'textarea' },
    ],
    buildKpis: (rows) => [
      { label: 'Total Pages', value: rows.length },
      { label: 'Published', value: rows.filter((r) => r.status === 'PUBLISHED').length },
      { label: 'Drafts', value: rows.filter((r) => r.status === 'DRAFT').length },
    ],
  },
  blog: {
    title: 'Blog Management',
    description: 'Publish news, events and articles',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'author', label: 'Author' },
      { key: 'status', label: 'Status' },
      { key: 'viewCount', label: 'Views' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    createFields: [
      { key: 'title', label: 'Post Title', type: 'text', required: true },
      { key: 'author', label: 'Author', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: PUBLISH_STATUS_OPTIONS },
      { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
      { key: 'content', label: 'Content', type: 'textarea' },
    ],
    buildKpis: (rows) => [
      { label: 'Total Posts', value: rows.length },
      { label: 'Published', value: rows.filter((r) => r.status === 'PUBLISHED').length },
    ],
  },
  media: {
    title: 'Media Library',
    description: 'Upload and organize images, documents and videos',
    columns: [
      { key: 'fileName', label: 'File' },
      { key: 'fileType', label: 'Type' },
      { key: 'folder', label: 'Folder' },
      { key: 'fileSizeMb', label: 'Size (MB)' },
      { key: 'uploadedBy', label: 'Uploaded By' },
      { key: 'createdAt', label: 'Uploaded' },
    ],
    createFields: [
      { key: 'fileName', label: 'File Name', type: 'text', required: true },
      { key: 'fileType', label: 'Type', type: 'select', options: [
        { value: 'IMAGE', label: 'Image' },
        { value: 'DOCUMENT', label: 'Document' },
        { value: 'VIDEO', label: 'Video' },
        { value: 'AUDIO', label: 'Audio' },
      ] },
      { key: 'fileUrl', label: 'File URL', type: 'text' },
      { key: 'folder', label: 'Folder', type: 'text' },
      { key: 'altText', label: 'Alt Text', type: 'text' },
    ],
  },
  menus: {
    title: 'Menus & Navigation',
    description: 'Manage header, footer and sidebar navigation',
    columns: [
      { key: 'label', label: 'Label' },
      { key: 'url', label: 'URL' },
      { key: 'menuLocation', label: 'Location' },
      { key: 'sortOrder', label: 'Order' },
      { key: 'isActive', label: 'Active' },
    ],
    createFields: [
      { key: 'label', label: 'Menu Label', type: 'text', required: true },
      { key: 'url', label: 'URL', type: 'text', required: true },
      { key: 'menuLocation', label: 'Location', type: 'select', options: [
        { value: 'HEADER', label: 'Header' },
        { value: 'FOOTER', label: 'Footer' },
        { value: 'SIDEBAR', label: 'Sidebar' },
      ] },
    ],
  },
  sliders: {
    title: 'Sliders & Banners',
    description: 'Manage homepage and landing page sliders',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'location', label: 'Location' },
      { key: 'sortOrder', label: 'Order' },
      { key: 'isActive', label: 'Active' },
    ],
    createFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'imageUrl', label: 'Image URL', type: 'text' },
      { key: 'ctaLabel', label: 'Button Label', type: 'text' },
      { key: 'ctaUrl', label: 'Button URL', type: 'text' },
    ],
  },
  testimonials: {
    title: 'Testimonials',
    description: 'Showcase parent and student testimonials',
    columns: [
      { key: 'authorName', label: 'Name' },
      { key: 'authorRole', label: 'Role' },
      { key: 'rating', label: 'Rating' },
      { key: 'isFeatured', label: 'Featured' },
      { key: 'isActive', label: 'Active' },
    ],
    createFields: [
      { key: 'authorName', label: 'Name', type: 'text', required: true },
      { key: 'authorRole', label: 'Role', type: 'text' },
      { key: 'content', label: 'Testimonial', type: 'textarea', required: true },
      { key: 'rating', label: 'Rating (1-5)', type: 'number' },
    ],
  },
  forms: {
    title: 'Forms Management',
    description: 'Create enquiry and contact forms',
    columns: [
      { key: 'formName', label: 'Form' },
      { key: 'formCode', label: 'Code' },
      { key: 'status', label: 'Status' },
      { key: 'submissionCount', label: 'Submissions' },
    ],
    createFields: [
      { key: 'formName', label: 'Form Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'notifyEmail', label: 'Notify Email', type: 'text' },
    ],
  },
  popups: {
    title: 'Popups & Notices',
    description: 'Manage popups and announcement notices',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'popupType', label: 'Type' },
      { key: 'triggerType', label: 'Trigger' },
      { key: 'isActive', label: 'Active' },
    ],
    createFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'content', label: 'Content', type: 'textarea' },
      { key: 'popupType', label: 'Type', type: 'select', options: [
        { value: 'MODAL', label: 'Modal' },
        { value: 'BANNER', label: 'Banner' },
      ] },
    ],
  },
  seo: {
    title: 'SEO Management',
    description: 'Manage meta tags and SEO scores',
    columns: [
      { key: 'entityType', label: 'Entity' },
      { key: 'metaTitle', label: 'Meta Title' },
      { key: 'score', label: 'Score' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    createFields: [
      { key: 'entityType', label: 'Entity Type', type: 'select', options: [
        { value: 'SITE', label: 'Site' },
        { value: 'PAGE', label: 'Page' },
        { value: 'BLOG', label: 'Blog Post' },
      ] },
      { key: 'metaTitle', label: 'Meta Title', type: 'text', required: true },
      { key: 'metaDescription', label: 'Meta Description', type: 'textarea' },
      { key: 'score', label: 'SEO Score', type: 'number' },
    ],
  },
  backups: {
    title: 'Backup & Restore',
    description: 'Create and manage website backups',
    columns: [
      { key: 'backupName', label: 'Backup' },
      { key: 'backupType', label: 'Type' },
      { key: 'fileSizeMb', label: 'Size (MB)' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created' },
    ],
    createFields: [
      { key: 'backupName', label: 'Backup Name', type: 'text', required: true },
      { key: 'backupType', label: 'Type', type: 'select', options: [
        { value: 'FULL', label: 'Full' },
        { value: 'PARTIAL', label: 'Partial' },
      ] },
    ],
  },
  analytics: {
    title: 'Analytics & Reports',
    description: 'Track visitors, page views and website performance',
    columns: [
      { key: 'analyticsDate', label: 'Date' },
      { key: 'visitors', label: 'Visitors' },
      { key: 'uniqueVisitors', label: 'Unique' },
      { key: 'pageViews', label: 'Page Views' },
      { key: 'avgSession', label: 'Avg Session' },
      { key: 'desktopViews', label: 'Desktop' },
      { key: 'mobileViews', label: 'Mobile' },
      { key: 'tabletViews', label: 'Tablet' },
    ],
    createFields: [
      { key: 'analyticsDate', label: 'Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { key: 'visitors', label: 'Visitors', type: 'number' },
      { key: 'uniqueVisitors', label: 'Unique Visitors', type: 'number' },
      { key: 'pageViews', label: 'Page Views', type: 'number' },
      { key: 'avgSessionSec', label: 'Avg Session (seconds)', type: 'number' },
      { key: 'desktopViews', label: 'Desktop Views', type: 'number' },
      { key: 'mobileViews', label: 'Mobile Views', type: 'number' },
      { key: 'tabletViews', label: 'Tablet Views', type: 'number' },
    ],
    buildKpis: (rows) => {
      const visitors = rows.reduce((s, r) => s + Number(r.visitors ?? 0), 0);
      const pageViews = rows.reduce((s, r) => s + Number(r.pageViews ?? 0), 0);
      const unique = rows.reduce((s, r) => s + Number(r.uniqueVisitors ?? 0), 0);
      return [
        { label: 'Total Visitors', value: visitors.toLocaleString('en-IN') },
        { label: 'Page Views', value: pageViews.toLocaleString('en-IN') },
        { label: 'Unique Visitors', value: unique.toLocaleString('en-IN') },
        { label: 'Days Tracked', value: rows.length },
      ];
    },
    formatRow: (row) => ({
      ...row,
      analyticsDate: row.analyticsDate instanceof Date
        ? row.analyticsDate.toISOString().slice(0, 10)
        : String(row.analyticsDate ?? '').slice(0, 10),
      avgSession: formatDuration(Number(row.avgSessionSec ?? 0)),
    }),
  },
  theme: {
    title: 'Theme & Appearance',
    description: 'Configure site theme, branding and hero section',
    columns: [
      { key: 'siteName', label: 'Site Name' },
      { key: 'themeName', label: 'Theme' },
      { key: 'themeVersion', label: 'Version' },
      { key: 'publishStatus', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    createFields: [],
    canCreate: false,
  },
};

function normalizeCmsModule(module: string) {
  if (module === 'backup') return 'backups';
  return module;
}

function serializeCmsRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...row };
  for (const [key, value] of Object.entries(out)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    }
  }
  return out;
}

const MEDIA_SPLIT = [
  { fileType: 'IMAGE', label: 'Images', count: 856, color: '#10b981', icon: 'image' },
  { fileType: 'DOCUMENT', label: 'Documents', count: 152, color: '#3b82f6', icon: 'document' },
  { fileType: 'VIDEO', label: 'Videos', count: 68, color: '#ef4444', icon: 'video' },
  { fileType: 'AUDIO', label: 'Audio', count: 24, color: '#8b5cf6', icon: 'audio' },
  { fileType: 'OTHER', label: 'Other', count: 148, color: '#64748b', icon: 'file' },
] as const;

const PAGE_SEED = [
  { title: 'Home', slug: 'home', views: 3245, status: 'PUBLISHED', date: [2025, 4, 16] as const },
  { title: 'About Us', slug: 'about-us', views: 1856, status: 'PUBLISHED', date: [2025, 4, 16] as const },
  { title: 'Admissions', slug: 'admissions', views: 1425, status: 'PUBLISHED', date: [2025, 4, 15] as const },
  { title: 'Academics', slug: 'academics', views: 1286, status: 'PUBLISHED', date: [2025, 4, 14] as const },
  { title: 'Events', slug: 'events', views: 1125, status: 'PUBLISHED', date: [2025, 4, 13] as const },
  { title: 'Gallery', slug: 'gallery', views: 985, status: 'PUBLISHED', date: [2025, 4, 12] as const },
  { title: 'Contact Us', slug: 'contact-us', views: 852, status: 'PUBLISHED', date: [2025, 4, 11] as const },
  { title: 'Blog', slug: 'blog', views: 768, status: 'PUBLISHED', date: [2025, 4, 10] as const },
  { title: 'Campus Life', slug: 'campus-life', views: 645, status: 'PUBLISHED', date: [2025, 4, 15] as const },
  { title: 'Facilities', slug: 'facilities', views: 598, status: 'PUBLISHED', date: [2025, 4, 14] as const },
];

const BLOG_SEED = [
  { title: 'Annual Day Celebration 2025', author: 'Admin', status: 'PUBLISHED', date: [2025, 4, 17] as const },
  { title: 'Science Exhibition Highlights', author: 'Admin', status: 'PUBLISHED', date: [2025, 4, 16] as const },
  { title: 'Tips for Exam Preparation', author: 'Teacher', status: 'PUBLISHED', date: [2025, 4, 15] as const },
  { title: 'Summer Camp Registration Open', author: 'Admin', status: 'DRAFT', date: [2025, 4, 14] as const },
  { title: 'Why Choose Our School?', author: 'Admin', status: 'PUBLISHED', date: [2025, 4, 13] as const },
];

const FORM_SEED = [
  { code: 'ADMISSION', name: 'Admission Enquiry', submissions: 98 },
  { code: 'CONTACT', name: 'Contact Us', submissions: 76 },
  { code: 'CAREER', name: 'Career Enquiry', submissions: 45 },
  { code: 'EVENT', name: 'Event Registration', submissions: 25 },
  { code: 'OTHER', name: 'Other Forms', submissions: 10 },
];

const MAY_VISITOR_SAMPLES: Record<number, number> = {
  1: 1200, 6: 1800, 11: 1500, 16: 2200, 21: 1600, 26: 2500, 31: 2100,
};

const SEO_CHECKLIST = [
  { name: 'On-Page SEO', score: 95, color: 'text-blue-500' },
  { name: 'Meta Tags', score: 90, color: 'text-blue-500' },
  { name: 'Mobile Friendly', score: 100, color: 'text-green-500' },
  { name: 'Page Speed', score: 88, color: 'text-yellow-500' },
  { name: 'Sitemap', score: 95, color: 'text-red-500' },
  { name: 'SSL Security', score: 100, color: 'text-green-500' },
];

const dashboardCache = new Map<string, { data: unknown; expiresAt: number }>();

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function pct(num: number, den: number) {
  if (den <= 0) return '0%';
  return `${Math.round((num / den) * 1000) / 10}%`;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function dateFromParts(y: number, m: number, d: number) {
  return new Date(y, m, d);
}

function resolvePeriodRange(period: CmsPeriod) {
  const anchor = new Date(2025, 4, 1);
  if (period === 'THIS_MONTH') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: 'This Month' };
  }
  if (period === 'LAST_MONTH') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, label: 'Last Month' };
  }
  const start = new Date(anchor.getFullYear(), 0, 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end, label: 'This Year' };
}

function parsePeriod(raw?: string): CmsPeriod {
  const upper = String(raw ?? 'THIS_MONTH').toUpperCase().replace(/\s+/g, '_');
  if (upper === 'LAST_MONTH') return 'LAST_MONTH';
  if (upper === 'THIS_YEAR') return 'THIS_YEAR';
  return 'THIS_MONTH';
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function cacheKey(institutionId: string, period: CmsPeriod) {
  return `v2:${institutionId}:${period}`;
}

export async function logCmsActivity(
  institutionId: string,
  action: string,
  details: string,
  entityType = '',
  performedBy = 'Admin',
  entityId = '',
) {
  await prisma.cmsActivityLog.create({
    data: { institutionId, action, details, entityType, entityId, performedBy },
  });
}

async function ensureSiteSettings(institutionId: string) {
  let row = await prisma.cmsSiteSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.cmsSiteSettings.create({
      data: {
        institutionId,
        siteUrl: 'www.yourschool.edu.in',
        siteName: 'School Website',
        themeName: 'Education Pro',
        themeVersion: 'v2.4.1',
        publishStatus: 'PUBLISHED',
        heroTitle: 'Nurturing Minds Building Futures',
        heroImageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&h=400&fit=crop&q=80',
        storageLimitGb: 10,
        storageUsedGb: 2.45,
        seoScore: 92,
        sslEnabled: true,
        lastPublishedAt: dateFromParts(2025, 4, 16),
      },
    });
  }
  return row;
}

async function clearCmsData(institutionId: string) {
  await prisma.cmsFormSubmission.deleteMany({ where: { institutionId } });
  await prisma.cmsForm.deleteMany({ where: { institutionId } });
  await prisma.cmsActivityLog.deleteMany({ where: { institutionId } });
  await prisma.cmsAnalyticsDaily.deleteMany({ where: { institutionId } });
  await prisma.cmsBackup.deleteMany({ where: { institutionId } });
  await prisma.cmsSeoMeta.deleteMany({ where: { institutionId } });
  await prisma.cmsPopup.deleteMany({ where: { institutionId } });
  await prisma.cmsTestimonial.deleteMany({ where: { institutionId } });
  await prisma.cmsSlider.deleteMany({ where: { institutionId } });
  await prisma.cmsMenuItem.deleteMany({ where: { institutionId } });
  await prisma.cmsMediaAsset.deleteMany({ where: { institutionId } });
  await prisma.cmsBlogPost.deleteMany({ where: { institutionId } });
  await prisma.cmsPage.deleteMany({ where: { institutionId } });
  await prisma.cmsSiteSettings.deleteMany({ where: { institutionId } });
}

function buildMayDailyVisitors() {
  const days: { date: Date; visitors: number }[] = [];
  let remaining = 12458;
  const sampleDays = new Set(Object.keys(MAY_VISITOR_SAMPLES).map(Number));

  for (let day = 1; day <= 31; day++) {
    let visitors: number;
    if (MAY_VISITOR_SAMPLES[day]) {
      visitors = MAY_VISITOR_SAMPLES[day];
    } else if (day === 31) {
      visitors = Math.max(200, remaining);
    } else {
      visitors = 350 + ((day * 37) % 280);
    }
    if (!sampleDays.has(day) && day < 31) {
      remaining -= visitors;
    }
    days.push({ date: dateFromParts(2025, 4, day), visitors });
  }

  const sampleTotal = Object.values(MAY_VISITOR_SAMPLES).reduce((s, v) => s + v, 0);
  const nonSampleDays = days.filter((d) => !sampleDays.has(d.date.getDate()));
  const nonSampleTarget = 12458 - sampleTotal;
  const nonSampleSum = nonSampleDays.reduce((s, d) => s + d.visitors, 0);
  const factor = nonSampleSum > 0 ? nonSampleTarget / nonSampleSum : 1;

  return days.map((d) => {
    if (sampleDays.has(d.date.getDate())) return d;
    return { ...d, visitors: Math.max(180, Math.round(d.visitors * factor)) };
  });
}

export async function seedCmsManagement(institutionId: string) {
  const existing = await prisma.cmsPage.count({ where: { institutionId } });
  if (existing >= 50) {
    return getCmsDashboard(institutionId, 'THIS_MONTH');
  }

  await clearCmsData(institutionId);
  const settings = await ensureSiteSettings(institutionId);

  for (let i = 0; i < PAGE_SEED.length; i++) {
    const p = PAGE_SEED[i];
    const updatedAt = dateFromParts(p.date[0], p.date[1], p.date[2]);
    await prisma.cmsPage.create({
      data: {
        institutionId,
        pageCode: `PAGE-${String(i + 1).padStart(3, '0')}`,
        title: p.title,
        slug: p.slug,
        pageType: 'STATIC',
        content: `<h1>${p.title}</h1><p>Welcome to our ${p.title} page.</p>`,
        status: p.status,
        viewCount: p.views,
        seoTitle: `${p.title} | School Website`,
        seoDescription: `Learn more about ${p.title} at our school.`,
        sortOrder: i,
        publishedAt: p.status === 'PUBLISHED' ? updatedAt : null,
        updatedBy: 'Admin',
        updatedAt,
        createdAt: updatedAt,
      },
    });
  }

  const extraPageTitles = [
    'Principal Message', 'Vision & Mission', 'Infrastructure', 'Sports', 'Library',
    'Transport', 'Hostel', 'Fee Structure', 'Scholarships', 'Alumni', 'Careers',
    'News', 'Notices', 'Downloads', 'Parent Portal', 'Student Life', 'Clubs',
    'Awards', 'Achievements', 'Faculty', 'Departments', 'Curriculum', 'Examinations',
    'Results', 'Timetable', 'Calendar', 'PTM', 'Health & Safety', 'Counselling',
    'International Programs', 'Community Service', 'Green Campus', 'Media Center',
    'Virtual Tour', 'FAQ', 'Privacy Policy', 'Terms of Use', 'Sitemap', 'Staff Login',
    'Student Login', 'Online Admission', 'Fee Payment', 'Bus Routes', 'Uniform',
    'Canteen', 'Labs', 'Smart Classes', 'Robotics', 'Music & Arts',
  ];

  for (let i = 0; i < extraPageTitles.length; i++) {
    const title = extraPageTitles[i];
    const idx = PAGE_SEED.length + i + 1;
    const updatedAt = dateFromParts(2025, 3, 28 - (i % 20));
    await prisma.cmsPage.create({
      data: {
        institutionId,
        pageCode: `PAGE-${String(idx).padStart(3, '0')}`,
        title,
        slug: slugify(title),
        pageType: i % 5 === 0 ? 'LANDING' : 'STATIC',
        content: `<h1>${title}</h1>`,
        status: i % 7 === 0 ? 'DRAFT' : 'PUBLISHED',
        viewCount: 120 + (i * 17) % 400,
        sortOrder: idx,
        publishedAt: i % 7 === 0 ? null : updatedAt,
        updatedBy: i % 3 === 0 ? 'Teacher' : 'Admin',
        updatedAt,
        createdAt: updatedAt,
      },
    });
  }

  for (let i = 0; i < BLOG_SEED.length; i++) {
    const b = BLOG_SEED[i];
    const publishedAt = dateFromParts(b.date[0], b.date[1], b.date[2]);
    await prisma.cmsBlogPost.create({
      data: {
        institutionId,
        postCode: `POST-${String(i + 1).padStart(3, '0')}`,
        title: b.title,
        slug: slugify(b.title),
        excerpt: `${b.title} — read the latest updates from our school.`,
        content: `<p>${b.title}</p><p>Full article content here.</p>`,
        author: b.author,
        status: b.status,
        featuredImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=300&fit=crop',
        viewCount: 150 + i * 45,
        publishedAt: b.status === 'PUBLISHED' ? publishedAt : null,
        updatedAt: publishedAt,
        createdAt: publishedAt,
      },
    });
  }

  const blogTopics = [
    'Inter-School Debate Winners', 'New Science Lab Inauguration', 'Parent Workshop on Digital Safety',
    'Sports Day 2025 Recap', 'Art Exhibition Opens', 'Model UN Conference',
    'Coding Bootcamp for Seniors', 'Environment Day Plantation Drive', 'Literary Fest Highlights',
    'Board Exam Tips from Toppers', 'New Library Wing Opening', 'Guest Lecture Series',
    'Scholarship Announcement', 'Cultural Fest Preparations', 'Robotics Team National Rank',
    'Health Camp for Students', 'Teachers Day Celebrations', 'Independence Day Program',
    'Career Guidance Session', 'Alumni Meet 2025', 'Winter Break Notice',
    'Admission Open House', 'STEM Fair Registration', 'Music Concert Invitation',
    'Field Trip to Science Museum', 'Swimming Pool Renovation', 'New Transport Routes',
  ];

  for (let i = 0; i < blogTopics.length; i++) {
    const title = blogTopics[i];
    const idx = BLOG_SEED.length + i + 1;
    const publishedAt = dateFromParts(2025, 3, 25 - (i % 24));
    await prisma.cmsBlogPost.create({
      data: {
        institutionId,
        postCode: `POST-${String(idx).padStart(3, '0')}`,
        title,
        slug: slugify(title),
        excerpt: `${title} — school blog update.`,
        content: `<p>${title}</p>`,
        author: i % 4 === 0 ? 'Teacher' : 'Admin',
        status: i % 6 === 0 ? 'DRAFT' : 'PUBLISHED',
        viewCount: 80 + (i * 23) % 320,
        publishedAt: i % 6 === 0 ? null : publishedAt,
        updatedAt: publishedAt,
        createdAt: publishedAt,
      },
    });
  }

  const mediaRows: Prisma.CmsMediaAssetCreateManyInput[] = [];
  let mediaIdx = 0;
  const avgSizeMb = 2.45 * 1024 / 1248;

  for (const split of MEDIA_SPLIT) {
    for (let i = 0; i < split.count; i++) {
      mediaIdx++;
      mediaRows.push({
        institutionId,
        fileName: `${split.fileType.toLowerCase()}-${mediaIdx}.${split.fileType === 'IMAGE' ? 'jpg' : split.fileType === 'VIDEO' ? 'mp4' : split.fileType === 'AUDIO' ? 'mp3' : 'pdf'}`,
        fileType: split.fileType,
        mimeType: split.fileType === 'IMAGE' ? 'image/jpeg' : split.fileType === 'VIDEO' ? 'video/mp4' : split.fileType === 'AUDIO' ? 'audio/mpeg' : 'application/pdf',
        fileUrl: `/media/${split.fileType.toLowerCase()}/${mediaIdx}`,
        fileSizeMb: Math.round(avgSizeMb * 100) / 100,
        altText: `${split.label} asset ${mediaIdx}`,
        folder: split.fileType === 'IMAGE' ? 'gallery' : 'general',
        uploadedBy: 'Admin',
        createdAt: dateFromParts(2025, 3, 1 + (mediaIdx % 28)),
      });
    }
  }

  for (let i = 0; i < mediaRows.length; i += 500) {
    await prisma.cmsMediaAsset.createMany({ data: mediaRows.slice(i, i + 500) });
  }

  const menuItems = [
    { label: 'Home', url: '/', location: 'HEADER', order: 1 },
    { label: 'About Us', url: '/about-us', location: 'HEADER', order: 2 },
    { label: 'Admissions', url: '/admissions', location: 'HEADER', order: 3 },
    { label: 'Academics', url: '/academics', location: 'HEADER', order: 4 },
    { label: 'Events', url: '/events', location: 'HEADER', order: 5 },
    { label: 'Gallery', url: '/gallery', location: 'HEADER', order: 6 },
    { label: 'Blog', url: '/blog', location: 'HEADER', order: 7 },
    { label: 'Contact', url: '/contact-us', location: 'HEADER', order: 8 },
    { label: 'Privacy Policy', url: '/privacy-policy', location: 'FOOTER', order: 1 },
    { label: 'Terms of Use', url: '/terms-of-use', location: 'FOOTER', order: 2 },
    { label: 'Sitemap', url: '/sitemap', location: 'FOOTER', order: 3 },
  ];

  for (const m of menuItems) {
    await prisma.cmsMenuItem.create({
      data: {
        institutionId,
        menuLocation: m.location,
        label: m.label,
        url: m.url,
        sortOrder: m.order,
        isActive: true,
      },
    });
  }

  const sliders = [
    { title: 'Nurturing Minds Building Futures', subtitle: 'Excellence in Education Since 1985', cta: 'Explore Now', url: '/admissions' },
    { title: 'Admissions Open 2025-26', subtitle: 'Limited seats available', cta: 'Apply Now', url: '/admissions' },
    { title: 'World-Class Facilities', subtitle: 'Labs, Sports, Arts & More', cta: 'View Campus', url: '/facilities' },
  ];

  for (let i = 0; i < sliders.length; i++) {
    await prisma.cmsSlider.create({
      data: {
        institutionId,
        title: sliders[i].title,
        subtitle: sliders[i].subtitle,
        imageUrl: `https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=500&fit=crop&sig=${i}`,
        ctaLabel: sliders[i].cta,
        ctaUrl: sliders[i].url,
        location: 'HOME_HERO',
        sortOrder: i,
        isActive: true,
      },
    });
  }

  const testimonials = [
    { name: 'Mrs. Priya Sharma', role: 'Parent', content: 'Excellent school with dedicated teachers.', rating: 5, featured: true },
    { name: 'Mr. Rajesh Kumar', role: 'Alumni', content: 'Shaped my career and character.', rating: 5, featured: true },
    { name: 'Dr. Ananya Gupta', role: 'Parent', content: 'Holistic development focus is outstanding.', rating: 4, featured: false },
    { name: 'Mr. Vikram Singh', role: 'Parent', content: 'Great infrastructure and activities.', rating: 5, featured: false },
  ];

  for (let i = 0; i < testimonials.length; i++) {
    const t = testimonials[i];
    await prisma.cmsTestimonial.create({
      data: {
        institutionId,
        authorName: t.name,
        authorRole: t.role,
        content: t.content,
        rating: t.rating,
        isFeatured: t.featured,
        isActive: true,
        sortOrder: i,
      },
    });
  }

  for (let i = 0; i < FORM_SEED.length; i++) {
    const f = FORM_SEED[i];
    const form = await prisma.cmsForm.create({
      data: {
        institutionId,
        formCode: f.code,
        formName: f.name,
        description: `${f.name} form for website visitors`,
        fields: [
          { name: 'name', type: 'text', label: 'Full Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
          { name: 'phone', type: 'tel', label: 'Phone', required: false },
          { name: 'message', type: 'textarea', label: 'Message', required: true },
        ],
        status: 'ACTIVE',
        submissionCount: f.submissions,
        notifyEmail: 'admin@school.edu.in',
      },
    });

    for (let s = 0; s < Math.min(f.submissions, 20); s++) {
      await prisma.cmsFormSubmission.create({
        data: {
          institutionId,
          formId: form.id,
          submitterName: `Visitor ${s + 1}`,
          submitterEmail: `visitor${s + 1}@example.com`,
          submitterPhone: `98765${String(10000 + s).slice(-5)}`,
          payload: { name: `Visitor ${s + 1}`, message: 'Enquiry from website' },
          status: s % 4 === 0 ? 'NEW' : 'REVIEWED',
          createdAt: new Date(2025, 4, 10 + (s % 7), 9 + (s % 8)),
        },
      });
    }
  }

  await prisma.cmsPopup.create({
    data: {
      institutionId,
      title: 'Admissions Open 2025-26',
      content: 'Apply now for the new academic session. Limited seats!',
      popupType: 'MODAL',
      triggerType: 'ON_LOAD',
      startDate: dateFromParts(2025, 4, 1),
      endDate: dateFromParts(2025, 5, 31),
      isActive: true,
    },
  });

  await prisma.cmsSeoMeta.create({
    data: {
      institutionId,
      entityType: 'SITE',
      entityId: '',
      metaTitle: 'Best School in City | Official Website',
      metaDescription: 'Premier educational institution offering holistic development.',
      metaKeywords: 'school, education, admissions, academics',
      robots: 'index,follow',
      score: settings.seoScore,
      checklist: SEO_CHECKLIST.reduce((acc, item) => {
        acc[item.name] = item.score;
        return acc;
      }, {} as Record<string, number>),
    },
  });

  for (const page of PAGE_SEED.slice(0, 5)) {
    await prisma.cmsSeoMeta.create({
      data: {
        institutionId,
        entityType: 'PAGE',
        entityId: slugify(page.title),
        metaTitle: `${page.title} | School Website`,
        metaDescription: `Official ${page.title} page`,
        score: 85 + Math.floor(Math.random() * 10),
      },
    });
  }

  const backups = [
    { name: 'Full Backup — 16 May 2025', type: 'FULL', size: 485 },
    { name: 'Incremental — 15 May 2025', type: 'INCREMENTAL', size: 42 },
    { name: 'Full Backup — 10 May 2025', type: 'FULL', size: 478 },
  ];

  for (const b of backups) {
    await prisma.cmsBackup.create({
      data: {
        institutionId,
        backupName: b.name,
        backupType: b.type,
        fileSizeMb: b.size,
        status: 'COMPLETED',
        createdBy: 'Admin',
        createdAt: dateFromParts(2025, 4, 16 - backups.indexOf(b)),
      },
    });
  }

  const mayDays = buildMayDailyVisitors();
  for (const day of mayDays) {
    const visitors = day.visitors;
    const unique = Math.round(visitors * 0.82);
    const pageViews = Math.round(visitors * 1.9);
    const desktop = Math.round(visitors * 0.582);
    const mobile = Math.round(visitors * 0.389);
    const tablet = visitors - desktop - mobile;

    await prisma.cmsAnalyticsDaily.create({
      data: {
        institutionId,
        analyticsDate: day.date,
        visitors,
        uniqueVisitors: unique,
        pageViews,
        avgSessionSec: 225,
        desktopViews: desktop,
        mobileViews: mobile,
        tabletViews: tablet,
        topPages: PAGE_SEED.slice(0, 5).map((p) => ({ name: p.title, views: Math.round(p.views / 31) })),
      },
    });
  }

  for (let month = 0; month < 4; month++) {
    const daysInMonth = new Date(2025, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 3) {
      const visitors = 280 + ((month * 31 + day) % 200);
      await prisma.cmsAnalyticsDaily.create({
        data: {
          institutionId,
          analyticsDate: dateFromParts(2025, month, day),
          visitors,
          uniqueVisitors: Math.round(visitors * 0.8),
          pageViews: Math.round(visitors * 1.7),
          avgSessionSec: 200,
          desktopViews: Math.round(visitors * 0.55),
          mobileViews: Math.round(visitors * 0.4),
          tabletViews: Math.round(visitors * 0.05),
          topPages: [],
        },
      });
    }
  }

  const activitySeed = [
    { action: 'PAGE_UPDATED', entityType: 'PAGE', details: 'Page "Admissions" updated', by: 'Admin', at: [2025, 4, 16, 10, 15] as const },
    { action: 'BLOG_PUBLISHED', entityType: 'BLOG', details: 'New blog post published', by: 'Admin', at: [2025, 4, 16, 9, 30] as const },
    { action: 'FORM_SUBMISSION', entityType: 'FORM', details: 'New form submission received', by: 'Contact Us Form', at: [2025, 4, 16, 9, 5] as const },
    { action: 'MEDIA_UPLOADED', entityType: 'MEDIA', details: 'Image uploaded in gallery', by: 'Admin', at: [2025, 4, 15, 18, 20] as const },
    { action: 'NOTICE', entityType: 'NOTICE', details: 'Website maintenance scheduled on 20 May 2025 from 12:00 AM to 2:00 AM.', by: 'System', at: [2025, 4, 16, 8, 0] as const },
    { action: 'NOTICE', entityType: 'NOTICE', details: 'Please update all admission related pages.', by: 'System', at: [2025, 4, 15, 8, 0] as const },
    { action: 'NOTICE', entityType: 'NOTICE', details: "Don't forget to backup your website regularly.", by: 'System', at: [2025, 4, 14, 8, 0] as const },
  ];

  for (const a of activitySeed) {
    await prisma.cmsActivityLog.create({
      data: {
        institutionId,
        action: a.action,
        entityType: a.entityType,
        details: a.details,
        performedBy: a.by,
        createdAt: new Date(a.at[0], a.at[1], a.at[2], a.at[3], a.at[4]),
      },
    });
  }

  await logCmsActivity(institutionId, 'SEED_DEMO', 'CMS demo data seeded with 58 pages, 32 blog posts, 1248 media assets');

  return getCmsDashboard(institutionId, 'THIS_MONTH');
}

export async function getCmsDashboard(institutionId: string, period: CmsPeriod = 'THIS_MONTH') {
  const settings = await ensureSiteSettings(institutionId);
  const range = resolvePeriodRange(period);

  const ck = cacheKey(institutionId, period);
  const cached = dashboardCache.get(ck);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const [
    pageCount, blogCount, mediaCount, submissionCount,
    pages, blogPosts, mediaByType, forms, analytics, activities, siteSeo,
  ] = await Promise.all([
    prisma.cmsPage.count({ where: { institutionId } }),
    prisma.cmsBlogPost.count({ where: { institutionId } }),
    prisma.cmsMediaAsset.count({ where: { institutionId } }),
    prisma.cmsFormSubmission.count({ where: { institutionId } }),
    prisma.cmsPage.findMany({
      where: { institutionId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.cmsBlogPost.findMany({
      where: { institutionId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.cmsMediaAsset.groupBy({
      by: ['fileType'],
      where: { institutionId },
      _count: { _all: true },
    }),
    prisma.cmsForm.findMany({
      where: { institutionId },
      orderBy: { submissionCount: 'desc' },
    }),
    prisma.cmsAnalyticsDaily.findMany({
      where: {
        institutionId,
        analyticsDate: { gte: range.start, lte: range.end },
      },
      orderBy: { analyticsDate: 'asc' },
    }),
    prisma.cmsActivityLog.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.cmsSeoMeta.findFirst({
      where: { institutionId, entityType: 'SITE' },
    }),
  ]);

  const totalVisitors = analytics.reduce((s, a) => s + a.visitors, 0);
  const uniqueVisitors = analytics.reduce((s, a) => s + a.uniqueVisitors, 0);
  const pageViews = analytics.reduce((s, a) => s + a.pageViews, 0);
  const desktopViews = analytics.reduce((s, a) => s + a.desktopViews, 0);
  const mobileViews = analytics.reduce((s, a) => s + a.mobileViews, 0);
  const tabletViews = analytics.reduce((s, a) => s + a.tabletViews, 0);
  const avgSessionSec = analytics.length
    ? Math.round(analytics.reduce((s, a) => s + a.avgSessionSec, 0) / analytics.length)
    : 225;

  const topPagesFromDb = await prisma.cmsPage.findMany({
    where: { institutionId, status: 'PUBLISHED' },
    orderBy: { viewCount: 'desc' },
    take: 8,
  });
  const maxViews = topPagesFromDb[0]?.viewCount ?? 1;

  const mediaTypeMap = new Map(mediaByType.map((m) => [m.fileType, m._count._all]));

  const totalSubmissions = forms.reduce((s, f) => s + f.submissionCount, 0) || submissionCount;
  const formColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const formOverview = forms.slice(0, 5).map((f, i) => ({
    name: f.formName,
    value: f.submissionCount,
    color: formColors[i % formColors.length],
    percent: pct(f.submissionCount, totalSubmissions),
  }));

  const deviceTotal = desktopViews + mobileViews + tabletViews || 1;
  const deviceOverview = [
    { name: 'Desktop', value: desktopViews, color: '#3b82f6', percent: pct(desktopViews, deviceTotal) },
    { name: 'Mobile', value: mobileViews, color: '#10b981', percent: pct(mobileViews, deviceTotal) },
    { name: 'Tablet', value: tabletViews, color: '#f59e0b', percent: pct(tabletViews, deviceTotal) },
  ];

  const trendSampleDays = [1, 6, 11, 16, 21, 26];
  const lastDay = range.end.getDate();
  const visitorTrends = [...trendSampleDays, lastDay].map((day) => {
    const row = analytics.find((a) => a.analyticsDate.getDate() === day);
    const monthLabel = range.start.toLocaleString('en-IN', { month: 'short' });
    return {
      day: `${day} ${monthLabel}`,
      visitors: row?.visitors ?? 0,
    };
  });

  const seoScore = siteSeo?.score ?? settings.seoScore;
  const seoLabel = seoScore >= 90 ? 'Excellent' : seoScore >= 70 ? 'Good' : 'Needs Improvement';
  const seoChecklist = SEO_CHECKLIST.map((item) => ({
    name: item.name,
    score: `${item.score}/100`,
    color: item.color,
  }));

  const storagePercent = settings.storageLimitGb > 0
    ? Math.round((settings.storageUsedGb / settings.storageLimitGb) * 1000) / 10
    : 0;

  const activityIconMap: Record<string, { iconType: string; bg: string }> = {
    PAGE_UPDATED: { iconType: 'file', bg: 'bg-red-50' },
    BLOG_PUBLISHED: { iconType: 'edit', bg: 'bg-green-50' },
    FORM_SUBMISSION: { iconType: 'form', bg: 'bg-orange-50' },
    MEDIA_UPLOADED: { iconType: 'image', bg: 'bg-blue-50' },
    NOTICE: { iconType: 'info', bg: 'bg-blue-50' },
  };

  const recentActivity = activities
    .filter((a) => a.action !== 'NOTICE')
    .slice(0, 4)
    .map((a) => {
      const meta = activityIconMap[a.action] ?? { iconType: 'activity', bg: 'bg-slate-50' };
      return {
        text: a.details,
        by: a.performedBy.startsWith('Contact') ? a.performedBy : `By ${a.performedBy}`,
        time: formatDateTime(a.createdAt),
        iconType: meta.iconType,
        bg: meta.bg,
      };
    });

  const noticeIconMap: Record<string, { iconType: string; bg: string }> = {
    maintenance: { iconType: 'alert', bg: 'bg-orange-50' },
    admission: { iconType: 'info', bg: 'bg-blue-50' },
    backup: { iconType: 'database', bg: 'bg-red-50' },
  };

  const importantNotices = activities
    .filter((a) => a.action === 'NOTICE')
    .slice(0, 3)
    .map((a, i) => {
      const keys = ['maintenance', 'admission', 'backup'];
      const meta = noticeIconMap[keys[i] ?? 'info'] ?? noticeIconMap.admission;
      return {
        text: a.details,
        date: formatDate(a.createdAt),
        iconType: meta.iconType,
        bg: meta.bg,
      };
    });

  const images = mediaTypeMap.get('IMAGE') ?? 0;
  const documents = mediaTypeMap.get('DOCUMENT') ?? 0;
  const videos = mediaTypeMap.get('VIDEO') ?? 0;
  const audio = mediaTypeMap.get('AUDIO') ?? 0;

  const result = {
    period: range.label,
    periods: ['This Month', 'Last Month', 'This Year'],
    siteUrl: settings.siteUrl,
    siteName: settings.siteName,
    heroTitle: settings.heroTitle,
    heroImageUrl: settings.heroImageUrl,
    publishStatus: settings.publishStatus === 'PUBLISHED' ? 'Published' : settings.publishStatus,
    themeName: settings.themeName,
    themeVersion: settings.themeVersion,
    lastUpdated: formatDate(settings.lastPublishedAt ?? settings.updatedAt),
    sslEnabled: settings.sslEnabled,
    kpis: {
      totalPages: {
        value: pageCount,
        subtitle: pageCount > 0 ? `${pageCount} page${pageCount === 1 ? '' : 's'}` : 'No pages yet',
        chartColor: '#3b82f6',
      },
      blogPosts: {
        value: blogCount,
        subtitle: blogCount > 0 ? `${blogCount} post${blogCount === 1 ? '' : 's'}` : 'No posts yet',
        chartColor: '#10b981',
      },
      mediaFiles: {
        value: mediaCount,
        subtitle: mediaCount > 0 ? `${mediaCount} file${mediaCount === 1 ? '' : 's'}` : 'No media yet',
        chartColor: '#f59e0b',
      },
      formSubmissions: {
        value: totalSubmissions,
        subtitle: totalSubmissions > 0 ? `${totalSubmissions} submission${totalSubmissions === 1 ? '' : 's'}` : 'No submissions',
        chartColor: '#ef4444',
      },
      websiteVisitors: {
        value: totalVisitors,
        subtitle: totalVisitors > 0 ? 'This period' : 'No traffic yet',
        chartColor: '#3b82f6',
      },
      seoScore: {
        value: seoScore,
        subtitle: seoLabel,
        noSparkline: true,
        chartColor: '#10b981',
      },
    },
    visitorTrends,
    visitorSummary: {
      totalVisitors,
      uniqueVisitors,
      pageViews,
      avgSession: formatDuration(avgSessionSec),
    },
    topPages: topPagesFromDb.map((p) => ({
      name: p.title,
      views: p.viewCount,
      max: maxViews || 1,
    })),
    seoOverview: {
      score: seoScore,
      label: seoLabel,
      checklist: seoChecklist,
    },
    recentPages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      type: p.pageType === 'STATIC' ? 'Static' : p.pageType,
      status: p.status === 'PUBLISHED' ? 'Published' : p.status === 'DRAFT' ? 'Draft' : p.status,
      date: formatDate(p.updatedAt),
    })),
    blogPosts: blogPosts.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      status: b.status === 'PUBLISHED' ? 'Published' : b.status === 'DRAFT' ? 'Draft' : b.status,
      date: formatDate(b.updatedAt),
    })),
    totalPages: pageCount,
    totalPosts: blogCount,
    mediaLibrary: {
      images,
      documents,
      videos,
      audio,
      storageUsedGb: settings.storageUsedGb,
      storageLimitGb: settings.storageLimitGb,
      storagePercent,
    },
    formOverview,
    totalFormSubmissions: totalSubmissions,
    deviceOverview,
    recentActivity,
    importantNotices,
    quickActions: [
      { label: 'Create New Page', target: 'Pages Management' },
      { label: 'Add Blog Post', target: 'Blog Management' },
      { label: 'Upload Media', target: 'Media Library' },
      { label: 'Create Form', target: 'Forms Management' },
      { label: 'Manage Menus', target: 'Menus & Navigation' },
      { label: 'Edit Sliders', target: 'Sliders & Banners' },
      { label: 'Add Popup', target: 'Popups & Notices' },
      { label: 'SEO Settings', target: 'SEO Management' },
      { label: 'Theme Settings', target: 'Theme & Appearance' },
      { label: 'Backup Website', target: 'Backup & Restore' },
    ],
    keyBenefits: [
      { title: 'Easy Content Management', desc: 'Update pages & content without coding', iconType: 'page', bg: 'bg-green-50' },
      { title: 'SEO Optimized', desc: 'Improve search ranking & visibility', iconType: 'seo', bg: 'bg-blue-50' },
      { title: 'Mobile Responsive', desc: 'Looks perfect on all devices', iconType: 'mobile', bg: 'bg-indigo-50' },
      { title: 'Real-time Analytics', desc: 'Track visitors and performance', iconType: 'analytics', bg: 'bg-red-50' },
      { title: 'Secure & Reliable', desc: 'SSL, backup & security for your website', iconType: 'secure', bg: 'bg-blue-50' },
      { title: 'Engage Better', desc: 'Forms, popups & blogs to engage visitors', iconType: 'engage', bg: 'bg-orange-50' },
      { title: 'Brand Building', desc: 'Showcase your school professionally', iconType: 'brand', bg: 'bg-pink-50' },
    ],
  };

  dashboardCache.set(ck, { data: result, expiresAt: Date.now() + 5 * 60 * 1000 });
  return result;
}

export async function fetchCmsModuleRecords(institutionId: string, module: string) {
  const normalized = normalizeCmsModule(module);
  if (!VALID_MODULES.has(normalized)) {
    throw new Error(`Unknown CMS module: ${module}`);
  }

  switch (normalized) {
    case 'pages':
      return prisma.cmsPage.findMany({
        where: { institutionId },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
    case 'blog':
      return prisma.cmsBlogPost.findMany({
        where: { institutionId },
        orderBy: { updatedAt: 'desc' },
      });
    case 'media':
      return prisma.cmsMediaAsset.findMany({
        where: { institutionId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
    case 'menus':
      return prisma.cmsMenuItem.findMany({
        where: { institutionId },
        orderBy: [{ menuLocation: 'asc' }, { sortOrder: 'asc' }],
      });
    case 'sliders':
      return prisma.cmsSlider.findMany({
        where: { institutionId },
        orderBy: [{ location: 'asc' }, { sortOrder: 'asc' }],
      });
    case 'testimonials':
      return prisma.cmsTestimonial.findMany({
        where: { institutionId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
    case 'forms':
      return prisma.cmsForm.findMany({
        where: { institutionId },
        orderBy: { formName: 'asc' },
      });
    case 'popups':
      return prisma.cmsPopup.findMany({
        where: { institutionId },
        orderBy: { updatedAt: 'desc' },
      });
    case 'seo':
      return prisma.cmsSeoMeta.findMany({
        where: { institutionId },
        orderBy: { updatedAt: 'desc' },
      });
    case 'backups':
      return prisma.cmsBackup.findMany({
        where: { institutionId },
        orderBy: { createdAt: 'desc' },
      });
    case 'analytics':
      return prisma.cmsAnalyticsDaily.findMany({
        where: { institutionId },
        orderBy: { analyticsDate: 'desc' },
        take: 365,
      });
    case 'theme': {
      const settings = await ensureSiteSettings(institutionId);
      return [settings];
    }
    default:
      return [];
  }
}

export async function getCmsModuleList(institutionId: string, module: string) {
  const normalized = normalizeCmsModule(module);
  const def = CMS_MODULE_DEFS[normalized];
  if (!def) {
    throw new Error(`Unknown CMS module: ${module}`);
  }

  const records = await fetchCmsModuleRecords(institutionId, normalized);
  const rawRows = records.map((row) => serializeCmsRow(row as Record<string, unknown>));
  const items = rawRows.map((row) => (def.formatRow ? def.formatRow(row) : row));

  return {
    module: normalized,
    title: def.title,
    description: def.description,
    columns: def.columns,
    items,
    totalItems: items.length,
    createFields: def.createFields,
    permissions: {
      canCreate: def.canCreate !== false && def.createFields.length > 0,
      canEdit: true,
      canDelete: normalized !== 'theme',
    },
    kpis: def.buildKpis?.(rawRows) ?? [],
  };
}

export async function createCmsModuleItem(institutionId: string, module: string, data: Record<string, unknown>) {
  const normalized = normalizeCmsModule(module);
  if (!VALID_MODULES.has(normalized)) {
    throw new Error(`Unknown CMS module: ${module}`);
  }
  if (normalized === 'theme') {
    throw new Error('Theme settings cannot be created from this view');
  }

  let created: { id: string };
  switch (normalized) {
    case 'pages': {
      const title = String(data.title ?? 'New Page');
      const slug = String(data.slug ?? slugify(title));
      const count = await prisma.cmsPage.count({ where: { institutionId } });
      created = await prisma.cmsPage.create({
        data: {
          institutionId,
          pageCode: String(data.pageCode ?? `PAGE-${String(count + 1).padStart(3, '0')}`),
          title,
          slug,
          pageType: String(data.pageType ?? 'STATIC'),
          content: String(data.content ?? ''),
          status: String(data.status ?? 'DRAFT'),
          seoTitle: String(data.seoTitle ?? title),
          seoDescription: String(data.seoDescription ?? ''),
          sortOrder: Number(data.sortOrder ?? count),
          updatedBy: String(data.updatedBy ?? 'Admin'),
        },
      });
      break;
    }
    case 'blog': {
      const title = String(data.title ?? 'New Blog Post');
      const slug = String(data.slug ?? slugify(title));
      const count = await prisma.cmsBlogPost.count({ where: { institutionId } });
      created = await prisma.cmsBlogPost.create({
        data: {
          institutionId,
          postCode: String(data.postCode ?? `POST-${String(count + 1).padStart(3, '0')}`),
          title,
          slug,
          excerpt: String(data.excerpt ?? ''),
          content: String(data.content ?? ''),
          author: String(data.author ?? 'Admin'),
          status: String(data.status ?? 'DRAFT'),
          featuredImage: String(data.featuredImage ?? ''),
        },
      });
      break;
    }
    case 'media':
      created = await prisma.cmsMediaAsset.create({
        data: {
          institutionId,
          fileName: String(data.fileName ?? 'upload.jpg'),
          fileType: String(data.fileType ?? 'IMAGE'),
          mimeType: String(data.mimeType ?? ''),
          fileUrl: String(data.fileUrl ?? ''),
          fileSizeMb: Number(data.fileSizeMb ?? 0),
          altText: String(data.altText ?? ''),
          folder: String(data.folder ?? 'general'),
          uploadedBy: String(data.uploadedBy ?? 'Admin'),
        },
      });
      break;
    case 'menus':
      created = await prisma.cmsMenuItem.create({
        data: {
          institutionId,
          menuLocation: String(data.menuLocation ?? 'HEADER'),
          label: String(data.label ?? 'New Item'),
          url: String(data.url ?? '/'),
          target: String(data.target ?? '_self'),
          parentId: String(data.parentId ?? ''),
          sortOrder: Number(data.sortOrder ?? 0),
          isActive: data.isActive !== false,
        },
      });
      break;
    case 'sliders':
      created = await prisma.cmsSlider.create({
        data: {
          institutionId,
          title: String(data.title ?? 'New Slider'),
          subtitle: String(data.subtitle ?? ''),
          imageUrl: String(data.imageUrl ?? ''),
          ctaLabel: String(data.ctaLabel ?? ''),
          ctaUrl: String(data.ctaUrl ?? ''),
          location: String(data.location ?? 'HOME_HERO'),
          sortOrder: Number(data.sortOrder ?? 0),
          isActive: data.isActive !== false,
        },
      });
      break;
    case 'testimonials':
      created = await prisma.cmsTestimonial.create({
        data: {
          institutionId,
          authorName: String(data.authorName ?? 'Anonymous'),
          authorRole: String(data.authorRole ?? 'Parent'),
          content: String(data.content ?? ''),
          rating: Number(data.rating ?? 5),
          photoUrl: String(data.photoUrl ?? ''),
          isFeatured: Boolean(data.isFeatured),
          isActive: data.isActive !== false,
          sortOrder: Number(data.sortOrder ?? 0),
        },
      });
      break;
    case 'forms': {
      const count = await prisma.cmsForm.count({ where: { institutionId } });
      created = await prisma.cmsForm.create({
        data: {
          institutionId,
          formCode: String(data.formCode ?? `FORM-${String(count + 1).padStart(3, '0')}`),
          formName: String(data.formName ?? 'New Form'),
          description: String(data.description ?? ''),
          fields: (data.fields ?? []) as Prisma.InputJsonValue,
          status: String(data.status ?? 'ACTIVE'),
          notifyEmail: String(data.notifyEmail ?? ''),
        },
      });
      break;
    }
    case 'popups':
      created = await prisma.cmsPopup.create({
        data: {
          institutionId,
          title: String(data.title ?? 'New Popup'),
          content: String(data.content ?? ''),
          popupType: String(data.popupType ?? 'MODAL'),
          triggerType: String(data.triggerType ?? 'ON_LOAD'),
          startDate: data.startDate ? new Date(String(data.startDate)) : null,
          endDate: data.endDate ? new Date(String(data.endDate)) : null,
          isActive: data.isActive !== false,
        },
      });
      break;
    case 'seo':
      created = await prisma.cmsSeoMeta.create({
        data: {
          institutionId,
          entityType: String(data.entityType ?? 'PAGE'),
          entityId: String(data.entityId ?? ''),
          metaTitle: String(data.metaTitle ?? ''),
          metaDescription: String(data.metaDescription ?? ''),
          metaKeywords: String(data.metaKeywords ?? ''),
          ogImage: String(data.ogImage ?? ''),
          canonicalUrl: String(data.canonicalUrl ?? ''),
          robots: String(data.robots ?? 'index,follow'),
          score: Number(data.score ?? 0),
          checklist: (data.checklist ?? {}) as Prisma.InputJsonValue,
        },
      });
      break;
    case 'backups':
      created = await prisma.cmsBackup.create({
        data: {
          institutionId,
          backupName: String(data.backupName ?? `Backup ${formatDate(new Date())}`),
          backupType: String(data.backupType ?? 'FULL'),
          fileSizeMb: Number(data.fileSizeMb ?? 0),
          status: String(data.status ?? 'COMPLETED'),
          createdBy: String(data.createdBy ?? 'Admin'),
        },
      });
      break;
    case 'analytics':
      created = await prisma.cmsAnalyticsDaily.create({
        data: {
          institutionId,
          analyticsDate: data.analyticsDate ? new Date(String(data.analyticsDate)) : new Date(),
          visitors: Number(data.visitors ?? 0),
          uniqueVisitors: Number(data.uniqueVisitors ?? 0),
          pageViews: Number(data.pageViews ?? 0),
          avgSessionSec: Number(data.avgSessionSec ?? 0),
          desktopViews: Number(data.desktopViews ?? 0),
          mobileViews: Number(data.mobileViews ?? 0),
          tabletViews: Number(data.tabletViews ?? 0),
          topPages: (data.topPages ?? []) as Prisma.InputJsonValue,
        },
      });
      break;
    default:
      throw new Error(`Unsupported module: ${module}`);
  }

  dashboardCache.clear();
  await logCmsActivity(
    institutionId,
    'CREATE',
    `Created ${normalized} item`,
    normalized.toUpperCase(),
    String(data.performedBy ?? 'Admin'),
    created.id,
  );

  return {
    message: 'Created successfully',
    item: created,
    data: await getCmsModuleList(institutionId, normalized),
  };
}

export async function updateCmsModuleItem(
  institutionId: string,
  module: string,
  id: string,
  data: Record<string, unknown>,
) {
  const normalized = normalizeCmsModule(module);
  if (!VALID_MODULES.has(normalized)) {
    throw new Error(`Unknown CMS module: ${module}`);
  }

  const strip = { ...data };
  delete strip.performedBy;
  delete strip.id;
  delete strip.institutionId;

  let updated: { id: string };
  switch (normalized) {
    case 'pages':
      updated = await prisma.cmsPage.update({
        where: { id },
        data: {
          ...(strip.title !== undefined ? { title: String(strip.title) } : {}),
          ...(strip.slug !== undefined ? { slug: String(strip.slug) } : {}),
          ...(strip.pageType !== undefined ? { pageType: String(strip.pageType) } : {}),
          ...(strip.content !== undefined ? { content: String(strip.content) } : {}),
          ...(strip.status !== undefined ? { status: String(strip.status) } : {}),
          ...(strip.seoTitle !== undefined ? { seoTitle: String(strip.seoTitle) } : {}),
          ...(strip.seoDescription !== undefined ? { seoDescription: String(strip.seoDescription) } : {}),
          ...(strip.sortOrder !== undefined ? { sortOrder: Number(strip.sortOrder) } : {}),
          ...(strip.updatedBy !== undefined ? { updatedBy: String(strip.updatedBy) } : {}),
          ...(strip.viewCount !== undefined ? { viewCount: Number(strip.viewCount) } : {}),
          ...(strip.publishedAt !== undefined ? { publishedAt: strip.publishedAt ? new Date(String(strip.publishedAt)) : null } : {}),
        },
      });
      break;
    case 'blog':
      updated = await prisma.cmsBlogPost.update({
        where: { id },
        data: {
          ...(strip.title !== undefined ? { title: String(strip.title) } : {}),
          ...(strip.slug !== undefined ? { slug: String(strip.slug) } : {}),
          ...(strip.excerpt !== undefined ? { excerpt: String(strip.excerpt) } : {}),
          ...(strip.content !== undefined ? { content: String(strip.content) } : {}),
          ...(strip.author !== undefined ? { author: String(strip.author) } : {}),
          ...(strip.status !== undefined ? { status: String(strip.status) } : {}),
          ...(strip.featuredImage !== undefined ? { featuredImage: String(strip.featuredImage) } : {}),
          ...(strip.publishedAt !== undefined ? { publishedAt: strip.publishedAt ? new Date(String(strip.publishedAt)) : null } : {}),
        },
      });
      break;
    case 'media':
      updated = await prisma.cmsMediaAsset.update({
        where: { id },
        data: {
          ...(strip.fileName !== undefined ? { fileName: String(strip.fileName) } : {}),
          ...(strip.fileType !== undefined ? { fileType: String(strip.fileType) } : {}),
          ...(strip.mimeType !== undefined ? { mimeType: String(strip.mimeType) } : {}),
          ...(strip.fileUrl !== undefined ? { fileUrl: String(strip.fileUrl) } : {}),
          ...(strip.fileSizeMb !== undefined ? { fileSizeMb: Number(strip.fileSizeMb) } : {}),
          ...(strip.altText !== undefined ? { altText: String(strip.altText) } : {}),
          ...(strip.folder !== undefined ? { folder: String(strip.folder) } : {}),
        },
      });
      break;
    case 'menus':
      updated = await prisma.cmsMenuItem.update({
        where: { id },
        data: {
          ...(strip.menuLocation !== undefined ? { menuLocation: String(strip.menuLocation) } : {}),
          ...(strip.label !== undefined ? { label: String(strip.label) } : {}),
          ...(strip.url !== undefined ? { url: String(strip.url) } : {}),
          ...(strip.target !== undefined ? { target: String(strip.target) } : {}),
          ...(strip.parentId !== undefined ? { parentId: String(strip.parentId) } : {}),
          ...(strip.sortOrder !== undefined ? { sortOrder: Number(strip.sortOrder) } : {}),
          ...(strip.isActive !== undefined ? { isActive: Boolean(strip.isActive) } : {}),
        },
      });
      break;
    case 'sliders':
      updated = await prisma.cmsSlider.update({
        where: { id },
        data: {
          ...(strip.title !== undefined ? { title: String(strip.title) } : {}),
          ...(strip.subtitle !== undefined ? { subtitle: String(strip.subtitle) } : {}),
          ...(strip.imageUrl !== undefined ? { imageUrl: String(strip.imageUrl) } : {}),
          ...(strip.ctaLabel !== undefined ? { ctaLabel: String(strip.ctaLabel) } : {}),
          ...(strip.ctaUrl !== undefined ? { ctaUrl: String(strip.ctaUrl) } : {}),
          ...(strip.location !== undefined ? { location: String(strip.location) } : {}),
          ...(strip.sortOrder !== undefined ? { sortOrder: Number(strip.sortOrder) } : {}),
          ...(strip.isActive !== undefined ? { isActive: Boolean(strip.isActive) } : {}),
        },
      });
      break;
    case 'testimonials':
      updated = await prisma.cmsTestimonial.update({
        where: { id },
        data: {
          ...(strip.authorName !== undefined ? { authorName: String(strip.authorName) } : {}),
          ...(strip.authorRole !== undefined ? { authorRole: String(strip.authorRole) } : {}),
          ...(strip.content !== undefined ? { content: String(strip.content) } : {}),
          ...(strip.rating !== undefined ? { rating: Number(strip.rating) } : {}),
          ...(strip.photoUrl !== undefined ? { photoUrl: String(strip.photoUrl) } : {}),
          ...(strip.isFeatured !== undefined ? { isFeatured: Boolean(strip.isFeatured) } : {}),
          ...(strip.isActive !== undefined ? { isActive: Boolean(strip.isActive) } : {}),
          ...(strip.sortOrder !== undefined ? { sortOrder: Number(strip.sortOrder) } : {}),
        },
      });
      break;
    case 'forms':
      updated = await prisma.cmsForm.update({
        where: { id },
        data: {
          ...(strip.formName !== undefined ? { formName: String(strip.formName) } : {}),
          ...(strip.description !== undefined ? { description: String(strip.description) } : {}),
          ...(strip.fields !== undefined ? { fields: strip.fields as Prisma.InputJsonValue } : {}),
          ...(strip.status !== undefined ? { status: String(strip.status) } : {}),
          ...(strip.notifyEmail !== undefined ? { notifyEmail: String(strip.notifyEmail) } : {}),
        },
      });
      break;
    case 'popups':
      updated = await prisma.cmsPopup.update({
        where: { id },
        data: {
          ...(strip.title !== undefined ? { title: String(strip.title) } : {}),
          ...(strip.content !== undefined ? { content: String(strip.content) } : {}),
          ...(strip.popupType !== undefined ? { popupType: String(strip.popupType) } : {}),
          ...(strip.triggerType !== undefined ? { triggerType: String(strip.triggerType) } : {}),
          ...(strip.startDate !== undefined ? { startDate: strip.startDate ? new Date(String(strip.startDate)) : null } : {}),
          ...(strip.endDate !== undefined ? { endDate: strip.endDate ? new Date(String(strip.endDate)) : null } : {}),
          ...(strip.isActive !== undefined ? { isActive: Boolean(strip.isActive) } : {}),
        },
      });
      break;
    case 'seo':
      updated = await prisma.cmsSeoMeta.update({
        where: { id },
        data: {
          ...(strip.entityType !== undefined ? { entityType: String(strip.entityType) } : {}),
          ...(strip.entityId !== undefined ? { entityId: String(strip.entityId) } : {}),
          ...(strip.metaTitle !== undefined ? { metaTitle: String(strip.metaTitle) } : {}),
          ...(strip.metaDescription !== undefined ? { metaDescription: String(strip.metaDescription) } : {}),
          ...(strip.metaKeywords !== undefined ? { metaKeywords: String(strip.metaKeywords) } : {}),
          ...(strip.ogImage !== undefined ? { ogImage: String(strip.ogImage) } : {}),
          ...(strip.canonicalUrl !== undefined ? { canonicalUrl: String(strip.canonicalUrl) } : {}),
          ...(strip.robots !== undefined ? { robots: String(strip.robots) } : {}),
          ...(strip.score !== undefined ? { score: Number(strip.score) } : {}),
          ...(strip.checklist !== undefined ? { checklist: strip.checklist as Prisma.InputJsonValue } : {}),
        },
      });
      break;
    case 'backups':
      updated = await prisma.cmsBackup.update({
        where: { id },
        data: {
          ...(strip.backupName !== undefined ? { backupName: String(strip.backupName) } : {}),
          ...(strip.backupType !== undefined ? { backupType: String(strip.backupType) } : {}),
          ...(strip.fileSizeMb !== undefined ? { fileSizeMb: Number(strip.fileSizeMb) } : {}),
          ...(strip.status !== undefined ? { status: String(strip.status) } : {}),
        },
      });
      break;
    case 'analytics':
      updated = await prisma.cmsAnalyticsDaily.update({
        where: { id },
        data: {
          ...(strip.analyticsDate !== undefined ? { analyticsDate: new Date(String(strip.analyticsDate)) } : {}),
          ...(strip.visitors !== undefined ? { visitors: Number(strip.visitors) } : {}),
          ...(strip.uniqueVisitors !== undefined ? { uniqueVisitors: Number(strip.uniqueVisitors) } : {}),
          ...(strip.pageViews !== undefined ? { pageViews: Number(strip.pageViews) } : {}),
          ...(strip.avgSessionSec !== undefined ? { avgSessionSec: Number(strip.avgSessionSec) } : {}),
          ...(strip.desktopViews !== undefined ? { desktopViews: Number(strip.desktopViews) } : {}),
          ...(strip.mobileViews !== undefined ? { mobileViews: Number(strip.mobileViews) } : {}),
          ...(strip.tabletViews !== undefined ? { tabletViews: Number(strip.tabletViews) } : {}),
          ...(strip.topPages !== undefined ? { topPages: strip.topPages as Prisma.InputJsonValue } : {}),
        },
      });
      break;
    default:
      throw new Error(`Unsupported module: ${module}`);
  }

  dashboardCache.clear();
  await logCmsActivity(
    institutionId,
    'UPDATE',
    `Updated ${normalized} item ${id}`,
    normalized.toUpperCase(),
    String(data.performedBy ?? 'Admin'),
    id,
  );

  return {
    message: 'Updated successfully',
    item: updated,
    data: await getCmsModuleList(institutionId, normalized),
  };
}

export { parsePeriod };
