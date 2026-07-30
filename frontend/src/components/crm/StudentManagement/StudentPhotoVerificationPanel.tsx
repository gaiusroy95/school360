import {
  getFatherPhotoUrl,
  getMotherPhotoUrl,
  getStudentPhotoUrl,
  resolvePhotoDisplay,
} from '../../../lib/studentPhotoUtils';
import type { Student } from '../../../lib/studentServices';

type PhotoTileProps = {
  label: string;
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
};

function PhotoTile({ label, src, name, size = 'md' }: PhotoTileProps) {
  const sizeClass =
    size === 'lg'
      ? 'w-[88px] h-[108px]'
      : size === 'sm'
        ? 'w-14 h-[4.25rem]'
        : 'w-20 h-24';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`${sizeClass} rounded-lg border-2 border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center`}
      >
        <img
          src={resolvePhotoDisplay(src, name)}
          alt={label}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">{label}</span>
    </div>
  );
}

export function StudentPhotoVerificationPanel({
  student,
  title = 'Identity Verification Photos',
  subtitle = 'Student and parent photos for gate pass and security verification.',
  size = 'md',
  className = '',
}: {
  student: Student;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const studentPhoto = getStudentPhotoUrl(student);
  const fatherPhoto = getFatherPhotoUrl(student);
  const motherPhoto = getMotherPhotoUrl(student);

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        <PhotoTile label="Student" src={studentPhoto} name={student.fullName} size={size} />
        <PhotoTile
          label="Father"
          src={fatherPhoto}
          name={student.fatherName || 'Father'}
          size={size}
        />
        <PhotoTile
          label="Mother"
          src={motherPhoto}
          name={student.motherName || 'Mother'}
          size={size}
        />
      </div>
    </div>
  );
}

export function GatePassPhotoStrip({
  studentPhoto,
  fatherPhoto,
  motherPhoto,
  studentName,
  fatherName,
  motherName,
}: {
  studentPhoto?: string;
  fatherPhoto?: string;
  motherPhoto?: string;
  studentName: string;
  fatherName?: string;
  motherName?: string;
}) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-800 mb-2">
        Verify identity before issuing pass
      </p>
      <div className="flex justify-center gap-4">
        <PhotoTile label="Student" src={studentPhoto} name={studentName} size="sm" />
        <PhotoTile label="Father" src={fatherPhoto} name={fatherName || 'Father'} size="sm" />
        <PhotoTile label="Mother" src={motherPhoto} name={motherName || 'Mother'} size="sm" />
      </div>
    </div>
  );
}
