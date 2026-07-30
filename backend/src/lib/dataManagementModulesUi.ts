import type { Prisma } from '@prisma/client';
import { ParentRelationship, PayrollEmploymentType } from '@prisma/client';
import { prisma } from './prisma.js';
import { logUserActivity } from './securityAuditCompliance.js';

type SetupSections = Record<string, Record<string, unknown>>;

const SYNC_TILE_KEYS = ['dataImportExport', 'modulesUiSetup'] as const;

const DEFAULT_MODULES = [
  { code: 'ADMISSION', label: 'Admission Management', order: 1 },
  { code: 'STUDENT', label: 'Student Management', order: 2 },
  { code: 'ACADEMIC', label: 'Academic Management', order: 3 },
  { code: 'EXAMINATION', label: 'Examination Management', order: 4 },
  { code: 'FEE', label: 'Fee Financial Operations', order: 5 },
  { code: 'HR', label: 'HR & Payroll', order: 6 },
  { code: 'TRANSPORT', label: 'Transport Management', order: 7 },
  { code: 'HOSTEL', label: 'Hostel Management', order: 8 },
  { code: 'LIBRARY', label: 'Library Management', order: 9 },
  { code: 'INVENTORY', label: 'Inventory Management', order: 10 },
  { code: 'COMMUNICATION', label: 'Communication', order: 11 },
  { code: 'SETTINGS', label: 'Settings Management', order: 12 },
];

const DEFAULT_WORKFLOWS = [
  { type: 'LEAVE', name: 'Leave Approval', sequence: ['HOD', 'HR', 'PRINCIPAL'], threshold: 0 },
  { type: 'PURCHASE', name: 'Purchase Request', sequence: ['HOD', 'ACCOUNTS', 'PRINCIPAL'], threshold: 50000 },
  { type: 'MARKS_OVERRIDE', name: 'Marks Override', sequence: ['TEACHER', 'HOD', 'EXAM_CELL'], threshold: 0 },
];

const DEFAULT_WIDGETS = [
  { id: 'kpi_students', label: 'Student Count', type: 'metric' },
  { id: 'kpi_fees', label: 'Fee Collection', type: 'metric' },
  { id: 'kpi_attendance', label: 'Attendance Today', type: 'chart' },
  { id: 'shortcuts', label: 'Quick Actions', type: 'shortcuts' },
];

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

function parseLines(raw: string) {
  return raw.split('\n').map((l) => l.trim()).filter(Boolean);
}

function parseKeyValueLines(raw: string): Array<Record<string, string>> {
  return parseLines(raw).map((line) => {
    const [left, right] = line.split(':').map((s) => s.trim());
    if (!left) return null;
    const parts = (right || '').split('|').map((s) => s.trim());
    return { name: left, value: parts[0] || '', extra: parts.slice(1).join('|') };
  }).filter(Boolean) as Array<Record<string, string>>;
}

function slugCode(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'ITEM';
}

function toParentRelationship(value: string): ParentRelationship {
  const v = value.toUpperCase();
  if (v.includes('FATHER')) return ParentRelationship.FATHER;
  if (v.includes('MOTHER')) return ParentRelationship.MOTHER;
  return ParentRelationship.GUARDIAN;
}

