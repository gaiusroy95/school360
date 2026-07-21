export type IdCardStudent = {
  id: string;
  name: string;
  className: string;
  section: string;
  rollNo: string;
  dob: string;
  fatherName: string;
  phone: string;
  address: string;
  aadhaar?: string;
  photoUrl?: string;
  course?: string;
  batch?: string;
  bloodGroup?: string;
  designation?: string;
};

export type IdCardSchool = {
  name: string;
  address: string;
  phone: string;
  session: string;
  logoUrl?: string;
  website?: string;
};

export type IdCardTemplateId =
  | 'saiJyoti'
  | 'adarsh'
  | 'oxford'
  | 'stAnthony'
  | 'emeraldCrest'
  | 'modernMinimal'
  | 'royalMaroon';

export const ID_CARD_TEMPLATES: {
  id: IdCardTemplateId;
  name: string;
  description: string;
}[] = [
  {
    id: 'stAnthony',
    name: "St. Anthony's College Style",
    description: 'Yellow header, navy curves, photo frame and contact footer',
  },
  {
    id: 'saiJyoti',
    name: 'Sai Jyoti Style',
    description: 'Red geometric frame with photo and icon details',
  },
  {
    id: 'adarsh',
    name: 'Adarsh Model Style',
    description: 'Blue wave layout with class ribbon and principal sign',
  },
  {
    id: 'oxford',
    name: 'Classic University Style',
    description: 'Teal header, clean fields, dual signature footer',
  },
  {
    id: 'emeraldCrest',
    name: 'Emerald Crest Style',
    description: 'Green crest header with gold border and formal fields',
  },
  {
    id: 'modernMinimal',
    name: 'Modern Minimal Style',
    description: 'Black and white layout with bold typography',
  },
  {
    id: 'royalMaroon',
    name: 'Royal Maroon Style',
    description: 'Maroon and cream design with ribbon class badge',
  },
];

/** Demo students until Student Management API is wired. */
export const DEMO_ID_CARD_STUDENTS: IdCardStudent[] = [
  {
    id: '1',
    name: 'Aayushi Vaishnav',
    className: 'Class 1',
    section: 'A',
    rollNo: '101',
    dob: '12-03-2016',
    fatherName: 'Ramesh Vaishnav',
    phone: '9782379251',
    address: 'Saran Nagar, Jodhpur',
    aadhaar: '1234-5678-9012',
    course: 'Primary',
    batch: '2025-26',
    bloodGroup: 'B+',
    designation: 'Student',
  },
  {
    id: '2',
    name: 'Arjun Sharma',
    className: 'Class 1',
    section: 'A',
    rollNo: '102',
    dob: '08-07-2016',
    fatherName: 'Vikram Sharma',
    phone: '9876543210',
    address: 'Banar Road, Jodhpur',
    aadhaar: '2345-6789-0123',
    course: 'Primary',
    batch: '2025-26',
    bloodGroup: 'B+',
    designation: 'Student',
  },
  {
    id: '3',
    name: 'Prachi Mahto',
    className: 'Class 10',
    section: 'A',
    rollNo: '251457',
    dob: '06-06-2009',
    fatherName: 'Dinesh Kumar Mahto',
    phone: '1234567890',
    address: 'Gopaldih, Beko',
    aadhaar: '1234567890',
    course: 'Secondary',
    batch: '2025-26',
    bloodGroup: 'A+',
    designation: 'Student',
  },
  {
    id: '4',
    name: 'Rohan Singh',
    className: 'Class 10',
    section: 'B',
    rollNo: '251458',
    dob: '15-01-2009',
    fatherName: 'Suresh Singh',
    phone: '9988776655',
    address: 'Giridih, Jharkhand',
    aadhaar: '9876543210',
    course: 'Secondary',
    batch: '2025-26',
    bloodGroup: 'O+',
    designation: 'Student',
  },
  {
    id: '5',
    name: 'Janu D.H',
    className: 'Class 5',
    section: 'A',
    rollNo: '0002546',
    dob: '21-11-2014',
    fatherName: 'Deepak H',
    phone: '9123456780',
    address: 'City Campus',
    aadhaar: '1122334455',
    course: 'MBBS Prep',
    batch: 'MHD-21',
    bloodGroup: 'AB+',
    designation: 'Student',
  },
  {
    id: '6',
    name: 'Meera Joshi',
    className: 'Class 5',
    section: 'A',
    rollNo: '0002547',
    dob: '03-05-2014',
    fatherName: 'Anil Joshi',
    phone: '9012345678',
    address: 'Lake View Colony',
    aadhaar: '5566778899',
    course: 'Primary',
    batch: '2025-26',
    bloodGroup: 'B+',
    designation: 'Student',
  },
];

export function uniqueClasses(students: IdCardStudent[]): string[] {
  return [...new Set(students.map((s) => s.className))].sort();
}
