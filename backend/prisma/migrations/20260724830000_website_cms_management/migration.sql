-- CreateTable
CREATE TABLE "CmsSiteSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL DEFAULT 'www.yourschool.edu.in',
    "siteName" TEXT NOT NULL DEFAULT 'School Website',
    "themeName" TEXT NOT NULL DEFAULT 'Education Pro',
    "themeVersion" TEXT NOT NULL DEFAULT 'v2.4.1',
    "publishStatus" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "heroTitle" TEXT NOT NULL DEFAULT 'Nurturing Minds Building Futures',
    "heroImageUrl" TEXT NOT NULL DEFAULT '',
    "storageLimitGb" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "storageUsedGb" DOUBLE PRECISION NOT NULL DEFAULT 2.45,
    "seoScore" INTEGER NOT NULL DEFAULT 92,
    "sslEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsSiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "pageCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageType" TEXT NOT NULL DEFAULT 'STATIC',
    "content" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsBlogPost" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "postCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT 'Admin',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "featuredImage" TEXT NOT NULL DEFAULT '',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsBlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsMediaAsset" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'IMAGE',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "fileSizeMb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "altText" TEXT NOT NULL DEFAULT '',
    "folder" TEXT NOT NULL DEFAULT 'general',
    "uploadedBy" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsMenuItem" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "menuLocation" TEXT NOT NULL DEFAULT 'HEADER',
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT '_self',
    "parentId" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsSlider" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT NOT NULL DEFAULT '',
    "ctaUrl" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT 'HOME_HERO',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsSlider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsTestimonial" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL DEFAULT 'Parent',
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsTestimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsForm" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "formCode" TEXT NOT NULL,
    "formName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "notifyEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsFormSubmission" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "submitterName" TEXT NOT NULL DEFAULT '',
    "submitterEmail" TEXT NOT NULL DEFAULT '',
    "submitterPhone" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPopup" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "popupType" TEXT NOT NULL DEFAULT 'MODAL',
    "triggerType" TEXT NOT NULL DEFAULT 'ON_LOAD',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsPopup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsSeoMeta" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'SITE',
    "entityId" TEXT NOT NULL DEFAULT '',
    "metaTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "metaKeywords" TEXT NOT NULL DEFAULT '',
    "ogImage" TEXT NOT NULL DEFAULT '',
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "robots" TEXT NOT NULL DEFAULT 'index,follow',
    "score" INTEGER NOT NULL DEFAULT 0,
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsSeoMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsBackup" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "backupName" TEXT NOT NULL,
    "backupType" TEXT NOT NULL DEFAULT 'FULL',
    "fileSizeMb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdBy" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsBackup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "analyticsDate" DATE NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "avgSessionSec" INTEGER NOT NULL DEFAULT 0,
    "desktopViews" INTEGER NOT NULL DEFAULT 0,
    "mobileViews" INTEGER NOT NULL DEFAULT 0,
    "tabletViews" INTEGER NOT NULL DEFAULT 0,
    "topPages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsActivityLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT '',
    "entityId" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CmsSiteSettings_institutionId_key" ON "CmsSiteSettings"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_institutionId_pageCode_key" ON "CmsPage"("institutionId", "pageCode");
CREATE UNIQUE INDEX "CmsPage_institutionId_slug_key" ON "CmsPage"("institutionId", "slug");
CREATE INDEX "CmsPage_institutionId_status_idx" ON "CmsPage"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CmsBlogPost_institutionId_postCode_key" ON "CmsBlogPost"("institutionId", "postCode");
CREATE UNIQUE INDEX "CmsBlogPost_institutionId_slug_key" ON "CmsBlogPost"("institutionId", "slug");
CREATE INDEX "CmsBlogPost_institutionId_status_idx" ON "CmsBlogPost"("institutionId", "status");

-- CreateIndex
CREATE INDEX "CmsMediaAsset_institutionId_fileType_idx" ON "CmsMediaAsset"("institutionId", "fileType");
CREATE INDEX "CmsMediaAsset_institutionId_folder_idx" ON "CmsMediaAsset"("institutionId", "folder");

-- CreateIndex
CREATE INDEX "CmsMenuItem_institutionId_menuLocation_idx" ON "CmsMenuItem"("institutionId", "menuLocation");

-- CreateIndex
CREATE INDEX "CmsSlider_institutionId_location_idx" ON "CmsSlider"("institutionId", "location");

-- CreateIndex
CREATE INDEX "CmsTestimonial_institutionId_isActive_idx" ON "CmsTestimonial"("institutionId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CmsForm_institutionId_formCode_key" ON "CmsForm"("institutionId", "formCode");

-- CreateIndex
CREATE INDEX "CmsFormSubmission_institutionId_formId_idx" ON "CmsFormSubmission"("institutionId", "formId");
CREATE INDEX "CmsFormSubmission_institutionId_createdAt_idx" ON "CmsFormSubmission"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "CmsPopup_institutionId_isActive_idx" ON "CmsPopup"("institutionId", "isActive");

-- CreateIndex
CREATE INDEX "CmsSeoMeta_institutionId_entityType_idx" ON "CmsSeoMeta"("institutionId", "entityType");

-- CreateIndex
CREATE INDEX "CmsBackup_institutionId_createdAt_idx" ON "CmsBackup"("institutionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsAnalyticsDaily_institutionId_analyticsDate_key" ON "CmsAnalyticsDaily"("institutionId", "analyticsDate");
CREATE INDEX "CmsAnalyticsDaily_institutionId_analyticsDate_idx" ON "CmsAnalyticsDaily"("institutionId", "analyticsDate");

-- CreateIndex
CREATE INDEX "CmsActivityLog_institutionId_createdAt_idx" ON "CmsActivityLog"("institutionId", "createdAt");

-- AddForeignKey
ALTER TABLE "CmsSiteSettings" ADD CONSTRAINT "CmsSiteSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsBlogPost" ADD CONSTRAINT "CmsBlogPost_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsMediaAsset" ADD CONSTRAINT "CmsMediaAsset_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsMenuItem" ADD CONSTRAINT "CmsMenuItem_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsSlider" ADD CONSTRAINT "CmsSlider_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsTestimonial" ADD CONSTRAINT "CmsTestimonial_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsForm" ADD CONSTRAINT "CmsForm_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsFormSubmission" ADD CONSTRAINT "CmsFormSubmission_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsFormSubmission" ADD CONSTRAINT "CmsFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "CmsForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsPopup" ADD CONSTRAINT "CmsPopup_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsSeoMeta" ADD CONSTRAINT "CmsSeoMeta_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsBackup" ADD CONSTRAINT "CmsBackup_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsAnalyticsDaily" ADD CONSTRAINT "CmsAnalyticsDaily_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsActivityLog" ADD CONSTRAINT "CmsActivityLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