export function loadDataModulesUiSetup(setup: {
  dataImportExport?: unknown;
  modulesUiSetup?: unknown;
} | null) {
  const imp = readSetupSections(setup?.dataImportExport);
  const mod = readSetupSections(setup?.modulesUiSetup);

  return {
    import: {
      studentsEnabled: readField(imp, ['Import Students', 'importStudents'], 'enabled', 'Yes'),
      studentColumns: readField(
        imp,
        ['Import Students', 'importStudents'],
        'requiredColumns',
        'Name, Class, Section, DOB, Mobile, Soft ID, SR No, Portal NIC Code',
      ),
      employeesEnabled: readField(imp, ['Import Employees', 'importEmployees'], 'enabled', 'Yes'),
      employeeColumns: readField(imp, ['Import Employees', 'importEmployees'], 'requiredColumns', 'employeeCode,fullName,department,mobile,email'),
      parentsEnabled: readField(imp, ['Import Parents', 'importParents'], 'enabled', 'Yes'),
      parentColumns: readField(
        imp,
        ['Import Parents', 'importParents'],
        'requiredColumns',
        'parentName,mobile,studentAdmissionNumber,studentSoftId,studentSrNo,studentPortalNicCode,relationship',
      ),
      exportFormats: readField(imp, ['Export Data', 'exportData'], 'formats', 'xlsx, csv'),
      scheduledExports: readField(imp, ['Scheduled Exports', 'scheduledExports'], 'jobs', ''),
      mappingNotes: readField(imp, ['Data Mapping', 'dataMapping'], 'mappingNotes', ''),
    },
    modules: {
      activeModules: readField(mod, ['Module Activation', 'moduleActivation'], 'activeModules', DEFAULT_MODULES.map((m) => m.code).join(', ')),
      licenseKey: readField(mod, ['Module Activation', 'moduleActivation'], 'licenseKey', ''),
      configNotes: readField(mod, ['Module Configuration', 'moduleConfiguration'], 'configNotes', ''),
      workflows: readField(mod, ['Workflow Settings', 'workflowSettings'], 'workflows', ''),
      featurePermissions: readField(mod, ['Feature Permissions', 'featurePermissions'], 'permissions', ''),
      moduleOrder: readField(mod, ['Module Order', 'moduleOrder'], 'order', ''),
      themeBrand: readField(mod, ['Theme Settings', 'themeSettings'], 'brandName', ''),
      themeLogo: readField(mod, ['Theme Settings', 'themeSettings'], 'logoUrl', ''),
      themeFont: readField(mod, ['Theme Settings', 'themeSettings'], 'fontFamily', 'Inter, sans-serif'),
      colorPrimary: readField(mod, ['Color Schemes', 'colorSchemes'], 'primaryColor', '#2563eb'),
      colorSecondary: readField(mod, ['Color Schemes', 'colorSchemes'], 'secondaryColor', '#64748b'),
      colorAccent: readField(mod, ['Color Schemes', 'colorSchemes'], 'accentColor', '#0d9488'),
      customCss: readField(mod, ['Custom CSS', 'customCss'], 'cssContent', ''),
      menuTree: readField(mod, ['Menu Management', 'menuManagement'], 'menuTree', ''),
      dashboardWidgets: readField(mod, ['Dashboard Widgets', 'dashboardWidgets'], 'widgets', ''),
    },
  };
}

