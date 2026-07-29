import { DEFAULT_RECIPIENT_ROLES, NOTIFICATION_MEDIUMS, NOTIFICATION_TRIGGER_EVENTS, RECIPIENT_ROLE_OPTIONS } from './notificationTriggerEvents';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'tel'
  | 'url'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'eventMultiselect'
  | 'checkbox'
  | 'password';

export type SetupField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  help?: string;
  defaultValue?: string;
};

export type SetupSection = {
  id: string;
  title: string;
  description?: string;
  fields: SetupField[];
  /** Repeatable rows stored as JSON in one section field (storageKey). */
  dynamicList?: {
    storageKey: string;
    addLabel: string;
    itemLabel?: string;
    fields: SetupField[];
  };
};

export type SetupTileSchema = {
  key: string;
  title: string;
  /** Excel sheet name (kept short for Excel limits) */
  sheetName: string;
  desc: string;
  sections: SetupSection[];
  /** If true, Express template also includes a sample data-row table */
  hasRecords?: boolean;
  recordColumns?: { key: string; label: string }[];
  sampleRecords?: Record<string, string>[];
};

export const INSTITUTION_SETUP_TILES: SetupTileSchema[] = [
  {
    key: 'basicInformation',
    title: 'Basic Information',
    sheetName: '01 Basic Information',
    desc: 'Manage institution identity and contact details',
    sections: [
      {
        id: 'institutionProfile',
        title: 'Institution Profile',
        fields: [
          { key: 'institutionName', label: 'Institution Name', type: 'text', required: true, placeholder: 'Greenwood International School' },
          { key: 'shortName', label: 'Short Name', type: 'text', placeholder: 'GIS' },
          { key: 'registrationNo', label: 'Registration Number', type: 'text' },
          { key: 'affiliationNo', label: 'Affiliation Number', type: 'text' },
          { key: 'schoolType', label: 'School Type', type: 'select', options: ['Private', 'Public', 'International', 'Boarding', 'Day School'] },
          { key: 'establishedYear', label: 'Established Year', type: 'number', placeholder: '1998' },
          { key: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
        ],
      },
      {
        id: 'addressContact',
        title: 'Address & Contact',
        fields: [
          { key: 'addressLine1', label: 'Address Line 1', type: 'text', required: true },
          { key: 'addressLine2', label: 'Address Line 2', type: 'text' },
          { key: 'city', label: 'City', type: 'text', required: true },
          { key: 'state', label: 'State', type: 'text', required: true },
          { key: 'country', label: 'Country', type: 'text', required: true },
          { key: 'pincode', label: 'Pincode', type: 'text' },
          { key: 'phone', label: 'Primary Phone', type: 'tel', required: true },
          { key: 'alternatePhone', label: 'Alternate Phone', type: 'tel' },
          { key: 'email', label: 'Official Email', type: 'email', required: true },
        ],
      },
      {
        id: 'logoBranding',
        title: 'Logo & Branding',
        fields: [
          { key: 'logoUrl', label: 'Logo URL', type: 'url', help: 'Default: /logo.png (bundled app logo)', placeholder: '/logo.png' },
          { key: 'faviconUrl', label: 'Favicon URL', type: 'url', placeholder: '/favicon.png' },
          { key: 'primaryColor', label: 'Primary Color', type: 'text', placeholder: '#0f172a' },
          { key: 'secondaryColor', label: 'Secondary Color', type: 'text', placeholder: '#fbbf24' },
        ],
      },
      {
        id: 'socialMedia',
        title: 'Social Media Links',
        fields: [
          { key: 'facebook', label: 'Facebook', type: 'url' },
          { key: 'instagram', label: 'Instagram', type: 'url' },
          { key: 'youtube', label: 'YouTube', type: 'url' },
          { key: 'linkedin', label: 'LinkedIn', type: 'url' },
          { key: 'twitter', label: 'Twitter / X', type: 'url' },
        ],
      },
      {
        id: 'aboutInstitution',
        title: 'About Institution',
        fields: [
          { key: 'mission', label: 'Mission', type: 'textarea' },
          { key: 'vision', label: 'Vision', type: 'textarea' },
          { key: 'about', label: 'About Institution', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'academicSetup',
    title: 'Academic Setup',
    sheetName: '02 Academic Setup',
    desc: 'Configure academic hierarchy and study system',
    sections: [
      {
        id: 'educationBoard',
        title: 'Education Board',
        fields: [
          { key: 'boardName', label: 'Education Board', type: 'select', options: ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'Other'], required: true },
          { key: 'boardCode', label: 'Board Code', type: 'text' },
        ],
      },
      {
        id: 'medium',
        title: 'Medium of Instruction',
        fields: [
          { key: 'defaultMedium', label: 'Default Medium', type: 'select', options: ['English', 'Hindi', 'Regional', 'Bilingual'], required: true },
          { key: 'supportedMediums', label: 'Supported Mediums (comma separated)', type: 'text', placeholder: 'English, Hindi' },
        ],
      },
      {
        id: 'academicStructure',
        title: 'Academic Structure',
        fields: [
          { key: 'levels', label: 'Academic Levels', type: 'text', placeholder: 'Primary, Middle, Secondary, Senior Secondary' },
          { key: 'classFrom', label: 'Class From', type: 'text', placeholder: 'Nursery / 1' },
          { key: 'classTo', label: 'Class To', type: 'text', placeholder: '12' },
        ],
      },
      {
        id: 'streamGroup',
        title: 'Stream & Group',
        fields: [
          { key: 'streams', label: 'Streams', type: 'text', placeholder: 'Science, Commerce, Arts' },
          { key: 'groups', label: 'Groups', type: 'text', placeholder: 'PCM, PCB, Commerce' },
        ],
      },
      {
        id: 'promotionCriteria',
        title: 'Promotion Criteria',
        fields: [
          { key: 'minPercentage', label: 'Minimum Percentage', type: 'number', placeholder: '33' },
          { key: 'minAttendance', label: 'Minimum Attendance %', type: 'number', placeholder: '75' },
          { key: 'autoPromote', label: 'Auto Promote Eligible Students', type: 'select', options: ['Yes', 'No'] },
        ],
      },
    ],
  },
  {
    key: 'classesSections',
    title: 'Classes & Sections',
    sheetName: '03 Classes Sections',
    desc: 'Create and manage classes and sections',
    hasRecords: true,
    recordColumns: [
      { key: 'className', label: 'Class Name' },
      { key: 'sectionName', label: 'Section Name' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'room', label: 'Room Mapping' },
      { key: 'classTeacher', label: 'Class Teacher' },
    ],
    sampleRecords: [
      { className: 'Class 1', sectionName: 'A', capacity: '30', room: 'Room 101', classTeacher: 'Mrs. Sharma' },
      { className: 'Class 1', sectionName: 'B', capacity: '30', room: 'Room 102', classTeacher: 'Mr. Verma' },
      { className: 'Class 2', sectionName: 'A', capacity: '35', room: 'Room 103', classTeacher: 'Ms. Patel' },
    ],
    sections: [
      {
        id: 'classManagement',
        title: 'Class Management',
        fields: [
          { key: 'namingPattern', label: 'Class Naming Pattern', type: 'text', placeholder: 'Class {n}' },
          { key: 'activeClassesCount', label: 'Expected Active Classes', type: 'number' },
        ],
      },
      {
        id: 'sectionManagement',
        title: 'Section Management',
        fields: [
          { key: 'defaultSections', label: 'Default Sections', type: 'text', placeholder: 'A, B, C' },
          { key: 'maxSectionsPerClass', label: 'Max Sections Per Class', type: 'number', placeholder: '6' },
        ],
      },
      {
        id: 'classTeacherAssign',
        title: 'Class Teacher Assign',
        description: 'Assign a class teacher to each class–section. Data is stored in the master list.',
        fields: [
          { key: 'requireClassTeacher', label: 'Require Class Teacher', type: 'select', options: ['Yes', 'No'], defaultValue: 'Yes' },
          {
            key: 'teacherPool',
            label: 'Teaching Staff Directory',
            type: 'textarea',
            placeholder: 'Mrs. Sharma | Mathematics | 9876543210 | sharma@school.edu\nMr. Verma | Science | 9876543211',
            help: 'One staff per line: Name | Department | Phone | Email (phone and email optional). Used in the teacher dropdown below.',
          },
        ],
      },
      {
        id: 'sectionCapacity',
        title: 'Section Capacity',
        fields: [
          { key: 'defaultCapacity', label: 'Default Capacity', type: 'number', placeholder: '40', required: true },
        ],
      },
      {
        id: 'sectionRoomMapping',
        title: 'Section Room Mapping',
        fields: [
          { key: 'requireRoomMapping', label: 'Require Room Mapping', type: 'select', options: ['Yes', 'No'] },
        ],
      },
    ],
  },
  {
    key: 'subjectsSetup',
    title: 'Subjects Setup',
    sheetName: '04 Subjects Setup',
    desc: 'Manage subjects for different classes',
    hasRecords: true,
    recordColumns: [
      { key: 'subjectName', label: 'Subject Name' },
      { key: 'subjectCode', label: 'Subject Code' },
      { key: 'subjectType', label: 'Subject Type' },
      { key: 'subjectGroup', label: 'Subject Group' },
      { key: 'isElective', label: 'Elective (Yes/No)' },
    ],
    sampleRecords: [
      { subjectName: 'Mathematics', subjectCode: 'MATH101', subjectType: 'Core', subjectGroup: 'Science', isElective: 'No' },
      { subjectName: 'Physics', subjectCode: 'PHY101', subjectType: 'Core', subjectGroup: 'Science', isElective: 'No' },
      { subjectName: 'Computer Science', subjectCode: 'CS101', subjectType: 'Elective', subjectGroup: 'Optional', isElective: 'Yes' },
    ],
    sections: [
      {
        id: 'subjectMaster',
        title: 'Subject Master',
        fields: [
          { key: 'allowDuplicateNames', label: 'Allow Duplicate Subject Names', type: 'select', options: ['No', 'Yes'] },
        ],
      },
      {
        id: 'subjectCode',
        title: 'Subject Code',
        fields: [
          { key: 'codePrefix', label: 'Code Prefix', type: 'text', placeholder: 'SUB-' },
          { key: 'codeRequired', label: 'Code Required', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'subjectType',
        title: 'Subject Type',
        fields: [
          { key: 'allowedTypes', label: 'Allowed Types', type: 'text', placeholder: 'Core, Elective, Optional' },
        ],
      },
      {
        id: 'subjectGroup',
        title: 'Subject Group',
        fields: [
          { key: 'groups', label: 'Subject Groups', type: 'text', placeholder: 'Languages, Science, Arts' },
        ],
      },
      {
        id: 'electiveSubjects',
        title: 'Elective Subjects',
        fields: [
          { key: 'maxElectivesPerStudent', label: 'Max Electives Per Student', type: 'number', placeholder: '2' },
        ],
      },
    ],
  },
  {
    key: 'departmentsSetup',
    title: 'Departments Setup',
    sheetName: '05 Departments Setup',
    desc: 'Create and manage departments',
    hasRecords: true,
    recordColumns: [
      { key: 'departmentName', label: 'Department Name' },
      { key: 'departmentCode', label: 'Department Code' },
      { key: 'hod', label: 'HOD / Incharge' },
      { key: 'staffMembers', label: 'Staff Members (comma-separated)' },
      { key: 'location', label: 'Location' },
      { key: 'budget', label: 'Budget' },
    ],
    sampleRecords: [
      { departmentName: 'Mathematics', departmentCode: 'DEPT-MATH', hod: 'Dr. Smith', location: 'Block A', budget: '500000' },
      { departmentName: 'Science', departmentCode: 'DEPT-SCI', hod: 'Prof. Johnson', location: 'Block B', budget: '750000' },
    ],
    sections: [
      {
        id: 'departmentList',
        title: 'Department List',
        fields: [
          { key: 'requireCode', label: 'Require Department Code', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'hodIncharge',
        title: 'HOD / Incharge',
        fields: [
          { key: 'requireHod', label: 'Require HOD Assignment', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'departmentStaff',
        title: 'Department Staff',
        fields: [
          { key: 'allowMultiDeptStaff', label: 'Allow Staff In Multiple Departments', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'departmentLocation',
        title: 'Department Location',
        fields: [
          { key: 'trackLocation', label: 'Track Department Location', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'departmentBudget',
        title: 'Department Budget',
        fields: [
          { key: 'currency', label: 'Budget Currency', type: 'text', placeholder: 'INR' },
          { key: 'enableBudget', label: 'Enable Department Budget', type: 'select', options: ['Yes', 'No'] },
        ],
      },
    ],
  },
  {
    key: 'sessionTermSetup',
    title: 'Session & Term Setup',
    sheetName: '06 Session Term Setup',
    desc: 'Manage academic terms and holidays',
    sections: [
      {
        id: 'academicSession',
        title: 'Academic Session',
        fields: [
          { key: 'sessionName', label: 'Session Name', type: 'text', required: true, placeholder: '2025-26' },
          { key: 'startDate', label: 'Session Start Date', type: 'date', required: true },
          { key: 'endDate', label: 'Session End Date', type: 'date', required: true },
          { key: 'isActive', label: 'Mark As Active Session', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'termsSemesters',
        title: 'Terms / Semesters',
        fields: [
          { key: 'termSystem', label: 'Term System', type: 'select', options: ['Terms', 'Semesters', 'Trimesters'] },
          { key: 'terms', label: 'Terms List', type: 'text', placeholder: 'Term 1, Term 2' },
        ],
      },
      {
        id: 'importantDates',
        title: 'Important Dates',
        fields: [
          { key: 'admissionStart', label: 'Admission Start', type: 'date' },
          { key: 'admissionEnd', label: 'Admission End', type: 'date' },
          { key: 'resultDate', label: 'Result Declaration', type: 'date' },
        ],
      },
      {
        id: 'holidays',
        title: 'Holidays',
        fields: [
          {
            key: 'holidayMasterNote',
            label: 'Holiday Master',
            type: 'text',
            placeholder: 'Managed via holiday list below',
            help: 'Use the Holiday List panel (Excel upload). Synced with HR & Payroll calendar.',
          },
          {
            key: 'holidaysList',
            label: 'Holiday List',
            type: 'textarea',
            placeholder: 'Republic Day: 2026-01-26\nSummer Break: 2026-05-01 to 2026-05-31',
            help: 'One holiday per line. Format: Name: YYYY-MM-DD or Name: YYYY-MM-DD to YYYY-MM-DD',
          },
        ],
      },
      {
        id: 'examinationPeriods',
        title: 'Examination Periods',
        fields: [
          {
            key: 'examPeriods',
            label: 'Exam Periods',
            type: 'textarea',
            placeholder: 'Unit Test 1: 2025-07-01 to 2025-07-10\nHalf Yearly: 2025-09-15 to 2025-09-25',
            help: 'One period per line. Format: Name: YYYY-MM-DD to YYYY-MM-DD',
          },
          { key: 'registrationCutoff', label: 'Registration Cutoff', type: 'date' },
          { key: 'marksEntryDeadline', label: 'Marks Entry Deadline', type: 'date' },
        ],
      },
    ],
  },
  {
    key: 'gradeMarksSetup',
    title: 'Grade & Marks Setup',
    sheetName: '07 Grade Marks Setup',
    desc: 'Setup grading and evaluation system',
    sections: [
      {
        id: 'gradingSystem',
        title: 'Grading System',
        fields: [
          { key: 'systemType', label: 'Grading System', type: 'select', options: ['Percentage', 'GPA', 'CGPA', 'Letter Grade'], required: true },
        ],
      },
      {
        id: 'marksConfiguration',
        title: 'Marks Configuration',
        fields: [
          { key: 'maxMarks', label: 'Default Max Marks', type: 'number', placeholder: '100' },
          { key: 'graceMarks', label: 'Default Grace Marks', type: 'number', placeholder: '0' },
          { key: 'weightageEnabled', label: 'Enable Weightage', type: 'select', options: ['Yes', 'No'] },
          {
            key: 'componentWeightages',
            label: 'Component Weightages (JSON)',
            type: 'textarea',
            placeholder: '{"UNIT_1":15,"UNIT_2":15,"UNIT_3":15,"HALF_YEARLY":25,"YEARLY":30}',
            help: 'Must sum to 100 when weightage is enabled. Validated and locked on save.',
          },
        ],
      },
      {
        id: 'passFail',
        title: 'Pass / Fail Criteria',
        fields: [
          { key: 'passMarks', label: 'Pass Marks', type: 'number', placeholder: '33' },
          { key: 'passGrade', label: 'Minimum Pass Grade', type: 'text', placeholder: 'D / 4.0' },
          { key: 'aggregatedPassPercent', label: 'Aggregated Pass %', type: 'number', placeholder: '33' },
          { key: 'minComponentPass', label: 'Min Component Pass %', type: 'number', placeholder: '33' },
        ],
      },
      {
        id: 'gpaCgpa',
        title: 'GPA / CGPA Settings',
        fields: [
          { key: 'scale', label: 'Scale', type: 'select', options: ['4 Point', '10 Point'] },
          { key: 'formulaNotes', label: 'Formula Notes', type: 'textarea' },
          {
            key: 'gradeMatrix',
            label: 'Grade Matrix (JSON, optional)',
            type: 'textarea',
            placeholder: '[{"minPercent":90,"maxPercent":100,"grade":"A+","gpa":10}]',
            help: 'Leave blank to use default scale mapping.',
          },
        ],
      },
      {
        id: 'rankConfiguration',
        title: 'Rank Configuration',
        fields: [
          { key: 'rankMethod', label: 'Rank Method', type: 'select', options: ['Total Marks', 'Percentage', 'CGPA'] },
          { key: 'tieRule', label: 'Tie Rule', type: 'select', options: ['Same Rank', 'Skip Next', 'Break By Subject'] },
          { key: 'rankScope', label: 'Rank Scope', type: 'select', options: ['Class', 'Section', 'Stream'] },
          { key: 'exemptedSubjects', label: 'Exempted Subjects (comma separated)', type: 'text', placeholder: 'Physical Education, Art' },
        ],
      },
    ],
  },
  {
    key: 'feeGroupSetup',
    title: 'Fee Group Setup',
    sheetName: '08 Fee Group Setup',
    desc: 'Define fee structures and policies',
    hasRecords: true,
    recordColumns: [
      { key: 'class', label: 'Class' },
      { key: 'section', label: 'Section' },
      { key: 'frequency', label: 'Frequency' },
      { key: 'refundable', label: 'Refundable?' },
      { key: 'tuitionFee', label: 'Tuition Fee' },
      { key: 'transportFee', label: 'Transport Fee' },
      { key: 'hostelFee', label: 'Hostel Fee' },
      { key: 'librarySecurityDeposit', label: 'Library Security Deposit' },
      { key: 'cautionMoney', label: 'Caution Money' },
      { key: 'computerLabFee', label: 'Computer Lab Fee' },
      { key: 'picnicFieldTrip', label: 'Picnic / Field Trip' },
      { key: 'addOnFee', label: 'Add-on Fee' },
      { key: 'admissionFee', label: 'Admission Fee' },
      { key: 'registrationFee', label: 'Registration Fee' },
      { key: 'examinationFee', label: 'Examination Fee' },
      { key: 'annualCharges', label: 'Annual Charges' },
      { key: 'sportsFee', label: 'Sports Fee' },
      { key: 'lateFine', label: 'Late Fine' },
    ],
    sampleRecords: [
      { class: '1', section: 'A', frequency: 'Monthly', refundable: 'No' },
      { class: '1', section: 'B', frequency: 'Monthly', refundable: 'No' },
      { class: '2', section: 'A', frequency: 'Monthly', refundable: 'No' },
    ],
    sections: [
      {
        id: 'feeGroupMaster',
        title: 'Fee Group Master',
        fields: [
          { key: 'defaultCurrency', label: 'Currency', type: 'text', placeholder: 'INR', required: true },
          {
            key: 'receiptFooter',
            label: 'Receipt Footer Note',
            type: 'textarea',
            placeholder: 'Thank you for your payment. This receipt is valid for admission fee collection.',
          },
        ],
      },
      {
        id: 'feeTypeSetup',
        title: 'Fee Type Setup',
        fields: [
          {
            key: 'defaultFeeTypes',
            label: 'Default Fee Types',
            type: 'multiselect',
            options: [
              'Tuition',
              'Transport',
              'Hostel',
              'Lab',
              'Library',
              'Admission',
              'Examination',
              'Annual',
              'Miscellaneous',
            ],
            help: 'Select fee types to use across fee groups. Stored as a comma-separated list.',
          },
        ],
      },
      {
        id: 'installmentSetup',
        title: 'Installment Setup',
        fields: [
          { key: 'defaultInstallments', label: 'Default Installment Count', type: 'number', placeholder: '4' },
          { key: 'scheduleType', label: 'Schedule Type', type: 'select', options: ['Monthly', 'Quarterly', 'Bi-Annual', 'Annual'] },
        ],
      },
      {
        id: 'concessionDiscount',
        title: 'Concession & Discount',
        fields: [
          { key: 'allowConcession', label: 'Allow Concessions', type: 'select', options: ['Yes', 'No'] },
          { key: 'maxDiscountPercent', label: 'Max Discount %', type: 'number', placeholder: '50' },
          { key: 'approvalLevel', label: 'Approval Level', type: 'select', options: ['Class Teacher', 'Accounts', 'Principal', 'Board'] },
        ],
      },
      {
        id: 'lateFeeConfiguration',
        title: 'Late Fee Configuration',
        fields: [
          { key: 'graceDays', label: 'Grace Days', type: 'number', placeholder: '5' },
          { key: 'lateFeeAmount', label: 'Late Fee Amount / % / daily', type: 'text', placeholder: '50 or 2%' },
        ],
      },
      {
        id: 'feePaymentMethods',
        title: 'Fee Payment Methods',
        fields: [
          {
            key: 'enabledMethods',
            label: 'Enabled Channels',
            type: 'text',
            placeholder: 'Cash, UPI, Card, Cheque, Bank Transfer, Online',
            help: 'Comma-separated list of enabled payment channels.',
          },
        ],
      },
      {
        id: 'refundCancellation',
        title: 'Refund & Cancellation',
        fields: [
          { key: 'requireApproval', label: 'Require Approval', type: 'select', options: ['Yes', 'No'] },
          { key: 'approvalLevels', label: 'Approval Levels', type: 'text', placeholder: 'Accounts, Principal' },
          { key: 'autoCreditLedger', label: 'Auto Credit Ledger', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'paymentReminders',
        title: 'Payment Reminders',
        fields: [
          { key: 'remindersEnabled', label: 'Enable Reminders', type: 'select', options: ['Yes', 'No'] },
          { key: 'channels', label: 'Channels', type: 'text', placeholder: 'Email, SMS, WhatsApp' },
          { key: 'daysBeforeDue', label: 'Days Before Due', type: 'text', placeholder: '7,3,1' },
          { key: 'daysAfterDue', label: 'Days After Due', type: 'text', placeholder: '1,7,15' },
          { key: 'cronSchedule', label: 'Cron Schedule', type: 'text', placeholder: '0 9 * * *' },
        ],
      },
    ],
  },
  {
    key: 'documentSetup',
    title: 'Document Setup',
    sheetName: '09 Document Setup',
    desc: 'Configure document types and templates — student file uploads happen in Admission CRM → Applications',
    sections: [
      {
        id: 'documentCategories',
        title: 'Document Categories',
        fields: [
          { key: 'categories', label: 'Categories', type: 'text', placeholder: 'Identity, Academic, Medical, Legal, Financial' },
          { key: 'privacyDefault', label: 'Default Privacy Level', type: 'select', options: ['INTERNAL', 'RESTRICTED', 'CONFIDENTIAL'] },
        ],
      },
      {
        id: 'documentTypes',
        title: 'Document Types',
        fields: [
          { key: 'types', label: 'Document Types', type: 'textarea', placeholder: 'Aadhaar, Birth Certificate, TC' },
          { key: 'defaultExpiryDays', label: 'Default Expiry (Days)', type: 'number', placeholder: '365' },
        ],
      },
      {
        id: 'documentTemplates',
        title: 'Document Templates',
        description:
          'Reference notes for blank forms (e.g. TC format). Printable template file upload can be added here later; student uploads use Admission CRM → Applications.',
        fields: [
          { key: 'templateNotes', label: 'Template Notes / HTML Layout', type: 'textarea' },
          { key: 'dynamicTokens', label: 'Dynamic Tokens', type: 'text', placeholder: '{{studentName}}, {{className}}, {{admissionNumber}}' },
        ],
      },
      {
        id: 'applicationFormDocuments',
        title: 'Application Form Documents',
        description:
          'Define which document types appear on the Admission CRM application form. This does not upload files — counselors upload PDFs/images per student under Admission CRM → Applications.',
        fields: [],
        dynamicList: {
          storageKey: 'applicationDocuments',
          addLabel: 'Add Document Type',
          itemLabel: 'Document',
          fields: [
            {
              key: 'name',
              label: 'Document Name',
              type: 'text',
              required: true,
              placeholder: 'Transfer Certificate',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Previous school transfer certificate',
            },
            {
              key: 'mandatory',
              label: 'Mandatory',
              type: 'select',
              options: ['Yes', 'No'],
            },
            {
              key: 'acceptedFormats',
              label: 'Accepted Formats',
              type: 'text',
              placeholder: 'PDF, JPG, PNG',
            },
            {
              key: 'active',
              label: 'Show on Application Form',
              type: 'select',
              options: ['Yes', 'No'],
            },
          ],
        },
      },
      {
        id: 'requiredDocuments',
        title: 'Required Documents',
        description:
          'Define required document types for admission, staff, and other processes. Used as fallback when Application Form Documents is empty.',
        fields: [],
        dynamicList: {
          storageKey: 'documents',
          addLabel: 'Add Document Type',
          itemLabel: 'Document',
          fields: [
            {
              key: 'name',
              label: 'Document Name',
              type: 'text',
              required: true,
              placeholder: 'Birth Certificate',
            },
            {
              key: 'requiredFor',
              label: 'Required For',
              type: 'select',
              options: ['Admission', 'Staff', 'Both', 'Other'],
            },
            {
              key: 'mandatory',
              label: 'Mandatory',
              type: 'select',
              options: ['Yes', 'No'],
            },
          ],
        },
      },
      {
        id: 'documentNumbering',
        title: 'Document Numbering',
        fields: [
          { key: 'prefix', label: 'Document Number Prefix', type: 'text', placeholder: 'DOC-' },
          { key: 'nextNumber', label: 'Next Number', type: 'number', placeholder: '1' },
        ],
      },
    ],
  },
  {
    key: 'idCardNumbering',
    title: 'ID Card & Numbering',
    sheetName: '10 ID Card Numbering',
    desc: 'Configure identity cards and auto-numbering',
    sections: [
      {
        id: 'idCardTemplates',
        title: 'ID Card Templates',
        description: 'Select a printable ID card design and download class-wise PDFs.',
        fields: [
          {
            key: 'studentTemplate',
            label: 'Student ID Template',
            type: 'select',
            options: [
              "St. Anthony's College Style",
              'Mount Convent Style',
              'Professional Staff Style',
              'Bright Future Style',
              'Air Force International Style',
              'School Inc Style',
              'Greenwood Primary Style',
            ],
          },
          {
            key: 'staffTemplate',
            label: 'Staff ID Template',
            type: 'select',
            options: [
              "St. Anthony's College Style",
              'Mount Convent Style',
              'Professional Staff Style',
              'Bright Future Style',
              'Air Force International Style',
              'School Inc Style',
              'Greenwood Primary Style',
            ],
          },
        ],
      },
      {
        id: 'rollNumberFormat',
        title: 'Roll Number Format',
        fields: [
          { key: 'rollFormat', label: 'Roll Number Format', type: 'text', required: true, placeholder: 'CLASS-SEC-###' },
          { key: 'sortLogic', label: 'Sorting Logic', type: 'select', options: ['ALPHA_NAME', 'GENDER', 'REG_DATE'] },
        ],
      },
      {
        id: 'admissionNumber',
        title: 'Admission Number',
        fields: [
          { key: 'admissionPrefix', label: 'Admission Prefix', type: 'text', placeholder: 'ADM2025-' },
          { key: 'admissionNext', label: 'Next Admission Number', type: 'number', placeholder: '1' },
        ],
      },
      {
        id: 'employeeCodeFormat',
        title: 'Employee Code Format',
        fields: [
          { key: 'employeePrefix', label: 'Employee Code Prefix', type: 'text', placeholder: 'EMP-' },
          { key: 'formatFormula', label: 'Format Formula', type: 'text', placeholder: 'EMP-{YEAR}-{SEQ}' },
          { key: 'employeeNext', label: 'Next Employee Code', type: 'number', placeholder: '1' },
        ],
      },
      {
        id: 'invoiceNumbering',
        title: 'Invoice Numbering',
        fields: [
          { key: 'invoicePrefix', label: 'Invoice Prefix', type: 'text', placeholder: 'INV-' },
          { key: 'invoiceNext', label: 'Next Invoice Number', type: 'number', placeholder: '1' },
          { key: 'financialYearReset', label: 'Reset Each Financial Year', type: 'select', options: ['Yes', 'No'] },
        ],
      },
    ],
  },
  {
    key: 'calendarSetup',
    title: 'Calendar Setup',
    sheetName: '11 Calendar Setup',
    desc: 'Manage institution events and calendars',
    sections: [
      {
        id: 'comprehensiveCalendar',
        title: 'Comprehensive View',
        description:
          'Unified calendar syncing Academic, Events, Exams, Holidays, and Custom — publish to Staff, Student, and Parent apps.',
        fields: [
          {
            key: 'enabledLayers',
            label: 'Enabled Layers',
            type: 'text',
            placeholder: 'ACADEMIC,EVENTS,EXAMS,HOLIDAYS,CUSTOM',
            help: 'Comma-separated layers shown in the master calendar view.',
          },
        ],
      },
      {
        id: 'academicCalendar',
        title: 'Academic Calendar',
        description: 'Session milestones, PTMs, and academic milestones.',
        fields: [
          {
            key: 'academicEvents',
            label: 'Academic Calendar Entries',
            type: 'textarea',
            placeholder: 'Term 1 Start: 2025-04-01\nPTM: 2025-08-15',
            help: 'One entry per line. Format: Title: YYYY-MM-DD or Title: YYYY-MM-DD to YYYY-MM-DD',
          },
        ],
      },
      {
        id: 'eventCalendar',
        title: 'Event Calendar',
        description: 'School events, exhibitions, and celebrations.',
        fields: [
          {
            key: 'eventEntries',
            label: 'Event Calendar Entries',
            type: 'textarea',
            placeholder: 'Annual Day: 2025-12-10 | ALL\nSports Meet: 2025-11-20 to 2025-11-22 | STUDENTS',
            help: 'Optional audience after | (ALL, STAFF, STUDENTS).',
          },
        ],
      },
      {
        id: 'examCalendar',
        title: 'Exam Calendar',
        description: 'Unit tests, mid-terms, and board exams.',
        fields: [
          {
            key: 'examCalendarNote',
            label: 'Exam Schedule Source',
            type: 'text',
            placeholder: 'Synced from Session & Term → Examination Periods',
            help: 'Exam periods are synced from Session & Term Setup. Examination module provides detailed timetables.',
          },
        ],
      },
      {
        id: 'holidayCalendar',
        title: 'Holiday Calendar',
        description: 'Institution holidays shared with HR & Payroll.',
        fields: [
          {
            key: 'holidayExportNote',
            label: 'Export',
            type: 'text',
            placeholder: 'Export iCal from Department & Operations hub',
            help: 'Holiday calendar export is available in Settings → Department & Operations Management.',
          },
        ],
      },
      {
        id: 'customEvents',
        title: 'Custom Events',
        description: 'Custom institution events and reminders.',
        fields: [
          {
            key: 'customEventEntries',
            label: 'Custom Event Entries',
            type: 'textarea',
            placeholder: 'Dept Workshop: 2025-10-05 | DEPT-MATH | staff1@school.edu, staff2@school.edu',
            help: 'Format: Title: date [| deptCode | invitees]',
          },
        ],
      },
    ],
  },
  {
    key: 'customFieldsSetup',
    title: 'Custom Fields Setup',
    sheetName: '12 Custom Fields Setup',
    desc: 'Create custom fields for data management',
    sections: [
      {
        id: 'studentCustomFields',
        title: 'Student Custom Fields',
        fields: [
          { key: 'studentFields', label: 'Student Fields (label:type)', type: 'textarea', placeholder: 'Blood Group:select, Aadhaar:text' },
        ],
      },
      {
        id: 'employeeCustomFields',
        title: 'Employee Custom Fields',
        fields: [
          { key: 'employeeFields', label: 'Employee Fields', type: 'textarea' },
        ],
      },
      {
        id: 'parentCustomFields',
        title: 'Parent Custom Fields',
        fields: [
          { key: 'parentFields', label: 'Parent Fields', type: 'textarea' },
        ],
      },
      {
        id: 'admissionCustomFields',
        title: 'Admission Custom Fields',
        fields: [
          { key: 'admissionFields', label: 'Admission Fields', type: 'textarea' },
        ],
      },
      {
        id: 'customFieldTypes',
        title: 'Custom Field Types',
        fields: [
          { key: 'allowedTypes', label: 'Allowed Field Types', type: 'text', placeholder: 'text, number, date, dropdown, checkbox, file' },
        ],
      },
    ],
  },
  {
    key: 'notificationSetup',
    title: 'Notification Setup',
    sheetName: '13 Notification Setup',
    desc: 'Configure automated alerts and messaging',
    sections: [
      {
        id: 'emailNotifications',
        title: 'Email Notifications',
        fields: [
          { key: 'emailEnabled', label: 'Enable Email Notifications', type: 'select', options: ['Yes', 'No'] },
          {
            key: 'emailEvents',
            label: 'Trigger Events',
            type: 'eventMultiselect',
            options: [...NOTIFICATION_TRIGGER_EVENTS],
            help: 'Select one or more system events that send email notifications to customers.',
          },
        ],
      },
      {
        id: 'smsNotifications',
        title: 'SMS Notifications',
        fields: [
          { key: 'smsEnabled', label: 'Enable SMS Notifications', type: 'select', options: ['Yes', 'No'] },
          {
            key: 'smsEvents',
            label: 'Trigger Events',
            type: 'eventMultiselect',
            options: [...NOTIFICATION_TRIGGER_EVENTS],
            help: 'Select one or more system events that send SMS notifications to customers.',
          },
        ],
      },
      {
        id: 'pushNotifications',
        title: 'Push Notifications',
        fields: [
          { key: 'pushEnabled', label: 'Enable Push Notifications', type: 'select', options: ['Yes', 'No'] },
          {
            key: 'pushEvents',
            label: 'Trigger Events',
            type: 'eventMultiselect',
            options: [...NOTIFICATION_TRIGGER_EVENTS],
            help: 'Select one or more system events that send push notifications to customers.',
          },
        ],
      },
      {
        id: 'notificationTemplates',
        title: 'Notification Templates',
        description:
          'Create and manage message templates for WhatsApp, SMS, Email, Push, and Voice. Each template can be linked to one or more trigger events.',
        fields: [],
        dynamicList: {
          storageKey: 'templates',
          addLabel: 'Add Template',
          itemLabel: 'Template',
          fields: [
            {
              key: 'templateName',
              label: 'Template Name',
              type: 'text',
              required: true,
              placeholder: 'Fee Due Reminder',
            },
            {
              key: 'medium',
              label: 'Medium',
              type: 'select',
              required: true,
              options: [...NOTIFICATION_MEDIUMS],
              defaultValue: 'Email',
            },
            {
              key: 'triggerEvents',
              label: 'Trigger Events',
              type: 'eventMultiselect',
              options: [...NOTIFICATION_TRIGGER_EVENTS],
              help: 'Send this template when any of these events occur.',
            },
            {
              key: 'subject',
              label: 'Subject / Title',
              type: 'text',
              placeholder: 'Fee reminder for {{studentName}}',
              help: 'Used for Email and Push notifications.',
            },
            {
              key: 'messageBody',
              label: 'Message Body',
              type: 'textarea',
              placeholder:
                'Dear {{parentName}}, this is a reminder that fee of ₹{{amount}} is due on {{dueDate}}. — {{institutionName}}',
              help: 'Use placeholders like {{studentName}}, {{parentName}}, {{amount}}, {{dueDate}}.',
            },
            {
              key: 'active',
              label: 'Active',
              type: 'select',
              options: ['Yes', 'No'],
              defaultValue: 'Yes',
            },
          ],
        },
      },
      {
        id: 'whatsappNotifications',
        title: 'WhatsApp Notifications',
        fields: [
          { key: 'enabled', label: 'Enable WhatsApp Notifications', type: 'select', options: ['No', 'Yes'] },
          { key: 'metaTemplateCode', label: 'Default Meta Template Code', type: 'text' },
        ],
      },
      {
        id: 'templateCategories',
        title: 'Template Categories',
        fields: [
          { key: 'categories', label: 'Categories (comma separated)', type: 'text', placeholder: 'Billing, Exams, Attendance, Marketing' },
        ],
      },
      {
        id: 'dynamicFields',
        title: 'Dynamic Fields',
        fields: [
          { key: 'fields', label: 'Field mappings', type: 'textarea', placeholder: 'Student_Name:Student.displayName, Balance_Due:FeeInvoice.outstanding' },
        ],
      },
      {
        id: 'templateSettings',
        title: 'Template Settings',
        fields: [
          { key: 'defaultChannel', label: 'Default Channel', type: 'select', options: ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'] },
          { key: 'fallbackChannel', label: 'Fallback Channel', type: 'select', options: ['SMS', 'EMAIL', 'WHATSAPP'] },
          { key: 'retryMaxAttempts', label: 'Retry Max Attempts', type: 'number', placeholder: '3' },
          { key: 'retryBackoffSeconds', label: 'Retry Backoff (seconds)', type: 'number', placeholder: '60' },
          { key: 'throttlePerMinute', label: 'Throttle Per Minute', type: 'number', placeholder: '120' },
        ],
      },
      {
        id: 'notificationPreferences',
        title: 'Notification Preferences',
        fields: [
          {
            key: 'preferenceEvents',
            label: 'Trigger Events',
            type: 'eventMultiselect',
            options: [...NOTIFICATION_TRIGGER_EVENTS],
            help: 'Select default trigger events for all notification channels.',
          },
          {
            key: 'recipientRoles',
            label: 'Default Recipient Roles',
            type: 'multiselect',
            options: [...RECIPIENT_ROLE_OPTIONS],
            defaultValue: DEFAULT_RECIPIENT_ROLES,
            help: 'Parent, Student, and Admin are selected by default.',
          },
          {
            key: 'testRecipient',
            label: 'Test Recipient (Phone / Email)',
            type: 'text',
            placeholder: '+91 9876543210 or parent@email.com',
          },
          {
            key: 'testMedium',
            label: 'Test Medium',
            type: 'select',
            options: [...NOTIFICATION_MEDIUMS],
            defaultValue: 'SMS',
          },
        ],
      },
    ],
  },
  {
    key: 'otherPreferences',
    title: 'Other Preferences',
    sheetName: '14 Other Preferences',
    desc: 'Configure system-wide preferences',
    sections: [
      {
        id: 'languageSettings',
        title: 'Language Settings',
        fields: [
          { key: 'defaultLanguage', label: 'Default Language', type: 'select', options: ['English', 'Hindi', 'Other'], required: true },
        ],
      },
      {
        id: 'currencySettings',
        title: 'Currency Settings',
        fields: [
          { key: 'currency', label: 'Currency', type: 'select', options: ['INR', 'USD', 'EUR', 'GBP'], required: true },
          { key: 'currencySymbol', label: 'Currency Symbol', type: 'text', placeholder: '₹' },
        ],
      },
      {
        id: 'timeZoneSettings',
        title: 'Time Zone Settings',
        fields: [
          { key: 'timeZone', label: 'Time Zone', type: 'text', required: true, placeholder: 'Asia/Kolkata' },
        ],
      },
      {
        id: 'systemPreferences',
        title: 'System Preferences',
        fields: [
          { key: 'dateFormat', label: 'Date Format', type: 'select', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
          { key: 'weekStartsOn', label: 'Week Starts On', type: 'select', options: ['Monday', 'Sunday'] },
        ],
      },
      {
        id: 'displayPreferences',
        title: 'Display Preferences',
        fields: [
          { key: 'density', label: 'UI Density', type: 'select', options: ['Comfortable', 'Compact'] },
        ],
      },
    ],
  },
  {
    key: 'integrationSetup',
    title: 'Integration Setup',
    sheetName: '15 Integration Setup',
    desc: 'Integrate with third-party services',
    sections: [
      {
        id: 'paymentGateway',
        title: 'Payment Gateway',
        fields: [
          { key: 'provider', label: 'Provider', type: 'select', options: ['Razorpay', 'Stripe', 'PayU', 'Other'] },
          { key: 'apiKey', label: 'API Key', type: 'password' },
          { key: 'apiSecret', label: 'API Secret', type: 'password' },
          { key: 'enabled', label: 'Enabled', type: 'select', options: ['No', 'Yes'] },
        ],
      },
      {
        id: 'smsGateway',
        title: 'SMS Gateway',
        fields: [
          { key: 'provider', label: 'Provider', type: 'select', options: ['Twilio', 'Msg91', 'Other'] },
          { key: 'apiKey', label: 'API Key', type: 'password' },
          { key: 'senderId', label: 'Sender ID', type: 'text' },
          { key: 'apiEndpoint', label: 'API Endpoint', type: 'url', placeholder: 'https://api.twilio.com' },
        ],
      },
      {
        id: 'emailGateway',
        title: 'Email Gateway',
        fields: [
          { key: 'provider', label: 'Provider', type: 'select', options: ['SMTP', 'SendGrid', 'Amazon SES', 'Other'] },
          { key: 'host', label: 'SMTP Host / Endpoint', type: 'text' },
          { key: 'apiKey', label: 'API Key / Password', type: 'password' },
          { key: 'fromEmail', label: 'From Email', type: 'email', placeholder: 'noreply@school.edu' },
          { key: 'tlsEnabled', label: 'TLS Enabled', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'whatsappBusiness',
        title: 'WhatsApp Business API',
        fields: [
          { key: 'provider', label: 'Provider', type: 'select', options: ['Meta', 'Gupshup', 'Other'] },
          { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text' },
          { key: 'businessAccountId', label: 'Business Account ID', type: 'text' },
          { key: 'apiKey', label: 'API Token', type: 'password' },
        ],
      },
      {
        id: 'thirdPartyIntegrations',
        title: 'Third Party Integrations',
        fields: [
          { key: 'connectorType', label: 'Integration Type', type: 'select', options: ['LMS', 'Accounting', 'Biometric', 'Other'] },
          { key: 'apiEndpoint', label: 'API Endpoint', type: 'url' },
          { key: 'credentialsRef', label: 'Credentials Vault Reference', type: 'password' },
          { key: 'dataMappings', label: 'Data Endpoint Mappings (JSON)', type: 'textarea' },
        ],
      },
      {
        id: 'webhookSettings',
        title: 'Webhook Settings',
        fields: [
          { key: 'targetUrl', label: 'Target Webhook URL', type: 'url' },
          { key: 'eventSubscriptions', label: 'Event Subscriptions', type: 'text', placeholder: 'fee.paid, student.enrolled, attendance.marked' },
        ],
      },
      {
        id: 'googleWorkspace',
        title: 'Google Workspace',
        fields: [
          { key: 'clientId', label: 'OAuth Client ID', type: 'text' },
          { key: 'clientSecret', label: 'OAuth Client Secret', type: 'password' },
          { key: 'scopes', label: 'OAuth Scopes', type: 'text', placeholder: 'openid,email,profile,classroom' },
          { key: 'directorySync', label: 'Sync Directory', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'microsoft365',
        title: 'Microsoft 365 Integration',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', type: 'text' },
          { key: 'clientId', label: 'App Client ID', type: 'text' },
          { key: 'clientSecret', label: 'App Secret', type: 'password' },
          { key: 'scopes', label: 'OAuth Scopes', type: 'text', placeholder: 'openid,profile,email,offline_access' },
          { key: 'directorySync', label: 'Sync Entra ID Directory', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'apiIntegrations',
        title: 'API Integrations',
        fields: [
          { key: 'webhookUrl', label: 'Webhook URL', type: 'url' },
          { key: 'notes', label: 'Notes', type: 'textarea' },
        ],
      },
      {
        id: 'sso',
        title: 'Single Sign-On (SSO)',
        fields: [
          { key: 'provider', label: 'SSO Provider', type: 'select', options: ['Google', 'Microsoft', 'Okta', 'Disabled'] },
          { key: 'clientId', label: 'Client ID', type: 'text' },
          { key: 'clientSecret', label: 'Client Secret', type: 'password' },
        ],
      },
    ],
  },
  {
    key: 'backupRecovery',
    title: 'Backup & Recovery',
    sheetName: '16 Backup Recovery',
    desc: 'Manage data safety and restoration',
    sections: [
      {
        id: 'autoBackup',
        title: 'Auto Backup Settings',
        fields: [
          { key: 'autoBackup', label: 'Enable Auto Backup', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'backupSchedule',
        title: 'Backup Schedule',
        fields: [
          { key: 'frequency', label: 'Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly'] },
          { key: 'time', label: 'Preferred Time', type: 'text', placeholder: '02:00 AM' },
        ],
      },
      {
        id: 'restoreData',
        title: 'Restore Data',
        fields: [
          { key: 'allowSelfRestore', label: 'Allow Admin Self Restore', type: 'select', options: ['No', 'Yes'] },
        ],
      },
      {
        id: 'backupHistory',
        title: 'Backup History',
        fields: [
          { key: 'retainDays', label: 'Retain History (Days)', type: 'number', placeholder: '30' },
        ],
      },
      {
        id: 'backupLocation',
        title: 'Backup Location',
        fields: [
          { key: 'location', label: 'Backup Location', type: 'select', options: ['Cloud', 'Local', 'Both'] },
          { key: 'storageProvider', label: 'Storage Provider', type: 'select', options: ['S3', 'Azure Blob', 'Local NAS', 'Hybrid'] },
          { key: 'pathOrBucket', label: 'Path / Bucket URI', type: 'text', placeholder: 's3://schoolerp-backups/prod' },
          { key: 'accessKeyRef', label: 'Credentials Vault Reference', type: 'text', placeholder: 'vault://backup-credentials' },
        ],
      },
    ],
  },
  {
    key: 'securitySettings',
    title: 'Security Settings',
    sheetName: '17 Security Settings',
    desc: 'Define access and security policies',
    sections: [
      {
        id: 'dataEncryption',
        title: 'Data Encryption',
        fields: [
          { key: 'algorithm', label: 'Encryption Algorithm', type: 'select', options: ['AES-256', 'AES-128', 'ChaCha20-Poly1305'] },
          { key: 'vaultProvider', label: 'Secure Vault Provider', type: 'select', options: ['INTERNAL_VAULT', 'AWS KMS', 'Azure Key Vault', 'HashiCorp Vault'] },
          { key: 'piiFields', label: 'PII Fields (comma separated)', type: 'textarea', placeholder: 'student.mobile, student.email, parent.mobile' },
          { key: 'keyRotationDays', label: 'Key Rotation (Days)', type: 'number', placeholder: '90' },
          { key: 'encryptAtRest', label: 'Encrypt at Rest', type: 'select', options: ['Yes', 'No'] },
          { key: 'encryptInTransit', label: 'Encrypt in Transit (TLS)', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'passwordPolicy',
        title: 'Password Policy',
        fields: [
          { key: 'minLength', label: 'Minimum Length', type: 'number', placeholder: '8', required: true },
          { key: 'requireSpecial', label: 'Require Special Character', type: 'select', options: ['Yes', 'No'] },
          { key: 'requireNumber', label: 'Require Number', type: 'select', options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'loginRestrictions',
        title: 'Login Restrictions',
        fields: [
          { key: 'maxAttempts', label: 'Max Failed Attempts', type: 'number', placeholder: '5' },
          { key: 'lockoutMinutes', label: 'Lockout Minutes', type: 'number', placeholder: '15' },
        ],
      },
      {
        id: 'sessionTimeout',
        title: 'Session Timeout',
        fields: [
          { key: 'timeoutMinutes', label: 'Session Timeout (Minutes)', type: 'number', placeholder: '60' },
        ],
      },
      {
        id: 'ipRestrictions',
        title: 'IP Restrictions',
        fields: [
          { key: 'allowlist', label: 'IP Allowlist (comma separated)', type: 'textarea', placeholder: 'Leave blank to allow all' },
        ],
      },
      {
        id: 'twoFactor',
        title: 'Two Factor Authentication',
        fields: [
          { key: 'enabled', label: 'Enable 2FA', type: 'select', options: ['No', 'Yes'] },
          { key: 'method', label: '2FA Method', type: 'select', options: ['Authenticator App', 'SMS', 'Email'] },
        ],
      },
    ],
  },
  {
    key: 'dataImportExport',
    title: 'Data Import / Export',
    sheetName: '18 Data Import Export',
    desc: 'Migrate system data efficiently',
    sections: [
      {
        id: 'importStudents',
        title: 'Import Students',
        fields: [
          { key: 'enabled', label: 'Allow Student Import', type: 'select', options: ['Yes', 'No'] },
          { key: 'requiredColumns', label: 'Required Columns', type: 'textarea', placeholder: 'Name, Class, Section, DOB, Mobile' },
        ],
      },
      {
        id: 'importEmployees',
        title: 'Import Employees',
        fields: [
          { key: 'enabled', label: 'Allow Employee Import', type: 'select', options: ['Yes', 'No'] },
          { key: 'requiredColumns', label: 'Required Columns', type: 'textarea', placeholder: 'employeeCode, fullName, department, mobile, email' },
        ],
      },
      {
        id: 'importParents',
        title: 'Import Parents',
        fields: [
          { key: 'enabled', label: 'Allow Parent Import', type: 'select', options: ['Yes', 'No'] },
          { key: 'requiredColumns', label: 'Required Columns', type: 'textarea', placeholder: 'parentName, mobile, studentAdmissionNumber, relationship' },
        ],
      },
      {
        id: 'importHistory',
        title: 'Import History',
        fields: [
          { key: 'retentionDays', label: 'Log Retention (days)', type: 'number', placeholder: '90' },
        ],
      },
      {
        id: 'exportData',
        title: 'Export Data',
        fields: [
          { key: 'formats', label: 'Export Formats', type: 'text', placeholder: 'xlsx, csv' },
        ],
      },
      {
        id: 'exportHistory',
        title: 'Export History',
        fields: [
          { key: 'retentionDays', label: 'Export Log Retention (days)', type: 'number', placeholder: '180' },
        ],
      },
      {
        id: 'scheduledExports',
        title: 'Scheduled Exports',
        fields: [
          {
            key: 'jobs',
            label: 'Scheduled Export Jobs',
            type: 'textarea',
            placeholder: 'Nightly Ledger: 0 2 * * * | sftp://backup.school.edu/ledger\nWeekly Attendance: 0 6 * * 1 | https://analytics.school.edu/hooks/attendance',
            help: 'Format: Job Name: cron expression | target URI',
          },
        ],
      },
      {
        id: 'dataMapping',
        title: 'Data Mapping',
        fields: [
          { key: 'mappingNotes', label: 'Default Mapping Notes', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'modulesUiSetup',
    title: 'Modules & UI Setup',
    sheetName: '19 Modules UI Setup',
    desc: 'Module activation, workflows, theme, menus and dashboards',
    sections: [
      {
        id: 'moduleActivation',
        title: 'Module Activation',
        fields: [
          { key: 'activeModules', label: 'Active Modules', type: 'textarea', placeholder: 'ADMISSION, STUDENT, ACADEMIC, EXAMINATION, FEE, HR, TRANSPORT, HOSTEL, LIBRARY' },
          { key: 'licenseKey', label: 'License Key', type: 'password' },
        ],
      },
      {
        id: 'moduleConfiguration',
        title: 'Module Configuration',
        fields: [
          { key: 'configNotes', label: 'Module Config Notes', type: 'textarea', placeholder: 'Fee: auto-reminder enabled\nHR: biometric attendance' },
        ],
      },
      {
        id: 'workflowSettings',
        title: 'Workflow Settings',
        fields: [
          {
            key: 'workflows',
            label: 'Approval Workflows',
            type: 'textarea',
            placeholder: 'Leave Approval: 0 | HOD > HR > PRINCIPAL\nPurchase Request: 50000 | HOD > ACCOUNTS > PRINCIPAL',
            help: 'Format: Name: threshold | approver1 > approver2',
          },
        ],
      },
      {
        id: 'featurePermissions',
        title: 'Feature Permissions',
        fields: [
          {
            key: 'permissions',
            label: 'Feature Access Rules',
            type: 'textarea',
            placeholder: 'FEE.REFUND: FULL | ADMIN\nEXAM.MARKS_OVERRIDE: READ | TEACHER',
            help: 'Format: MODULE.FEATURE: accessLevel | roleCode',
          },
        ],
      },
      {
        id: 'moduleOrder',
        title: 'Module Order',
        fields: [
          { key: 'order', label: 'Sidebar Module Order', type: 'textarea', placeholder: 'ADMISSION, STUDENT, ACADEMIC, EXAMINATION, FEE, HR' },
        ],
      },
      {
        id: 'themeSettings',
        title: 'Theme Settings',
        fields: [
          { key: 'brandName', label: 'Brand Name', type: 'text' },
          { key: 'logoUrl', label: 'Logo URL', type: 'url' },
          { key: 'fontFamily', label: 'Font Family', type: 'text', placeholder: 'Inter, sans-serif' },
        ],
      },
      {
        id: 'colorSchemes',
        title: 'Color Schemes',
        fields: [
          { key: 'primaryColor', label: 'Primary Color', type: 'text', placeholder: '#2563eb' },
          { key: 'secondaryColor', label: 'Secondary Color', type: 'text', placeholder: '#64748b' },
          { key: 'accentColor', label: 'Accent Color', type: 'text', placeholder: '#0d9488' },
        ],
      },
      {
        id: 'customCss',
        title: 'Custom CSS',
        fields: [
          { key: 'cssContent', label: 'Custom CSS Snippets', type: 'textarea', placeholder: '.sidebar { border-radius: 8px; }' },
        ],
      },
      {
        id: 'menuManagement',
        title: 'Menu Management',
        fields: [
          {
            key: 'menuTree',
            label: 'Navigation Tree',
            type: 'textarea',
            placeholder: 'Dashboard\nStudent Management\nFee Collection',
            help: 'One menu label per line',
          },
        ],
      },
      {
        id: 'dashboardWidgets',
        title: 'Dashboard Widgets',
        fields: [
          {
            key: 'widgets',
            label: 'Default Widgets',
            type: 'textarea',
            placeholder: 'Student Count\nFee Collection\nAttendance Today\nQuick Actions',
            help: 'One widget per line — applied to ADMIN, TEACHER, STAFF roles',
          },
        ],
      },
    ],
  },
];

export function getTileByKey(key: string) {
  return INSTITUTION_SETUP_TILES.find((t) => t.key === key);
}

export function getTileByTitle(title: string) {
  return INSTITUTION_SETUP_TILES.find((t) => t.title === title);
}

export function emptyTileData(tile: SetupTileSchema): Record<string, unknown> {
  const sections: Record<string, Record<string, string>> = {};
  for (const section of tile.sections) {
    const values: Record<string, string> = {};
    for (const field of section.fields) {
      values[field.key] = field.defaultValue ?? '';
    }
    if (section.dynamicList) {
      values[section.dynamicList.storageKey] = '[]';
    }
    sections[section.title] = values;
  }
  return {
    sections,
    ...(tile.hasRecords
      ? { records: [], recordColumns: tile.recordColumns ? [...tile.recordColumns] : [] }
      : {}),
  };
}
