-- Data Management, Modules & UI

ALTER TABLE "InstitutionSetup" ADD COLUMN IF NOT EXISTS "modulesUiSetup" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "importType" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "fileName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorMatrix" JSONB NOT NULL DEFAULT '[]',
    "executedBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "import_logs_institutionId_importType_createdAt_idx" ON "import_logs"("institutionId", "importType", "createdAt");

CREATE TABLE "export_history" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL DEFAULT '',
    "exportFormat" TEXT NOT NULL DEFAULT 'csv',
    "module" TEXT NOT NULL DEFAULT '',
    "queryParams" JSONB NOT NULL DEFAULT '{}',
    "rowsExported" INTEGER NOT NULL DEFAULT 0,
    "fileName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "export_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "export_history_institutionId_createdAt_idx" ON "export_history"("institutionId", "createdAt");

CREATE TABLE "scheduled_exports" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL DEFAULT '0 2 * * *',
    "targetUri" TEXT NOT NULL DEFAULT '',
    "exportFormat" TEXT NOT NULL DEFAULT 'xlsx',
    "module" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scheduled_exports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "scheduled_exports_institutionId_jobName_key" ON "scheduled_exports"("institutionId", "jobName");

CREATE TABLE "system_modules" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "moduleLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "licenseKey" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_modules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "system_modules_institutionId_moduleCode_key" ON "system_modules"("institutionId", "moduleCode");
CREATE INDEX "system_modules_institutionId_isActive_sortOrder_idx" ON "system_modules"("institutionId", "isActive", "sortOrder");

CREATE TABLE "workflow_rules" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "approvalSequence" JSONB NOT NULL DEFAULT '[]',
    "thresholdAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workflow_rules_institutionId_workflowType_ruleName_key" ON "workflow_rules"("institutionId", "workflowType", "ruleName");

CREATE TABLE "feature_permissions" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "featureCode" TEXT NOT NULL,
    "featureLabel" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL DEFAULT 'ADMIN',
    "accessLevel" TEXT NOT NULL DEFAULT 'FULL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "feature_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "feature_permissions_institutionId_moduleCode_featureCode_roleCode_key" ON "feature_permissions"("institutionId", "moduleCode", "featureCode", "roleCode");

CREATE TABLE "menu_structures" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL DEFAULT 'ALL',
    "moduleOrder" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "menu_structures_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "menu_structures_institutionId_roleCode_key" ON "menu_structures"("institutionId", "roleCode");

CREATE TABLE "ui_menus" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL DEFAULT 'ALL',
    "menuTree" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ui_menus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ui_menus_institutionId_roleCode_key" ON "ui_menus"("institutionId", "roleCode");

CREATE TABLE "dashboard_preferences" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "widgets" JSONB NOT NULL DEFAULT '[]',
    "layout" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dashboard_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dashboard_preferences_institutionId_roleCode_key" ON "dashboard_preferences"("institutionId", "roleCode");

CREATE TABLE "theme_settings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter, sans-serif',
    "faviconUrl" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "theme_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "theme_settings_institutionId_key" ON "theme_settings"("institutionId");

CREATE TABLE "color_schemes" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL DEFAULT 'Default',
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "secondaryColor" TEXT NOT NULL DEFAULT '#64748b',
    "accentColor" TEXT NOT NULL DEFAULT '#0d9488',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "color_schemes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "color_schemes_institutionId_schemeName_key" ON "color_schemes"("institutionId", "schemeName");

CREATE TABLE "custom_css" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "snippetName" TEXT NOT NULL DEFAULT 'Global Overrides',
    "cssContent" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_css_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "custom_css_institutionId_snippetName_key" ON "custom_css"("institutionId", "snippetName");

CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "relationship" TEXT NOT NULL DEFAULT 'GUARDIAN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "parents_institutionId_mobile_fullName_key" ON "parents"("institutionId", "mobile", "fullName");
CREATE INDEX "parents_institutionId_mobile_idx" ON "parents"("institutionId", "mobile");

CREATE TABLE "student_parent_links" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationship" "ParentRelationship" NOT NULL DEFAULT 'GUARDIAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_parent_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "student_parent_links_institutionId_parentId_studentId_key" ON "student_parent_links"("institutionId", "parentId", "studentId");
CREATE INDEX "student_parent_links_institutionId_studentId_idx" ON "student_parent_links"("institutionId", "studentId");

ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_history" ADD CONSTRAINT "export_history_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_exports" ADD CONSTRAINT "scheduled_exports_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "system_modules" ADD CONSTRAINT "system_modules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_rules" ADD CONSTRAINT "workflow_rules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feature_permissions" ADD CONSTRAINT "feature_permissions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "menu_structures" ADD CONSTRAINT "menu_structures_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ui_menus" ADD CONSTRAINT "ui_menus_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_preferences" ADD CONSTRAINT "dashboard_preferences_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "theme_settings" ADD CONSTRAINT "theme_settings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "color_schemes" ADD CONSTRAINT "color_schemes_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_css" ADD CONSTRAINT "custom_css_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parents" ADD CONSTRAINT "parents_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_parent_links" ADD CONSTRAINT "student_parent_links_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_parent_links" ADD CONSTRAINT "student_parent_links_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_parent_links" ADD CONSTRAINT "student_parent_links_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
