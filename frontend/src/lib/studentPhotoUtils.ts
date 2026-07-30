import type { Student } from './studentServices';

export function isValidPhotoSrc(src?: string | null): boolean {
  if (!src || src === '[attached]') return false;
  return src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/');
}

export function getAdmissionFormPhotos(student: Student): {
  studentPhoto: string;
  fatherPhoto: string;
  motherPhoto: string;
} {
  const form = (student.customFields?.admissionForm || {}) as Record<string, string>;
  return {
    studentPhoto: form.studentPhoto || '',
    fatherPhoto: form.fatherPhoto || '',
    motherPhoto: form.motherPhoto || '',
  };
}

export function getStudentPhotoUrl(student: Student): string | undefined {
  if (isValidPhotoSrc(student.photoUrl)) return student.photoUrl;
  const { studentPhoto } = getAdmissionFormPhotos(student);
  return isValidPhotoSrc(studentPhoto) ? studentPhoto : undefined;
}

export function getFatherPhotoUrl(student: Student): string | undefined {
  const { fatherPhoto } = getAdmissionFormPhotos(student);
  return isValidPhotoSrc(fatherPhoto) ? fatherPhoto : undefined;
}

export function getMotherPhotoUrl(student: Student): string | undefined {
  const { motherPhoto } = getAdmissionFormPhotos(student);
  return isValidPhotoSrc(motherPhoto) ? motherPhoto : undefined;
}

export function studentPhotoFallbackLabel(name: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

export function resolvePhotoDisplay(src: string | undefined, fallbackName: string): string {
  return src || studentPhotoFallbackLabel(fallbackName);
}
