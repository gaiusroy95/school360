import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { logUserActivity } from './securityAuditCompliance.js';

type SetupSections = Record<string, Record<string, unknown>>;

const DEFAULT_CATEGORIES = [
  { code: 'IDENTITY', label: 'Identity', privacy: 'RESTRICTED' },
  { code: 'ACADEMIC', label: 'Academic', privacy: 'INTERNAL' },
  { code: 'MEDICAL', label: 'Medical', privacy: 'RESTRICTED' },
  { code: 'LEGAL', label: 'Legal', privacy: 'CONFIDENTIAL' },
  { code: 'FINANCIAL', label: 'Financial', privacy: 'CONFIDENTIAL' },
];

const DEFAULT_FIELD_TYPES = ['text', 'number', 'date', 'dropdown', 'checkbox', 'file', 'regex'];

function readSetupSections(tile: unknown): SetupSections {
  if (!tile || typeof tile !== 'object') return {};
  return (tile as { sections?: SetupSections }).sections || {};
}

function readField(sections: SetupSections, sectionKeys: string | string[], key: string, fallback = '') {
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys];
  for (const sectionKey of keys) {
    const val = sections[sectionKey]?.[key];
    if (val != null && String(val) !== '') return String(val);
  }
  return fallback;
}

function slugCode(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'ITEM';
}

function parseJsonRows(raw: unknown): Array<Record<string, string>> {
  if (Array.isArray(raw)) {
    return raw.map((row) => {
      const out: Record<string, string> = {};
      if (row && typeof row === 'object') {
        for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
          out[k] = v == null ? '' : String(v);
        }
      }
      return out;
    });
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseJsonRows(parsed);
    } catch {
      return raw.split('\n').map((line) => ({ name: line.trim() })).filter((r) => r.name);
    }
  }
  return [];
}

function parseFieldDefs(raw: string, entityType: string) {
  if (!raw.trim()) return [];
  return raw.split(',').map((part, i) => {
    const [label, type] = part.split(':').map((s) => s.trim());
    if (!label) return null;
    const fieldKey = slugCode(label);
    return {
      entityType,
      fieldKey,
      fieldLabel: label,
      fieldType: type || 'text',
      sortOrder: i,
    };
  }).filter(Boolean) as Array<{ entityType: string; fieldKey: string; fieldLabel: string; fieldType: string; sortOrder: number }>;
}

export function loadDocumentIdentitySetup(setup: {
  documentSetup?: unknown;
  idCardNumbering?: unknown;
  customFieldsSetup?: unknown;
} | null) {
  const doc = readSetupSections(setup?.documentSetup);
  const id = readSetupSections(setup?.idCardNumbering);
  const custom = readSetupSections(setup?.customFieldsSetup);

  return {
    categories: readField(doc, ['Document Categories', 'documentCategories'], 'categories', 'Identity, Academic, Medical, Legal, Financial'),
    documentTypes: readField(doc, ['Document Types', 'documentTypes'], 'types', 'Aadhaar, Birth Certificate, Transfer Certificate'),
    templateNotes: readField(doc, ['Document Templates', 'documentTemplates'], 'templateNotes', ''),
    applicationDocuments: parseJsonRows(
      doc['Application Form Documents']?.applicationDocuments ?? doc.applicationFormDocuments?.applicationDocuments,
    ),
    requiredDocuments: parseJsonRows(
      doc['Required Documents']?.documents ?? doc.requiredDocuments?.documents,
    ),
    numbering: {
      prefix: readField(doc, ['Document Numbering', 'documentNumbering'], 'prefix', 'DOC-'),
      nextNumber: Number(readField(doc, ['Document Numbering', 'documentNumbering'], 'nextNumber', '1')) || 1,
    },
    idCards: {
      studentTemplate: readField(id, ['ID Card Templates', 'idCardTemplates'], 'studentTemplate', 'Professional Staff Style'),
      staffTemplate: readField(id, ['ID Card Templates', 'idCardTemplates'], 'staffTemplate', 'Professional Staff Style'),
    },
    rollNumber: {
      format: readField(id, ['Roll Number Format', 'rollNumberFormat'], 'rollFormat', 'CLASS-SEC-###'),
      sortLogic: readField(id, ['Roll Number Format', 'rollNumberFormat'], 'sortLogic', 'ALPHA_NAME'),
    },
    admissionNumber: {
      prefix: readField(id, ['Admission Number', 'admissionNumber'], 'admissionPrefix', 'ADM-'),
      nextNumber: Number(readField(id, ['Admission Number', 'admissionNumber'], 'admissionNext', '1')) || 1,
    },
    employeeCode: {
      prefix: readField(id, ['Employee Code Format', 'employeeCodeFormat'], 'employeePrefix', 'EMP-'),
      format: readField(id, ['Employee Code Format', 'employeeCodeFormat'], 'formatFormula', 'EMP-{YEAR}-{SEQ}'),
      nextNumber: Number(readField(id, ['Employee Code Format', 'employeeCodeFormat'], 'employeeNext', '1')) || 1,
    },
    customFields: {
      student: readField(custom, ['Student Custom Fields', 'studentCustomFields'], 'studentFields', ''),
      employee: readField(custom, ['Employee Custom Fields', 'employeeCustomFields'], 'employeeFields', ''),
      parent: readField(custom, ['Parent Custom Fields', 'parentCustomFields'], 'parentFields', ''),
      admission: readField(custom, ['Admission Custom Fields', 'admissionCustomFields'], 'admissionFields', ''),
      allowedTypes: readField(custom, ['Custom Field Types', 'customFieldTypes'], 'allowedTypes', DEFAULT_FIELD_TYPES.join(', ')),
    },
  };
}