export async function syncDataModulesUiFromSetup(institutionId: string, actorEmail = 'system') {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  if (!institution?.setup) return { synced: false };

  const config = loadDataModulesUiSetup({
    dataImportExport: institution.setup.dataImportExport,
    modulesUiSetup: institution.setup.modulesUiSetup,
  });

  let moduleCount = 0;
  const activeCodes = config.modules.activeModules.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const orderList = config.modules.moduleOrder
    ? config.modules.moduleOrder.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
    : DEFAULT_MODULES.map((m) => m.code);

  for (const mod of DEFAULT_MODULES) {
    const isActive = activeCodes.length === 0 || activeCodes.includes(mod.code) || activeCodes.includes(mod.label);
    const sortOrder = orderList.indexOf(mod.code) >= 0 ? orderList.indexOf(mod.code) : mod.order;
    await prisma.systemModule.upsert({
      where: { institutionId_moduleCode: { institutionId, moduleCode: mod.code } },
      create: {
        institutionId,
        moduleCode: mod.code,
        moduleLabel: mod.label,
        isActive,
        licenseKey: config.modules.licenseKey,
        sortOrder,
        config: { notes: config.modules.configNotes },
      },
      update: {
        isActive,
        licenseKey: config.modules.licenseKey,
        sortOrder,
        config: { notes: config.modules.configNotes },
      },
    });
    moduleCount += 1;
  }

  await prisma.menuStructure.upsert({
    where: { institutionId_roleCode: { institutionId, roleCode: 'ALL' } },
    create: {
      institutionId,
      roleCode: 'ALL',
      moduleOrder: orderList as Prisma.InputJsonValue,
    },
    update: { moduleOrder: orderList as Prisma.InputJsonValue },
  });

  let workflowCount = 0;
  const workflowLines = parseKeyValueLines(config.modules.workflows);
  if (workflowLines.length) {
    for (const line of workflowLines) {
      const seq = (line.extra || line.value).split('>').map((s) => s.trim()).filter(Boolean);
      await prisma.workflowRule.upsert({
        where: {
          institutionId_workflowType_ruleName: {
            institutionId,
            workflowType: slugCode(line.name),
            ruleName: line.name,
          },
        },
        create: {
          institutionId,
          workflowType: slugCode(line.name),
          ruleName: line.name,
          approvalSequence: seq as Prisma.InputJsonValue,
          thresholdAmount: Number(line.value) || 0,
        },
        update: {
          approvalSequence: seq as Prisma.InputJsonValue,
          thresholdAmount: Number(line.value) || 0,
        },
      });
      workflowCount += 1;
    }
  } else {
    for (const wf of DEFAULT_WORKFLOWS) {
      await prisma.workflowRule.upsert({
        where: {
          institutionId_workflowType_ruleName: {
            institutionId,
            workflowType: wf.type,
            ruleName: wf.name,
          },
        },
        create: {
          institutionId,
          workflowType: wf.type,
          ruleName: wf.name,
          approvalSequence: wf.sequence as Prisma.InputJsonValue,
          thresholdAmount: wf.threshold,
        },
        update: {
          approvalSequence: wf.sequence as Prisma.InputJsonValue,
          thresholdAmount: wf.threshold,
        },
      });
      workflowCount += 1;
    }
  }

  let featureCount = 0;
  for (const line of parseKeyValueLines(config.modules.featurePermissions)) {
    const [modCode, featCode] = line.name.split('.').map((s) => s.trim());
    if (!modCode || !featCode) continue;
    await prisma.moduleFeaturePermission.upsert({
      where: {
        institutionId_moduleCode_featureCode_roleCode: {
          institutionId,
          moduleCode: modCode,
          featureCode: featCode,
          roleCode: line.extra || 'ADMIN',
        },
      },
      create: {
        institutionId,
        moduleCode: modCode,
        featureCode: featCode,
        featureLabel: featCode.replace(/_/g, ' '),
        roleCode: line.extra || 'ADMIN',
        accessLevel: line.value || 'FULL',
      },
      update: { accessLevel: line.value || 'FULL' },
    });
    featureCount += 1;
  }

  const menuNodes = config.modules.menuTree
    ? parseLines(config.modules.menuTree).map((label, i) => ({ id: slugCode(label), label, order: i }))
    : DEFAULT_MODULES.filter((m) => activeCodes.length === 0 || activeCodes.includes(m.code)).map((m, i) => ({
      id: m.code,
      label: m.label,
      order: i,
    }));

  await prisma.uiMenu.upsert({
    where: { institutionId_roleCode: { institutionId, roleCode: 'ALL' } },
    create: { institutionId, roleCode: 'ALL', menuTree: menuNodes as Prisma.InputJsonValue },
    update: { menuTree: menuNodes as Prisma.InputJsonValue },
  });

  const widgetLines = parseLines(config.modules.dashboardWidgets);
  const widgets = widgetLines.length
    ? widgetLines.map((label, i) => ({ id: slugCode(label), label, order: i, type: 'metric' }))
    : DEFAULT_WIDGETS;

  for (const role of ['ADMIN', 'TEACHER', 'STAFF']) {
    await prisma.dashboardPreference.upsert({
      where: { institutionId_roleCode: { institutionId, roleCode: role } },
      create: {
        institutionId,
        roleCode: role,
        widgets: widgets as Prisma.InputJsonValue,
      },
      update: { widgets: widgets as Prisma.InputJsonValue },
    });
  }

  await prisma.themeSetting.upsert({
    where: { institutionId },
    create: {
      institutionId,
      brandName: config.modules.themeBrand || institution.name,
      logoUrl: config.modules.themeLogo,
      fontFamily: config.modules.themeFont,
    },
    update: {
      brandName: config.modules.themeBrand || institution.name,
      logoUrl: config.modules.themeLogo,
      fontFamily: config.modules.themeFont,
    },
  });

  await prisma.colorScheme.upsert({
    where: { institutionId_schemeName: { institutionId, schemeName: 'Default' } },
    create: {
      institutionId,
      schemeName: 'Default',
      primaryColor: config.modules.colorPrimary,
      secondaryColor: config.modules.colorSecondary,
      accentColor: config.modules.colorAccent,
      isActive: true,
    },
    update: {
      primaryColor: config.modules.colorPrimary,
      secondaryColor: config.modules.colorSecondary,
      accentColor: config.modules.colorAccent,
    },
  });

  if (config.modules.customCss.trim()) {
    await prisma.customCssSnippet.upsert({
      where: { institutionId_snippetName: { institutionId, snippetName: 'Global Overrides' } },
      create: {
        institutionId,
        snippetName: 'Global Overrides',
        cssContent: config.modules.customCss,
      },
      update: { cssContent: config.modules.customCss },
    });
  }

  let scheduledCount = 0;
  for (const line of parseKeyValueLines(config.import.scheduledExports)) {
    const cron = line.value || '0 2 * * *';
    const target = line.extra || '';
    await prisma.scheduledExport.upsert({
      where: { institutionId_jobName: { institutionId, jobName: line.name } },
      create: {
        institutionId,
        jobName: line.name,
        cronExpression: cron,
        targetUri: target,
        exportFormat: config.import.exportFormats.split(',')[0]?.trim() || 'xlsx',
        module: line.name,
      },
      update: { cronExpression: cron, targetUri: target },
    });
    scheduledCount += 1;
  }

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'DATA_MODULES_UI_SYNC',
    module: 'Data Management, Modules & UI',
    details: JSON.stringify({ moduleCount, workflowCount, featureCount, scheduledCount }),
  });

  return {
    synced: true,
    modules: moduleCount,
    workflows: workflowCount,
    featurePermissions: featureCount,
    scheduledExports: scheduledCount,
  };
}

