import { api } from './api';

export type QuestionType = 'Multiple Choice' | 'True/False' | 'Short Answer';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type TestQuestionInput = {
  type: QuestionType | string;
  difficulty: Difficulty | string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
};

export type AdmissionTestSummary = {
  id: string;
  title: string;
  status: string;
  statusKey: string;
  source: string;
  durationMinutes: number;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  sourceFilesMeta: unknown;
  createdBy: string;
  questionCount: number;
  publishedAt?: string;
  passMarksPercent?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicationCredential = {
  id: string;
  tokenNumber: string;
  pin: string;
  applicationId: string;
  studentName: string;
  email: string;
  mobile: string;
  submitted: boolean;
  score: number | null;
  passed?: boolean | null;
};

export type TestPublication = {
  id: string;
  destination: string;
  destinationKey: string;
  scheduledAt: string;
  durationMinutes: number;
  visibleOn: string;
  visibleOnKey: string;
  publishedAt: string;
  publishedBy: string;
  credentials: PublicationCredential[];
};

export type PublishTestInput = {
  destination?: string;
  scheduledAt: string;
  durationMinutes: number;
  visibleOn: 'Website' | 'Mobile App' | 'Website & Mobile App';
  applicationIds: string[];
};

export type AdmissionTest = AdmissionTestSummary & {
  questions?: TestQuestion[];
};

export type TestQuestion = TestQuestionInput & {
  id?: string;
  sortOrder?: number;
  typeKey?: string;
  difficultyKey?: string;
};

export type AdmissionTestMeta = {
  questionTypes: QuestionType[];
  difficulties: Difficulty[];
  statuses: string[];
};

export type TestSource = 'PDF' | 'OCR' | 'SYLLABUS' | 'MANUAL';

export type PdfFileUpload = {
  fileName: string;
  mimeType: string;
  fileData: string;
};

export type OcrPreviewFile = {
  fileName: string;
  mimeType: string;
  dataUrl: string;
};

export async function fetchAdmissionTestMeta() {
  return api<AdmissionTestMeta>('/api/admission-tests/meta');
}

export type AdmissionTestSettings = {
  passMarksPercent: number;
  updatedAt: string;
};

export async function fetchAdmissionTestSettings() {
  return api<{ settings: AdmissionTestSettings }>('/api/admission-tests/settings');
}

export async function updateAdmissionTestSettings(passMarksPercent: number) {
  return api<{ settings: AdmissionTestSettings }>('/api/admission-tests/settings', {
    method: 'PATCH',
    body: JSON.stringify({ passMarksPercent }),
  });
}

export async function fetchAdmissionTests() {
  return api<{ tests: AdmissionTestSummary[] }>('/api/admission-tests');
}

export async function fetchAdmissionTest(id: string) {
  return api<{ test: AdmissionTest }>(`/api/admission-tests/${id}`);
}

export async function generateQuestionsFromPdf(payload: {
  title?: string;
  files: PdfFileUpload[];
  numQuestions: number;
  questionType: QuestionType;
  difficulty: Difficulty;
}) {
  return api<{
    suggestedTitle: string;
    fileMeta: { fileName: string; pages: number; charCount: number }[];
    questions: TestQuestionInput[];
  }>('/api/admission-tests/generate-from-pdf', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function scanTestWithOcr(payload: {
  title?: string;
  files: PdfFileUpload[];
  questionType?: QuestionType;
  difficulty?: Difficulty;
}) {
  return api<{
    suggestedTitle: string;
    rawOcrText: string;
    previewFiles: OcrPreviewFile[];
    fileMeta: { fileName: string; mimeType: string; kind: 'image' | 'pdf' }[];
    questions: TestQuestionInput[];
  }>('/api/admission-tests/scan-ocr', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createAdmissionTest(payload: {
  title: string;
  durationMinutes?: number;
  numQuestions?: number;
  questionType?: QuestionType;
  difficulty?: Difficulty;
  source?: TestSource;
  sourceFilesMeta?: unknown[];
  passMarksPercent?: number | null;
  questions: TestQuestionInput[];
}) {
  return api<{ test: AdmissionTest }>('/api/admission-tests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdmissionTest(
  id: string,
  payload: {
    title?: string;
    durationMinutes?: number;
    numQuestions?: number;
    questionType?: QuestionType;
    difficulty?: Difficulty;
    passMarksPercent?: number | null;
    questions?: TestQuestionInput[];
  },
) {
  return api<{ test: AdmissionTest }>(`/api/admission-tests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdmissionTest(id: string) {
  return api<{ ok: boolean }>(`/api/admission-tests/${id}`, { method: 'DELETE' });
}

export async function fetchTestPublication(testId: string) {
  return api<{ publication: TestPublication | null }>(`/api/admission-tests/${testId}/publication`);
}

export async function publishAdmissionTest(testId: string, payload: PublishTestInput) {
  return api<{
    publication: TestPublication;
    portalUrl: string;
    message: string;
  }>(`/api/admission-tests/${testId}/publish`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      destination: 'Entrance Exam Portal',
    }),
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
