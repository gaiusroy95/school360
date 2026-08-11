import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  MASTER_TEMPLATE_HEADERS,
  runMasterDataMigration,
  type MigrationSheetKey,
} from '../lib/dataMigration.js';

export const dataMigrationRouter = Router();
dataMigrationRouter.use(requireAuth);

dataMigrationRouter.get(
  '/template-meta',
  asyncHandler(async (_req, res) => {
    return res.json({
      sheets: [
        {
          key: 'students' as const,
          label: 'Students',
          description: 'Existing student master — syncs to Student Management',
          headers: MASTER_TEMPLATE_HEADERS.students,
          sample: [
            {
              'Admission No.': 'ADM2025001',
              'First Name': 'Aarav',
              'Last Name': 'Sharma',
              Class: '10',
              Section: 'A',
              'Academic Year': '2025-26',
              Gender: 'Male',
              Mobile: '9876543210',
              'Father Name': 'Rakesh Sharma',
              'Father Mobile': '9876543211',
              Status: 'ACTIVE',
            },
          ],
        },
        {
          key: 'teachers' as const,
          label: 'Teachers',
          description: 'Teaching / non-teaching staff — syncs to HR Employees Directory',
          headers: MASTER_TEMPLATE_HEADERS.teachers,
          sample: [
            {
              'Employee Code': 'EMP-1001',
              'Full Name': 'Mrs. Priya Verma',
              'Employment Type': 'TEACHING',
              Department: 'Academics',
              Designation: 'TGT - English',
              Mobile: '9876500011',
              Email: 'priya.verma@school.edu',
            },
          ],
        },
        {
          key: 'accounts' as const,
          label: 'Accounts',
          description: 'Fee dues / balances — syncs to FeeDue (linked by Admission No.)',
          headers: MASTER_TEMPLATE_HEADERS.accounts,
          sample: [
            {
              'Admission No.': 'ADM2025001',
              'Academic Year': '2025-26',
              'Fee Head': 'tuitionFee',
              Title: 'Tuition Fee Term 1',
              Amount: 15000,
              'Due Date': '2025-07-15',
              Status: 'PENDING',
            },
          ],
        },
        {
          key: 'results' as const,
          label: 'Results',
          description: 'Exam results — syncs to Examination Result batches by class/exam',
          headers: MASTER_TEMPLATE_HEADERS.results,
          sample: [
            {
              'Admission No.': 'ADM2025001',
              'Academic Year': '2025-26',
              'Examination Name': 'Annual Exam',
              Class: '10',
              Section: 'A',
              'Total Obtained': 432,
              'Total Max': 500,
              Percentage: 86.4,
              Grade: 'A',
              Rank: 3,
              'Subject Scores': 'English:85|Maths:90|Science:88',
            },
          ],
        },
      ],
      instructions: [
        'Download the Master Excel template (4 sheets: Students, Teachers, Accounts, Results).',
        'Fill existing school data. Keep sheet names as Students / Teachers / Accounts / Results.',
        'Upload the file. Students are imported first so Accounts & Results can link by Admission No.',
        'Toggle Update existing to refresh matching records (admission no. / employee code).',
      ],
    });
  }),
);

const importSchema = z.object({
  fileName: z.string().optional(),
  updateExisting: z.boolean().optional().default(true),
  sheets: z.object({
    students: z.array(z.record(z.unknown())).optional(),
    teachers: z.array(z.record(z.unknown())).optional(),
    accounts: z.array(z.record(z.unknown())).optional(),
    results: z.array(z.record(z.unknown())).optional(),
  }),
});

dataMigrationRouter.post(
  '/import',
  asyncHandler(async (req, res) => {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const summary = await runMasterDataMigration(institutionId, {
      fileName: parsed.data.fileName,
      updateExisting: parsed.data.updateExisting,
      sheets: parsed.data.sheets as Partial<Record<MigrationSheetKey, Record<string, unknown>[]>>,
    });
    return res.json(summary);
  }),
);