export async function onDataModulesUiTileSaved(institutionId: string, tileKey: string) {
  if (!SYNC_TILE_KEYS.includes(tileKey as typeof SYNC_TILE_KEYS[number])) return null;
  return syncDataModulesUiFromSetup(institutionId);
}

export async function bootstrapDataModulesUi(institutionId: string) {
  const count = await prisma.systemModule.count({ where: { institutionId } });
  if (count === 0) await syncDataModulesUiFromSetup(institutionId);
}

type ImportRow = Record<string, string>;

async function resolveStudentForParentImport(institutionId: string, row: ImportRow) {
  const admissionNumber = (row.studentAdmissionNumber || row.admissionNumber || '').trim();
  const softId = (row.studentSoftId || row.softId || '').trim();
  const srNo = (row.studentSrNo || row.srNo || '').trim();
  const portalNicCode = (row.studentPortalNicCode || row.portalNicCode || '').trim();

  if (!admissionNumber && !softId && !srNo && !portalNicCode) return null;

  const or = [
    admissionNumber ? { admissionNumber } : null,
    softId ? { softId } : null,
    srNo ? { srNo } : null,
    portalNicCode ? { portalNicCode } : null,
  ].filter(Boolean) as Array<{ admissionNumber?: string; softId?: string; srNo?: string; portalNicCode?: string }>;

  return prisma.student.findFirst({
    where: { institutionId, OR: or },
  });
}

export async function importEmployeesBatch(
  institutionId: string,
  rows: ImportRow[],
  actorEmail: string,
  fileName = 'upload.csv',
) {
  const errors: Array<{ row: number; message: string; data: ImportRow }> = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const code = (row.employeeCode || row.code || '').trim();
    const fullName = (row.fullName || row.name || '').trim();
    if (!code || !fullName) {
      errors.push({ row: i + 1, message: 'employeeCode and fullName are required', data: row });
      continue;
    }
    const existing = await prisma.payrollEmployee.findFirst({
      where: { institutionId, employeeCode: code },
    });
    if (existing) {
      await prisma.payrollEmployee.update({
        where: { id: existing.id },
        data: {
          fullName,
          department: row.department || existing.department,
          designation: row.designation || existing.designation,
          mobile: row.mobile || existing.mobile,
          email: row.email || existing.email,
          employmentType: (row.employmentType?.toUpperCase().includes('NON') ? PayrollEmploymentType.NON_TEACHING : PayrollEmploymentType.TEACHING),
        },
      });
    } else {
      await prisma.payrollEmployee.create({
        data: {
          institutionId,
          employeeCode: code,
          fullName,
          department: row.department || 'General',
          designation: row.designation || 'Staff',
          mobile: row.mobile || '',
          email: row.email || '',
        },
      });
    }
    successCount += 1;
  }

  const log = await prisma.importLog.create({
    data: {
      institutionId,
      importType: 'EMPLOYEE',
      fileName,
      status: errors.length ? 'PARTIAL' : 'COMPLETED',
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      errorMatrix: errors as Prisma.InputJsonValue,
      executedBy: actorEmail,
    },
  });

  return { logId: log.id, successCount, errorCount: errors.length, errors };
}

