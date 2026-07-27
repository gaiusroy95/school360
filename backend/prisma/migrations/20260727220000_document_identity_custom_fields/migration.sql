-- Document, Identity & Custom Field module

CREATE TABLE "document_categories" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "privacyLevel" TEXT NOT NULL DEFAULT 'INTERNAL',
    "encryptAtRest" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_categories_institutionId_categoryCode_key" ON "document_categories"("institutionId", "categoryCode");

CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryId" TEXT,
    "typeCode" TEXT NOT NULL,
    "typeLabel" TEXT NOT NULL,
    "expiryDays" INTEGER,
    "validationRules" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_types_institutionId_typeCode_key" ON "document_types"("institutionId", "typeCode");

CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "layoutHtml" TEXT NOT NULL DEFAULT '',
    "dynamicTokens" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_templates_institutionId_templateCode_key" ON "document_templates"("institutionId", "templateCode");

CREATE TABLE "application_form_documents" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "acceptedFormats" TEXT NOT NULL DEFAULT 'PDF,JPG,PNG',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "application_form_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "application_form_documents_institutionId_documentName_key" ON "application_form_documents"("institutionId", "documentName");

CREATE TABLE "required_documents" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "profileType" TEXT NOT NULL DEFAULT 'Admission',
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "required_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "required_documents_institutionId_documentName_profileType_key" ON "required_documents"("institutionId", "documentName", "profileType");

CREATE TABLE "document_number_sequences" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sequenceKey" TEXT NOT NULL DEFAULT 'DOCUMENT',
    "prefix" TEXT NOT NULL DEFAULT 'DOC-',
    "suffix" TEXT NOT NULL DEFAULT '',
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "padLength" INTEGER NOT NULL DEFAULT 4,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_number_sequences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_number_sequences_institutionId_sequenceKey_key" ON "document_number_sequences"("institutionId", "sequenceKey");

CREATE TABLE "id_card_templates" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'STUDENT',
    "layoutConfig" JSONB NOT NULL DEFAULT '{}',
    "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "barcodeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "id_card_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "id_card_templates_institutionId_templateCode_audience_key" ON "id_card_templates"("institutionId", "templateCode", "audience");

CREATE TABLE "roll_number_rules" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "formatFormula" TEXT NOT NULL DEFAULT 'CLASS-SEC-###',
    "sortLogic" TEXT NOT NULL DEFAULT 'ALPHA_NAME',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "roll_number_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roll_number_rules_institutionId_key" ON "roll_number_rules"("institutionId");

CREATE TABLE "admission_number_seq" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'ADM-',
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "padLength" INTEGER NOT NULL DEFAULT 4,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admission_number_seq_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admission_number_seq_institutionId_key" ON "admission_number_seq"("institutionId");

CREATE TABLE "employee_code_rules" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "formatFormula" TEXT NOT NULL DEFAULT 'EMP-{YEAR}-{SEQ}',
    "prefix" TEXT NOT NULL DEFAULT 'EMP-',
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "padLength" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_code_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employee_code_rules_institutionId_key" ON "employee_code_rules"("institutionId");

CREATE TABLE "profile_custom_fields" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "validation" JSONB NOT NULL DEFAULT '{}',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profile_custom_fields_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "profile_custom_fields_institutionId_entityType_fieldKey_key" ON "profile_custom_fields"("institutionId", "entityType", "fieldKey");

CREATE TABLE "custom_field_types" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "typeCode" TEXT NOT NULL,
    "typeLabel" TEXT NOT NULL,
    "validationSchema" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_field_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "custom_field_types_institutionId_typeCode_key" ON "custom_field_types"("institutionId", "typeCode");

ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_form_documents" ADD CONSTRAINT "application_form_documents_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "required_documents" ADD CONSTRAINT "required_documents_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_number_sequences" ADD CONSTRAINT "document_number_sequences_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "id_card_templates" ADD CONSTRAINT "id_card_templates_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roll_number_rules" ADD CONSTRAINT "roll_number_rules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admission_number_seq" ADD CONSTRAINT "admission_number_seq_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_code_rules" ADD CONSTRAINT "employee_code_rules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_custom_fields" ADD CONSTRAINT "profile_custom_fields_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_types" ADD CONSTRAINT "custom_field_types_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