export async function syncDocumentIdentityFromSetup(institutionId: string, actorEmail = 'system') {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  if (!institution?.setup) return { synced: false };

  const config = loadDocumentIdentitySetup({
    documentSetup: institution.setup.documentSetup,
    idCardNumbering: institution.setup.idCardNumbering,
    customFieldsSetup: institution.setup.customFieldsSetup,
  });

  const categoryMap = new Map<string, string>();
  const categoryLabels = config.categories.split(',').map((s) => s.trim()).filter(Boolean);
  for (const label of categoryLabels.length ? categoryLabels : DEFAULT_CATEGORIES.map((c) => c.label)) {
    const code = slugCode(label);
    const def = DEFAULT_CATEGORIES.find((c) => c.label.toLowerCase() === label.toLowerCase());
    const row = await prisma.documentCategory.upsert({
      where: { institutionId_categoryCode: { institutionId, categoryCode: code } },
      create: {
        institutionId,
        categoryCode: code,
        categoryLabel: label,
        privacyLevel: def?.privacy ?? 'INTERNAL',
        encryptAtRest: true,
      },
      update: { categoryLabel: label },
    });
    categoryMap.set(label.toLowerCase(), row.id);
  }

  if (!categoryLabels.length) {
    for (const cat of DEFAULT_CATEGORIES) {
      const row = await prisma.documentCategory.upsert({
        where: { institutionId_categoryCode: { institutionId, categoryCode: cat.code } },
        create: { institutionId, categoryCode: cat.code, categoryLabel: cat.label, privacyLevel: cat.privacy },
        update: { categoryLabel: cat.label },
      });
      categoryMap.set(cat.label.toLowerCase(), row.id);
    }
  }

  const typeNames = config.documentTypes.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  for (const name of typeNames) {
    const code = slugCode(name);
    await prisma.documentType.upsert({
      where: { institutionId_typeCode: { institutionId, typeCode: code } },
      create: {
        institutionId,
        typeCode: code,
        typeLabel: name,
        categoryId: categoryMap.values().next().value,
        validationRules: { requiresVerification: true },
      },
      update: { typeLabel: name },
    });
  }

  if (config.templateNotes.trim()) {
    await prisma.documentTemplate.upsert({
      where: { institutionId_templateCode: { institutionId, templateCode: 'DEFAULT_TC' } },
      create: {
        institutionId,
        templateCode: 'DEFAULT_TC',
        templateName: 'Transfer Certificate',
        layoutHtml: config.templateNotes,
        dynamicTokens: ['{{studentName}}', '{{className}}', '{{admissionNumber}}'] as unknown as Prisma.InputJsonValue,
      },
      update: { layoutHtml: config.templateNotes },
    });
  }

  await prisma.applicationFormDocumentRule.deleteMany({ where: { institutionId } });
  let sortOrder = 0;
  for (const row of config.applicationDocuments) {
    const name = (row.name || '').trim();
    if (!name || (row.active || 'Yes').toLowerCase() === 'no') continue;
    await prisma.applicationFormDocumentRule.create({
      data: {
        institutionId,
        documentName: name,
        description: row.description || '',
        mandatory: (row.mandatory || 'No').toLowerCase() === 'yes',
        acceptedFormats: row.acceptedFormats || 'PDF,JPG,PNG',
        sortOrder: sortOrder++,
      },
    });
  }

  await prisma.requiredDocumentRule.deleteMany({ where: { institutionId } });
  for (const row of config.requiredDocuments) {
    const name = (row.name || '').trim();
    if (!name) continue;
    await prisma.requiredDocumentRule.create({
      data: {
        institutionId,
        documentName: name,
        profileType: row.requiredFor || 'Admission',
        mandatory: (row.mandatory || 'Yes').toLowerCase() === 'yes',
      },
    });
  }

  await prisma.documentNumberSequence.upsert({
    where: { institutionId_sequenceKey: { institutionId, sequenceKey: 'DOCUMENT' } },
    create: {
      institutionId,
      prefix: config.numbering.prefix,
      nextNumber: config.numbering.nextNumber,
    },
    update: {
      prefix: config.numbering.prefix,
      nextNumber: config.numbering.nextNumber,
    },
  });

  for (const audience of ['STUDENT', 'STAFF'] as const) {
    const templateName = audience === 'STUDENT' ? config.idCards.studentTemplate : config.idCards.staffTemplate;
    const code = slugCode(templateName);
    await prisma.idCardTemplate.upsert({
      where: { institutionId_templateCode_audience: { institutionId, templateCode: code, audience } },
      create: {
        institutionId,
        templateCode: code,
        templateName,
        audience,
        layoutConfig: { templateStyle: templateName, qrField: 'admissionNumber', barcodeField: 'rollNumber' },
      },
      update: { templateName, layoutConfig: { templateStyle: templateName } },
    });
  }

  await prisma.rollNumberRule.upsert({
    where: { institutionId },
    create: {
      institutionId,
      formatFormula: config.rollNumber.format,
      sortLogic: config.rollNumber.sortLogic,
    },
    update: {
      formatFormula: config.rollNumber.format,
      sortLogic: config.rollNumber.sortLogic,
    },
  });

  await prisma.admissionNumberSequence.upsert({
    where: { institutionId },
    create: {
      institutionId,
      prefix: config.admissionNumber.prefix,
      nextNumber: config.admissionNumber.nextNumber,
    },
    update: {
      prefix: config.admissionNumber.prefix,
      nextNumber: config.admissionNumber.nextNumber,
    },
  });

  await prisma.employeeCodeRule.upsert({
    where: { institutionId },
    create: {
      institutionId,
      prefix: config.employeeCode.prefix,
      formatFormula: config.employeeCode.format,
      nextNumber: config.employeeCode.nextNumber,
    },
    update: {
      prefix: config.employeeCode.prefix,
      formatFormula: config.employeeCode.format,
      nextNumber: config.employeeCode.nextNumber,
    },
  });

  const fieldTypeCodes = config.customFields.allowedTypes.split(',').map((s) => s.trim()).filter(Boolean);
  for (const typeCode of fieldTypeCodes.length ? fieldTypeCodes : DEFAULT_FIELD_TYPES) {
    await prisma.customFieldType.upsert({
      where: { institutionId_typeCode: { institutionId, typeCode: typeCode.toLowerCase() } },
      create: {
        institutionId,
        typeCode: typeCode.toLowerCase(),
        typeLabel: typeCode.charAt(0).toUpperCase() + typeCode.slice(1),
        validationSchema: typeCode === 'regex' ? { pattern: '^[A-Za-z0-9]+$' } : {},
      },
      update: { typeLabel: typeCode.charAt(0).toUpperCase() + typeCode.slice(1) },
    });
  }

  const entityFields = [
    { entity: 'STUDENT', raw: config.customFields.student },
    { entity: 'EMPLOYEE', raw: config.customFields.employee },
    { entity: 'PARENT', raw: config.customFields.parent },
    { entity: 'ADMISSION', raw: config.customFields.admission },
  ];

  let customFieldCount = 0;
  for (const { entity, raw } of entityFields) {
    const defs = parseFieldDefs(raw, entity);
    for (const def of defs) {
      await prisma.profileCustomField.upsert({
        where: {
          institutionId_entityType_fieldKey: { institutionId, entityType: entity, fieldKey: def.fieldKey },
        },
        create: {
          institutionId,
          entityType: entity,
          fieldKey: def.fieldKey,
          fieldLabel: def.fieldLabel,
          fieldType: def.fieldType,
          sortOrder: def.sortOrder,
        },
        update: {
          fieldLabel: def.fieldLabel,
          fieldType: def.fieldType,
          sortOrder: def.sortOrder,
        },
      });
      customFieldCount += 1;
    }
  }

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'DOCUMENT_IDENTITY_SYNC',
    module: 'Document & Identity',
    details: `${typeNames.length} types, ${config.applicationDocuments.length} app docs, ${customFieldCount} custom fields`,
  });

  return {
    synced: true,
    categories: categoryMap.size,
    documentTypes: typeNames.length,
    applicationDocuments: config.applicationDocuments.length,
    customFields: customFieldCount,
  };
}