export async function importParentsBatch(
  institutionId: string,
  rows: ImportRow[],
  actorEmail: string,
  fileName = 'upload.csv',
) {
  const errors: Array<{ row: number; message: string; data: ImportRow }> = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const fullName = (row.parentName || row.fullName || row.name || '').trim();
    const mobile = (row.mobile || row.phone || '').trim();
    const relationship = toParentRelationship(row.relationship || 'GUARDIAN');

    if (!fullName) {
      errors.push({ row: i + 1, message: 'parentName is required', data: row });
      continue;
    }

    const student = await resolveStudentForParentImport(institutionId, row);
    if (!student) {
      errors.push({
        row: i + 1,
        message:
          'Student not found. Provide studentAdmissionNumber, studentSoftId, studentSrNo, or studentPortalNicCode.',
        data: row,
      });
      continue;
    }

    const parent = await prisma.parentProfile.upsert({
      where: {
        institutionId_mobile_fullName: {
          institutionId,
          mobile: mobile || `NA_${slugCode(fullName)}`,
          fullName,
        },
      },
      create: {
        institutionId,
        fullName,
        mobile: mobile || `NA_${slugCode(fullName)}`,
        email: row.email || '',
        relationship: relationship,
      },
      update: { email: row.email || '', isActive: true },
    });

    await prisma.studentParentLink.upsert({
      where: {
        institutionId_parentId_studentId: {
          institutionId,
          parentId: parent.id,
          studentId: student.id,
        },
      },
      create: {
        institutionId,
        parentId: parent.id,
        studentId: student.id,
        relationship,
      },
      update: { relationship },
    });

    if (relationship === ParentRelationship.FATHER) {
      await prisma.student.update({
        where: { id: student.id },
        data: { fatherName: fullName, fatherMobile: mobile || student.fatherMobile },
      });
    } else if (relationship === ParentRelationship.MOTHER) {
      await prisma.student.update({
        where: { id: student.id },
        data: { motherName: fullName, motherMobile: mobile || student.motherMobile },
      });
    }

    successCount += 1;
  }

  const log = await prisma.importLog.create({
    data: {
      institutionId,
      importType: 'PARENT',
      fileName,
      status: errors.length ? 'PARTIAL' : 'COMPLETED',
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      errorMatrix: errors as Prisma.InputJsonValue,
      executedBy: actorEmail,
    },
  });

  return { logId: log.id, successCount, errorCount: errors.length, errors };
}

export async function recordExportHistory(
  institutionId: string,
  data: {
    userEmail: string;
    exportFormat: string;
    module: string;
    rowsExported: number;
    fileName?: string;
    queryParams?: Record<string, unknown>;
  },
) {
  return prisma.exportHistory.create({
    data: {
      institutionId,
      userEmail: data.userEmail,
      exportFormat: data.exportFormat,
      module: data.module,
      rowsExported: data.rowsExported,
      fileName: data.fileName || '',
      queryParams: (data.queryParams || {}) as Prisma.InputJsonValue,
    },
  });
}

