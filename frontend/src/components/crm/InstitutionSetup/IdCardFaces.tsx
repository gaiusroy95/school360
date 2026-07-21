import { Cake, Home, Phone, User } from 'lucide-react';
import type { IdCardSchool, IdCardStudent, IdCardTemplateId } from './idCardTypes';

const PHOTO_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#cbd5e1" width="200" height="200"/><circle cx="100" cy="80" r="40" fill="#94a3b8"/><ellipse cx="100" cy="180" rx="60" ry="50" fill="#94a3b8"/></svg>`,
  );

function Photo({ src, className }: { src?: string; className?: string }) {
  return <img src={src || PHOTO_PLACEHOLDER} alt="" className={className} crossOrigin="anonymous" />;
}

/** Template inspired by Sai Jyoti Academy sample */
export function SaiJyotiCard({
  student,
  school,
  scale = 1,
}: {
  student: IdCardStudent;
  school: IdCardSchool;
  scale?: number;
}) {
  return (
    <div
      className="relative overflow-hidden bg-white text-left"
      style={{
        width: 320 * scale,
        height: 500 * scale,
        borderRadius: 16 * scale,
        border: `${2 * scale}px solid #1e3a8a`,
        fontFamily: 'Segoe UI, Arial, sans-serif',
      }}
    >
      <div
        className="absolute"
        style={{
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderLeft: `${110 * scale}px solid transparent`,
          borderTop: `${130 * scale}px solid #dc2626`,
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: 0,
          left: 0,
          width: 0,
          height: 0,
          borderRight: `${110 * scale}px solid transparent`,
          borderBottom: `${130 * scale}px solid #e11d48`,
        }}
      />
      <div className="relative z-10 flex flex-col h-full" style={{ padding: 16 * scale }}>
        <div className="flex gap-2 items-start">
          <div
            className="shrink-0 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200"
            style={{ width: 44 * scale, height: 44 * scale }}
          >
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontSize: 10 * scale }} className="font-bold text-blue-800">
                LOGO
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-blue-800 uppercase leading-tight" style={{ fontSize: 13 * scale }}>
              {school.name}
            </p>
            <p className="text-blue-700 leading-snug mt-0.5" style={{ fontSize: 8 * scale }}>
              {school.address}. MOB - {school.phone}
            </p>
          </div>
          <p className="shrink-0 font-bold text-slate-700" style={{ fontSize: 8 * scale }}>
            SESSION : {school.session}
          </p>
        </div>

        <div className="flex justify-center" style={{ marginTop: 18 * scale }}>
          <div
            className="overflow-hidden bg-slate-100"
            style={{
              width: 140 * scale,
              height: 160 * scale,
              borderRadius: 10 * scale,
              border: `${2 * scale}px solid #b45309`,
            }}
          >
            <Photo src={student.photoUrl} className="w-full h-full object-cover" />
          </div>
        </div>

        <p
          className="text-center font-black uppercase tracking-wide"
          style={{ marginTop: 12 * scale, fontSize: 15 * scale, color: '#c2410c' }}
        >
          {student.name}
        </p>

        <div className="mt-auto space-y-2" style={{ paddingBottom: 8 * scale, maxWidth: '70%' }}>
          {[
            { Icon: User, text: `${student.className}-${student.section} · Roll ${student.rollNo}` },
            { Icon: Cake, text: student.dob },
            { Icon: Phone, text: student.phone },
            { Icon: Home, text: student.address },
          ].map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-slate-600">
              <Icon size={14 * scale} className="shrink-0" strokeWidth={1.75} />
              <span style={{ fontSize: 10 * scale }} className="leading-tight">
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Template inspired by Adarsh Model High School sample */
export function AdarshCard({
  student,
  school,
  scale = 1,
}: {
  student: IdCardStudent;
  school: IdCardSchool;
  scale?: number;
}) {
  const nameParts = school.name.split(/\s+/);
  const line1 = nameParts.slice(0, Math.min(3, nameParts.length)).join(' ');
  const line2 = nameParts.slice(3).join(' ') || 'HIGH SCHOOL';

  return (
    <div
      className="relative overflow-hidden bg-white text-left"
      style={{
        width: 320 * scale,
        height: 500 * scale,
        borderRadius: 16 * scale,
        fontFamily: 'Segoe UI, Arial, sans-serif',
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '62%',
          background: 'linear-gradient(160deg, #1d4ed8 0%, #1e40af 55%, #172554 100%)',
          borderTopLeftRadius: `${80 * scale}px ${40 * scale}px`,
          clipPath: 'ellipse(95% 100% at 30% 100%)',
        }}
      />
      <div className="relative z-10 flex flex-col h-full" style={{ padding: 16 * scale }}>
        <div className="flex justify-between items-start">
          <div>
            <p className="font-black uppercase leading-none" style={{ fontSize: 18 * scale, color: '#db2777' }}>
              {line1}
            </p>
            <p className="font-black uppercase leading-tight" style={{ fontSize: 16 * scale, color: '#1d4ed8' }}>
              {line2}
            </p>
            <div
              className="inline-block mt-2 text-white font-semibold"
              style={{
                background: '#2563eb',
                padding: `${4 * scale}px ${12 * scale}px`,
                borderRadius: `0 ${12 * scale}px ${12 * scale}px 0`,
                fontSize: 9 * scale,
              }}
            >
              {school.address}
            </div>
          </div>
          <div
            className="rounded-full bg-white border-2 border-pink-300 flex items-center justify-center overflow-hidden shrink-0"
            style={{ width: 56 * scale, height: 56 * scale }}
          >
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontSize: 9 * scale }} className="font-bold text-pink-600">
                LOGO
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-center" style={{ marginTop: 20 * scale }}>
          <div
            className="overflow-hidden"
            style={{
              width: 130 * scale,
              height: 130 * scale,
              borderRadius: 12 * scale,
              border: `${3 * scale}px solid white`,
              background: '#f9a8d4',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <Photo src={student.photoUrl} className="w-full h-full object-cover" />
          </div>
        </div>

        <p
          className="text-center font-black uppercase text-white tracking-wide"
          style={{ marginTop: 14 * scale, fontSize: 16 * scale }}
        >
          {student.name}
        </p>

        <div className="mt-3 space-y-1.5 text-white" style={{ paddingLeft: 8 * scale }}>
          {[
            ['Father Name', student.fatherName],
            ['Aadhaar', student.aadhaar || '—'],
            ['Roll No.', student.rollNo],
            ['D.O.B.', student.dob],
            ['Address', student.address],
          ].map(([label, value]) => (
            <p key={label} style={{ fontSize: 10 * scale }}>
              <span style={{ color: '#fde047' }}>{label} - </span>
              {value}
            </p>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between" style={{ paddingBottom: 4 * scale }}>
          <div
            className="inline-flex items-center gap-1.5 bg-white rounded-full"
            style={{ padding: `${4 * scale}px ${10 * scale}px` }}
          >
            <Phone size={12 * scale} className="text-pink-500" />
            <span className="font-bold text-blue-700" style={{ fontSize: 10 * scale }}>
              {student.phone}
            </span>
          </div>
          <div className="text-center">
            <p className="italic text-emerald-600 font-semibold" style={{ fontSize: 12 * scale }}>
              Signature
            </p>
            <p style={{ fontSize: 8 * scale }} className="text-slate-700">
              Principal
            </p>
          </div>
        </div>

        <p
          className="absolute font-black uppercase"
          style={{
            right: 6 * scale,
            top: '42%',
            transform: 'rotate(-90deg)',
            transformOrigin: 'right center',
            color: '#db2777',
            fontSize: 14 * scale,
            whiteSpace: 'nowrap',
          }}
        >
          Class - {student.className.replace(/^Class\s*/i, '')}
          {student.section ? `-${student.section}` : ''}
        </p>
      </div>
    </div>
  );
}

/** Template inspired by classic university / Oxford-style sample */
export function OxfordCard({
  student,
  school,
  scale = 1,
}: {
  student: IdCardStudent;
  school: IdCardSchool;
  scale?: number;
}) {
  return (
    <div
      className="relative overflow-hidden text-left"
      style={{
        width: 320 * scale,
        height: 500 * scale,
        borderRadius: 16 * scale,
        background: '#e8eef5',
        fontFamily: 'Segoe UI, Arial, sans-serif',
      }}
    >
      <div
        className="relative text-center text-white font-black uppercase"
        style={{
          background: '#0f766e',
          padding: `${22 * scale}px ${12 * scale}px ${36 * scale}px`,
        }}
      >
        <p style={{ fontSize: 14 * scale, letterSpacing: 1 }}>{school.name}</p>
        <svg
          className="absolute left-0 right-0 bottom-0 w-full"
          viewBox="0 0 320 28"
          preserveAspectRatio="none"
          style={{ height: 28 * scale }}
        >
          <path d="M0,28 L0,14 Q80,0 160,14 T320,14 L320,28 Z" fill="#e8eef5" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center" style={{ padding: `0 ${20 * scale}px` }}>
        <p className="font-bold tracking-widest text-slate-900" style={{ fontSize: 11 * scale, marginTop: 4 * scale }}>
          STUDENT ID CARD
        </p>

        <div
          className="overflow-hidden bg-slate-200 mt-3"
          style={{
            width: 120 * scale,
            height: 120 * scale,
            borderRadius: 8 * scale,
            border: `${2 * scale}px solid #94a3b8`,
          }}
        >
          <Photo src={student.photoUrl} className="w-full h-full object-cover" />
        </div>

        <div className="w-full mt-5 space-y-2" style={{ maxWidth: 220 * scale }}>
          {[
            ['NAME', student.name],
            ['ID NO', student.rollNo],
            ['COURSE', student.course || student.className],
            ['BATCH', student.batch || school.session],
          ].map(([label, value]) => (
            <p key={label} className="text-slate-900 font-semibold uppercase" style={{ fontSize: 11 * scale }}>
              {label} : <span className="font-normal normal-case">{value}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <div
          className="flex justify-between text-white"
          style={{
            background: '#1d4ed8',
            padding: `${18 * scale}px ${16 * scale}px ${14 * scale}px`,
            borderTop: `${3 * scale}px solid #0f766e`,
          }}
        >
          <div className="text-center flex-1">
            <div className="border-t border-white/80 mx-auto" style={{ width: 70 * scale, marginBottom: 4 * scale }} />
            <p className="italic" style={{ fontSize: 8 * scale }}>
              Authorized signature
            </p>
          </div>
          <div className="text-center flex-1">
            <div className="border-t border-white/80 mx-auto" style={{ width: 70 * scale, marginBottom: 4 * scale }} />
            <p className="italic" style={{ fontSize: 8 * scale }}>
              Holder signature
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DotGrid({
  cols,
  rows,
  color,
  dotSize,
  gap,
}: {
  cols: number;
  rows: number;
  color: string;
  dotSize: number;
  gap: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${dotSize}px)`,
        gap,
      }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: color,
          }}
        />
      ))}
    </div>
  );
}

function ShieldLogo({ scale }: { scale: number }) {
  return (
    <svg
      viewBox="0 0 48 56"
      style={{ width: 36 * scale, height: 42 * scale }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 2L6 10v16c0 12.15 7.68 23.45 18 27 10.32-3.55 18-14.85 18-27V10L24 2z"
        fill="white"
        stroke="white"
        strokeWidth="1"
      />
      <path
        d="M24 14c-2 8-6 12-10 14 2-6 4-10 4-14h6zm0 0c2 8 6 12 10 14-2-6-4-10-4-14h-6z"
        fill="#0B1B47"
      />
      <circle cx="24" cy="22" r="2.5" fill="#0B1B47" />
    </svg>
  );
}

/** Template inspired by St. Anthony's College sample (yellow / navy vertical card) */
export function StAnthonyCard({
  student,
  school,
  scale = 1,
}: {
  student: IdCardStudent;
  school: IdCardSchool;
  scale?: number;
}) {
  const designation =
    student.designation ||
    `${student.className}${student.section ? ` - ${student.section}` : ''}`;
  const blood = student.bloodGroup || 'O+';
  const website = school.website?.replace(/^https?:\/\//, '') || 'www.website.com';

  return (
    <div
      className="relative overflow-hidden bg-white text-left"
      style={{
        width: 320 * scale,
        height: 500 * scale,
        fontFamily: 'Segoe UI, Inter, Arial, sans-serif',
      }}
    >
      {/* Yellow header */}
      <div
        className="relative flex items-center gap-2"
        style={{
          background: '#F5B800',
          padding: `${14 * scale}px ${14 * scale}px ${18 * scale}px`,
          minHeight: 58 * scale,
        }}
      >
        <ShieldLogo scale={scale} />
        <p
          className="font-black uppercase leading-tight flex-1"
          style={{ fontSize: 13 * scale, color: '#0B1B47', letterSpacing: 0.3 }}
        >
          {school.name}
        </p>
      </div>

      {/* Navy swoosh from left */}
      <svg
        className="absolute left-0"
        style={{ top: 48 * scale, width: '100%', height: 90 * scale, zIndex: 1 }}
        viewBox="0 0 320 90"
        preserveAspectRatio="none"
      >
        <path
          d="M0,0 C80,70 140,85 320,55 L320,0 Z"
          fill="#0B1B47"
        />
      </svg>

      {/* White body */}
      <div
        className="relative z-10 flex flex-col"
        style={{ padding: `0 ${20 * scale}px`, marginTop: 8 * scale }}
      >
        <div className="relative flex justify-center" style={{ marginTop: 10 * scale }}>
          <div
            className="absolute"
            style={{ left: -4 * scale, top: 20 * scale, opacity: 0.35 }}
          >
            <DotGrid cols={3} rows={6} color="#94a3b8" dotSize={3 * scale} gap={3 * scale} />
          </div>

          <div
            className="overflow-hidden bg-white shadow-md"
            style={{
              width: 148 * scale,
              height: 168 * scale,
              borderRadius: `${36 * scale}px ${8 * scale}px ${36 * scale}px ${8 * scale}px`,
              border: `${3 * scale}px solid white`,
              boxShadow: '0 4px 16px rgba(11,27,71,0.18)',
            }}
          >
            <Photo src={student.photoUrl} className="w-full h-full object-cover" />
          </div>
        </div>

        <div
          className="space-y-1.5"
          style={{ marginTop: 22 * scale, paddingLeft: 4 * scale, paddingBottom: 8 * scale }}
        >
          {[
            ['Id No', student.rollNo],
            ['Designation', designation],
            ['Phone', student.phone],
            ['Blood', blood],
          ].map(([label, value]) => (
            <p key={label} className="text-slate-800" style={{ fontSize: 11 * scale, lineHeight: 1.35 }}>
              <span className="font-semibold">{label} :</span> {value}
            </p>
          ))}
        </div>
      </div>

      {/* Navy footer with curved top */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 148 * scale }}>
        <svg
          className="absolute top-0 left-0 w-full"
          style={{ height: 28 * scale }}
          viewBox="0 0 320 28"
          preserveAspectRatio="none"
        >
          <path d="M0,28 Q60,4 160,14 T320,20 L320,28 L0,28 Z" fill="#0B1B47" />
        </svg>
        <div
          className="absolute inset-0 text-white flex flex-col"
          style={{
            background: '#0B1B47',
            padding: `${32 * scale}px ${16 * scale}px ${14 * scale}px`,
          }}
        >
          <div className="flex justify-between items-start gap-2 flex-1">
            <div className="flex-1 min-w-0">
              <p className="font-bold uppercase" style={{ fontSize: 11 * scale, marginBottom: 6 * scale }}>
                Contact:
              </p>
              <p className="leading-snug opacity-95" style={{ fontSize: 8.5 * scale }}>
                {school.address}
                {school.phone ? `. Ph: ${school.phone}` : ''}
              </p>
            </div>
            <div style={{ opacity: 0.45, marginTop: 4 * scale }}>
              <DotGrid cols={3} rows={6} color="#ffffff" dotSize={3 * scale} gap={3 * scale} />
            </div>
          </div>
          <p
            className="text-center font-bold uppercase tracking-wide"
            style={{ fontSize: 11 * scale, marginTop: 'auto' }}
          >
            {website}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Emerald crest with gold border */
export function EmeraldCrestCard({
  student,
  school,
  scale = 1,
}: {
  student: IdCardStudent;
  school: IdCardSchool;
  scale?: number;
}) {
  return (
    <div
      className="relative overflow-hidden text-left"
      style={{
        width: 320 * scale,
        height: 500 * scale,
        background: '#f8faf8',
        border: `${3 * scale}px solid #b8860b`,
        borderRadius: 12 * scale,
        fontFamily: 'Georgia, Times New Roman, serif',
      }}
    >
      <div
        className="text-center text-white"
        style={{
          background: 'linear-gradient(180deg, #065f46 0%, #047857 100%)',
          padding: `${16 * scale}px ${12 * scale}px ${28 * scale}px`,
        }}
      >
        <div
          className="mx-auto rounded-full border-2 border-amber-300 flex items-center justify-center overflow-hidden bg-white"
          style={{ width: 48 * scale, height: 48 * scale, marginBottom: 8 * scale }}
        >
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span style={{ fontSize: 8 * scale }} className="font-bold text-emerald-800">
              LOGO
            </span>
          )}
        </div>
        <p className="font-bold uppercase tracking-wide" style={{ fontSize: 12 * scale }}>
          {school.name}
        </p>
        <p style={{ fontSize: 8 * scale, opacity: 0.9, marginTop: 4 * scale }}>
          Session {school.session}
        </p>
      </div>

      <div className="flex flex-col items-center" style={{ padding: `0 ${18 * scale}px`, marginTop: -20 * scale }}>
        <div
          className="overflow-hidden border-4 border-amber-400 bg-slate-200"
          style={{ width: 120 * scale, height: 130 * scale, borderRadius: 8 * scale }}
        >
          <Photo src={student.photoUrl} className="w-full h-full object-cover" />
        </div>
        <p
          className="font-bold text-emerald-900 uppercase text-center"
          style={{ fontSize: 14 * scale, marginTop: 12 * scale }}
        >
          {student.name}
        </p>
        <div className="w-full mt-4 space-y-1.5" style={{ fontSize: 10 * scale }}>
          {[
            ['Roll No', student.rollNo],
            ['Class', `${student.className}-${student.section}`],
            ['Father', student.fatherName],
            ['Phone', student.phone],
            ['Blood', student.bloodGroup || '—'],
          ].map(([label, value]) => (
            <p key={label} className="text-slate-700 border-b border-emerald-100 pb-1">
              <span className="font-semibold text-emerald-800">{label}:</span> {value}
            </p>
          ))}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 text-center text-white"
        style={{
          background: '#065f46',
          padding: `${10 * scale}px`,
          fontSize: 8 * scale,
        }}
      >
        {school.address}
      </div>
    </div>
  );
}

/** Modern minimal black & white */
export function ModernMinimalCard({
  student,
  school,
  scale = 1,
}: {
  student: IdCardStudent;
  school: IdCardSchool;
  scale?: number;
}) {
  return (
    <div
      className="relative overflow-hidden bg-white text-left flex flex-col"
      style={{
        width: 320 * scale,
        height: 500 * scale,
        border: `${1 * scale}px solid #e2e8f0`,
        fontFamily: 'Helvetica Neue, Arial, sans-serif',
      }}
    >
      <div
        className="flex items-center justify-between border-b-4 border-black"
        style={{ padding: `${14 * scale}px ${16 * scale}px` }}
      >
        <div>
          <p className="font-black uppercase tracking-tight" style={{ fontSize: 11 * scale }}>
            {school.name}
          </p>
          <p className="text-slate-500" style={{ fontSize: 7 * scale, marginTop: 2 * scale }}>
            STUDENT IDENTITY CARD
          </p>
        </div>
        <div
          className="bg-black text-white font-bold flex items-center justify-center"
          style={{ width: 40 * scale, height: 40 * scale, fontSize: 8 * scale }}
        >
          ID
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center" style={{ padding: `${20 * scale}px ${16 * scale}px` }}>
        <div
          className="overflow-hidden grayscale"
          style={{
            width: 130 * scale,
            height: 130 * scale,
            border: `${2 * scale}px solid #000`,
          }}
        >
          <Photo src={student.photoUrl} className="w-full h-full object-cover" />
        </div>
        <p className="font-black uppercase mt-4" style={{ fontSize: 16 * scale, letterSpacing: 1 }}>
          {student.name}
        </p>
        <div className="w-full mt-6 grid grid-cols-2 gap-x-4 gap-y-2" style={{ fontSize: 9 * scale }}>
          {[
            ['ID', student.rollNo],
            ['CLASS', `${student.className}-${student.section}`],
            ['DOB', student.dob],
            ['PHONE', student.phone],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-400 font-bold" style={{ fontSize: 7 * scale }}>
                {label}
              </p>
              <p className="font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="bg-black text-white text-center"
        style={{ padding: `${10 * scale}px`, fontSize: 7 * scale }}
      >
        {school.address} · {school.phone}
      </div>
    </div>
  );
}

/** Royal maroon with cream and ribbon */
export function RoyalMaroonCard({
  student,
  school,
  scale = 1,
}: {
  student: IdCardStudent;
  school: IdCardSchool;
  scale?: number;
}) {
  return (
    <div
      className="relative overflow-hidden text-left"
      style={{
        width: 320 * scale,
        height: 500 * scale,
        background: '#faf5f0',
        fontFamily: 'Segoe UI, Arial, sans-serif',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)',
          padding: `${18 * scale}px ${14 * scale}px ${40 * scale}px`,
        }}
      >
        <p className="text-amber-200 font-bold uppercase text-center" style={{ fontSize: 12 * scale }}>
          {school.name}
        </p>
        <p className="text-amber-100/80 text-center" style={{ fontSize: 8 * scale, marginTop: 4 * scale }}>
          {school.session}
        </p>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 bg-amber-400 text-red-900 font-black uppercase shadow"
        style={{
          top: 52 * scale,
          padding: `${4 * scale}px ${16 * scale}px`,
          fontSize: 9 * scale,
          borderRadius: 4 * scale,
          zIndex: 5,
        }}
      >
        Class {student.className.replace(/^Class\s*/i, '')}-{student.section}
      </div>

      <div className="flex flex-col items-center" style={{ marginTop: -18 * scale, padding: `0 ${16 * scale}px` }}>
        <div
          className="overflow-hidden border-4 border-amber-600 bg-white shadow-lg"
          style={{ width: 125 * scale, height: 125 * scale, borderRadius: '50%' }}
        >
          <Photo src={student.photoUrl} className="w-full h-full object-cover" />
        </div>
        <p className="font-black text-red-900 uppercase mt-3" style={{ fontSize: 15 * scale }}>
          {student.name}
        </p>
        <div className="w-full mt-4 space-y-1" style={{ fontSize: 10 * scale, color: '#44403c' }}>
          {[
            ['Roll No', student.rollNo],
            ['Father', student.fatherName],
            ['DOB', student.dob],
            ['Contact', student.phone],
          ].map(([label, value]) => (
            <p key={label}>
              <span className="font-bold text-red-900">{label}:</span> {value}
            </p>
          ))}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 text-center"
        style={{
          background: '#7f1d1d',
          color: '#fde68a',
          padding: `${12 * scale}px`,
          fontSize: 8 * scale,
        }}
      >
        <p>{school.address}</p>
        <p className="font-bold mt-1">{school.phone}</p>
      </div>
    </div>
  );
}

export function IdCardByTemplate({
  templateId,
  student,
  school,
  scale = 1,
}: {
  templateId: IdCardTemplateId;
  student: IdCardStudent;
  school: IdCardSchool;
  scale?: number;
}) {
  if (templateId === 'stAnthony') return <StAnthonyCard student={student} school={school} scale={scale} />;
  if (templateId === 'adarsh') return <AdarshCard student={student} school={school} scale={scale} />;
  if (templateId === 'oxford') return <OxfordCard student={student} school={school} scale={scale} />;
  if (templateId === 'emeraldCrest') return <EmeraldCrestCard student={student} school={school} scale={scale} />;
  if (templateId === 'modernMinimal') return <ModernMinimalCard student={student} school={school} scale={scale} />;
  if (templateId === 'royalMaroon') return <RoyalMaroonCard student={student} school={school} scale={scale} />;
  return <SaiJyotiCard student={student} school={school} scale={scale} />;
}