export async function getDocumentIdentityOverview(institutionId: string) {
  const [
    categories,
    documentTypes,
    templates,
    applicationDocs,
    requiredDocs,
    numbering,
    idCards,
    rollRule,
    admissionSeq,
    employeeRule,
    customFields,
    fieldTypes,
  ] = await Promise.all([
    prisma.documentCategory.findMany({ where: { institutionId, isActive: true } }),
    prisma.documentType.findMany({ where: { institutionId, isActive: true }, include: { category: true } }),
    prisma.documentTemplate.findMany({ where: { institutionId, isActive: true } }),
    prisma.applicationFormDocumentRule.findMany({ where: { institutionId, isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.requiredDocumentRule.findMany({ where: { institutionId, isActive: true } }),
    prisma.documentNumberSequence.findUnique({ where: { institutionId_sequenceKey: { institutionId, sequenceKey: 'DOCUMENT' } } }),
    prisma.idCardTemplate.findMany({ where: { institutionId, isActive: true } }),
    prisma.rollNumberRule.findUnique({ where: { institutionId } }),
    prisma.admissionNumberSequence.findUnique({ where: { institutionId } }),
    prisma.employeeCodeRule.findUnique({ where: { institutionId } }),
    prisma.profileCustomField.findMany({ where: { institutionId, isActive: true }, orderBy: [{ entityType: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.customFieldType.findMany({ where: { institutionId, isActive: true } }),
  ]);

  return {
    stats: {
      categories: categories.length,
      documentTypes: documentTypes.length,
      templates: templates.length,
      applicationDocs: applicationDocs.length,
      requiredDocs: requiredDocs.length,
      customFields: customFields.length,
      fieldTypes: fieldTypes.length,
    },
    categories,
    documentTypes,
    templates,
    applicationDocs,
    requiredDocs,
    numbering,
    idCards,
    rollRule,
    admissionSeq,
    employeeRule,
    customFields,
    fieldTypes,
  };
}

export async function allocateDocumentNumber(institutionId: string) {
  const seq = await prisma.$transaction(async (tx) => {
    const row = await tx.documentNumberSequence.findUnique({
      where: { institutionId_sequenceKey: { institutionId, sequenceKey: 'DOCUMENT' } },
    });
    if (!row || row.isLocked) throw new Error('Document numbering not configured');
    const num = row.nextNumber;
    await tx.documentNumberSequence.update({
      where: { id: row.id },
      data: { nextNumber: num + 1 },
    });
    return { ...row, allocated: num };
  });
  const padded = String(seq.allocated).padStart(seq.padLength, '0');
  return `${seq.prefix}${padded}${seq.suffix}`;
}

export async function allocateAdmissionNumberFromSeq(institutionId: string) {
  const seq = await prisma.$transaction(async (tx) => {
    let row = await tx.admissionNumberSequence.findUnique({ where: { institutionId } });
    if (!row) {
      row = await tx.admissionNumberSequence.create({
        data: { institutionId, prefix: 'ADM-', nextNumber: 1 },
      });
    }
    const num = row.nextNumber;
    await tx.admissionNumberSequence.update({
      where: { id: row.id },
      data: { nextNumber: num + 1 },
    });
    return { ...row, allocated: num };
  });
  const padded = String(seq.allocated).padStart(seq.padLength, '0');
  return seq.prefix.endsWith('-') ? `${seq.prefix}${padded}` : `${seq.prefix}${padded}`;
}

export async function allocateEmployeeCode(institutionId: string) {
  const rule = await prisma.$transaction(async (tx) => {
    let row = await tx.employeeCodeRule.findUnique({ where: { institutionId } });
    if (!row) {
      row = await tx.employeeCodeRule.create({
        data: { institutionId, prefix: 'EMP-', nextNumber: 1 },
      });
    }
    const num = row.nextNumber;
    await tx.employeeCodeRule.update({
      where: { id: row.id },
      data: { nextNumber: num + 1 },
    });
    return { ...row, allocated: num };
  });
  const year = new Date().getFullYear();
  const padded = String(rule.allocated).padStart(rule.padLength, '0');
  return rule.formatFormula
    .replace('{YEAR}', String(year))
    .replace('{SEQ}', padded)
    .replace('{PREFIX}', rule.prefix);
}

export async function onDocumentIdentityTileSaved(institutionId: string, tileKey: string, actorEmail = 'system') {
  if (tileKey === 'documentSetup' || tileKey === 'idCardNumbering' || tileKey === 'customFieldsSetup') {
    return { documentIdentity: await syncDocumentIdentityFromSetup(institutionId, actorEmail) };
  }
  return null;
}

export async function bootstrapDocumentIdentity(institutionId: string) {
  const count = await prisma.documentCategory.count({ where: { institutionId } });
  if (count === 0) {
    await syncDocumentIdentityFromSetup(institutionId);
  }
}