export async function getDataModulesUiOverview(institutionId: string) {
  const [
    importLogs,
    exportHistory,
    scheduledExports,
    systemModules,
    workflowRules,
    featurePermissions,
    menuStructures,
    uiMenus,
    dashboardPreferences,
    themeSettings,
    colorSchemes,
    customCss,
    parentCount,
    employeeCount,
  ] = await Promise.all([
    prisma.importLog.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.exportHistory.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.scheduledExport.findMany({ where: { institutionId }, orderBy: { jobName: 'asc' } }),
    prisma.systemModule.findMany({ where: { institutionId }, orderBy: { sortOrder: 'asc' } }),
    prisma.workflowRule.findMany({ where: { institutionId }, orderBy: { workflowType: 'asc' } }),
    prisma.moduleFeaturePermission.findMany({ where: { institutionId }, orderBy: { moduleCode: 'asc' } }),
    prisma.menuStructure.findMany({ where: { institutionId } }),
    prisma.uiMenu.findMany({ where: { institutionId } }),
    prisma.dashboardPreference.findMany({ where: { institutionId } }),
    prisma.themeSetting.findFirst({ where: { institutionId } }),
    prisma.colorScheme.findMany({ where: { institutionId } }),
    prisma.customCssSnippet.findMany({ where: { institutionId } }),
    prisma.parentProfile.count({ where: { institutionId, isActive: true } }),
    prisma.payrollEmployee.count({ where: { institutionId } }),
  ]);

  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const config = loadDataModulesUiSetup({
    dataImportExport: setup?.dataImportExport,
    modulesUiSetup: setup?.modulesUiSetup,
  });

  return {
    stats: {
      employees: employeeCount,
      parents: parentCount,
      importJobs: importLogs.length,
      exports: exportHistory.length,
      scheduledExports: scheduledExports.filter((j) => j.isActive).length,
      activeModules: systemModules.filter((m) => m.isActive).length,
      workflows: workflowRules.filter((w) => w.isActive).length,
      featurePermissions: featurePermissions.filter((f) => f.isActive).length,
    },
    config,
    importLogs: importLogs.map((l) => ({
      id: l.id,
      importType: l.importType,
      fileName: l.fileName,
      status: l.status,
      totalRows: l.totalRows,
      successCount: l.successCount,
      errorCount: l.errorCount,
      executedBy: l.executedBy,
      createdAt: l.createdAt.toISOString(),
    })),
    exportHistory: exportHistory.map((e) => ({
      id: e.id,
      userEmail: e.userEmail,
      exportFormat: e.exportFormat,
      module: e.module,
      rowsExported: e.rowsExported,
      fileName: e.fileName,
      createdAt: e.createdAt.toISOString(),
    })),
    scheduledExports: scheduledExports.map((j) => ({
      id: j.id,
      jobName: j.jobName,
      cronExpression: j.cronExpression,
      targetUri: j.targetUri,
      exportFormat: j.exportFormat,
      module: j.module,
      isActive: j.isActive,
      lastRunAt: j.lastRunAt?.toISOString() ?? '—',
    })),
    systemModules: systemModules.map((m) => ({
      id: m.id,
      moduleCode: m.moduleCode,
      moduleLabel: m.moduleLabel,
      isActive: m.isActive,
      sortOrder: m.sortOrder,
      licenseKey: m.licenseKey ? '••••••' : '—',
    })),
    workflowRules: workflowRules.map((w) => ({
      id: w.id,
      workflowType: w.workflowType,
      ruleName: w.ruleName,
      approvalSequence: w.approvalSequence,
      thresholdAmount: w.thresholdAmount,
      isActive: w.isActive,
    })),
    featurePermissions: featurePermissions.map((f) => ({
      id: f.id,
      moduleCode: f.moduleCode,
      featureCode: f.featureCode,
      featureLabel: f.featureLabel,
      roleCode: f.roleCode,
      accessLevel: f.accessLevel,
    })),
    menuStructures: menuStructures.map((m) => ({
      id: m.id,
      roleCode: m.roleCode,
      moduleOrder: m.moduleOrder,
    })),
    uiMenus: uiMenus.map((m) => ({
      id: m.id,
      roleCode: m.roleCode,
      menuTree: m.menuTree,
    })),
    dashboardPreferences: dashboardPreferences.map((d) => ({
      id: d.id,
      roleCode: d.roleCode,
      widgets: d.widgets,
    })),
    themeSettings: themeSettings ?? null,
    colorSchemes,
    customCss,
  };
}

export async function getImportLogDetail(institutionId: string, logId: string) {
  const log = await prisma.importLog.findFirst({ where: { institutionId, id: logId } });
  if (!log) return null;
  return {
    ...log,
    errorMatrix: log.errorMatrix,
    createdAt: log.createdAt.toISOString(),
  };
}
