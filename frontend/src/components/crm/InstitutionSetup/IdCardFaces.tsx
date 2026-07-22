import type { CSSProperties, ComponentType } from 'react';
import type { IdCardSchool, IdCardStudent, IdCardTemplateId } from './idCardTypes';

const PHOTO_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#cbd5e1" width="200" height="200"/><circle cx="100" cy="80" r="40" fill="#94a3b8"/><ellipse cx="100" cy="180" rx="60" ry="50" fill="#94a3b8"/></svg>`,
  );

type CardProps = { student: IdCardStudent; school: IdCardSchool; scale?: number };

const DISCLAIMER_HEIGHT = 34;

const ID_CARD_DISCLAIMER_MAIN =
  'This ID card if you find in any unexpected place kindly contact institute immediately';
const ID_CARD_DISCLAIMER_SUB = '(if it is not used it should have been destroyed)';

function formatParentMobiles(student: IdCardStudent): string {
  const parts: string[] = [];
  const father = student.fatherMobile?.trim();
  const mother = student.motherMobile?.trim();
  if (father && father !== '—') parts.push(`Father: ${father}`);
  if (mother && mother !== '—') parts.push(`Mother: ${mother}`);
  if (parts.length) return parts.join(' · ');
  return student.phone || '—';
}

function IdCardDisclaimer({ scale, light = true }: { scale: number; light?: boolean }) {
  return (
    <div
      style={{
        padding: `${3 * scale}px ${6 * scale}px ${4 * scale}px`,
        background: light ? '#f8fafc' : '#071428',
        borderTop: `0.5px solid ${light ? '#e2e8f0' : '#1e3a5f'}`,
      }}
    >
      <p
        style={{
          fontSize: 5 * scale,
          lineHeight: 1.3,
          color: light ? '#334155' : 'rgba(255,255,255,0.92)',
          textAlign: 'center',
        }}
      >
        {ID_CARD_DISCLAIMER_MAIN}
      </p>
      <p
        style={{
          fontSize: 4 * scale,
          lineHeight: 1.25,
          color: light ? '#64748b' : 'rgba(255,255,255,0.65)',
          textAlign: 'center',
          marginTop: 1 * scale,
        }}
      >
        {ID_CARD_DISCLAIMER_SUB}
      </p>
    </div>
  );
}

function SchoolContactFooter({
  school,
  scale,
  darkBg = '#0B1B47',
}: {
  school: IdCardSchool;
  scale: number;
  darkBg?: string;
}) {
  const website = school.website?.replace(/^https?:\/\//, '') || 'www.website.com';
  return (
    <div
      className="text-white flex flex-col"
      style={{ background: darkBg, padding: `${8 * scale}px ${12 * scale}px ${6 * scale}px` }}
    >
      <p className="font-bold uppercase" style={{ fontSize: 8 * scale, marginBottom: 3 * scale }}>
        {school.name}
      </p>
      <p style={{ fontSize: 7 * scale, lineHeight: 1.4, opacity: 0.95 }}>
        {school.address}
        {school.phone ? ` · Ph: ${school.phone}` : ''}
      </p>
      <p className="text-center font-bold uppercase" style={{ fontSize: 7.5 * scale, marginTop: 4 * scale }}>
        {website}
      </p>
    </div>
  );
}

function Photo({ src, className, style }: { src?: string; className?: string; style?: CSSProperties }) {
  return (
    <img
      src={src || PHOTO_PLACEHOLDER}
      alt=""
      className={className}
      style={style}
      crossOrigin="anonymous"
    />
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
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${dotSize}px)`, gap }}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: color }} />
      ))}
    </div>
  );
}

function FakeBarcode({ scale, width = 140 }: { scale: number; width?: number }) {
  const bars = [3, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3, 1, 4, 2, 1];
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-end" style={{ height: 28 * scale, gap: 1 * scale }}>
        {bars.map((w, i) => (
          <div key={i} style={{ width: w * scale, height: '100%', background: '#000' }} />
        ))}
      </div>
      <p style={{ fontSize: 7 * scale, marginTop: 2 * scale, letterSpacing: 2 }}>123456789</p>
    </div>
  );
}

function FakeQr({ scale, size = 52 }: { scale: number; size?: number }) {
  const s = size * scale;
  return (
    <div
      style={{
        width: s,
        height: s,
        background: 'repeating-conic-gradient(#111 0% 25%, #fff 0% 50%) 50% / 8px 8px',
        border: `${2 * scale}px solid #111`,
      }}
    />
  );
}

function GradCapLogo({ scale, color = '#0B1B47' }: { scale: number; color?: string }) {
  return (
    <svg viewBox="0 0 48 56" style={{ width: 34 * scale, height: 40 * scale }} fill="none">
      <path
        d="M24 2L6 10v16c0 12.15 7.68 23.45 18 27 10.32-3.55 18-14.85 18-27V10L24 2z"
        fill="white"
        stroke="white"
      />
      <path d="M24 14c-2 8-6 12-10 14 2-6 4-10 4-14h6zm0 0c2 8 6 12 10 14-2-6-4-10-4-14h-6z" fill={color} />
      <circle cx="24" cy="22" r="2.5" fill={color} />
    </svg>
  );
}

/** 1 — St. Anthony's College (yellow header, navy curves, contact footer) */
export function StAnthonyCard({ student, school, scale = 1 }: CardProps) {
  const designation =
    student.designation ||
    `${student.className}${student.section && student.section !== '—' ? ` - ${student.section}` : ''}`;
  const footerH = 88 * scale;
  const disclaimerH = DISCLAIMER_HEIGHT * scale;

  return (
    <div
      className="relative overflow-hidden bg-white text-left"
      style={{ width: 320 * scale, height: 500 * scale, fontFamily: 'Segoe UI, Arial, sans-serif' }}
    >
      <div
        className="relative flex items-center gap-2"
        style={{ background: '#F5B800', padding: `${10 * scale}px ${12 * scale}px ${14 * scale}px`, minHeight: 50 * scale }}
      >
        <GradCapLogo scale={scale} />
        <p className="font-black uppercase leading-tight flex-1" style={{ fontSize: 11 * scale, color: '#0B1B47' }}>
          {school.name}
        </p>
        <div style={{ opacity: 0.4 }}>
          <DotGrid cols={3} rows={5} color="#64748b" dotSize={2.5 * scale} gap={2.5 * scale} />
        </div>
      </div>

      <svg
        className="absolute left-0"
        style={{ top: 42 * scale, width: '100%', height: 72 * scale, zIndex: 1 }}
        viewBox="0 0 320 88"
        preserveAspectRatio="none"
      >
        <path d="M0,0 C90,72 150,86 320,52 L320,0 Z" fill="#0B1B47" />
      </svg>

      <div
        className="relative z-10 flex flex-col"
        style={{ padding: `0 ${14 * scale}px`, paddingBottom: footerH + disclaimerH + 4 * scale }}
      >
        <div className="flex justify-center" style={{ marginTop: 10 * scale }}>
          <div
            className="overflow-hidden bg-sky-200"
            style={{
              width: 120 * scale,
              height: 136 * scale,
              borderRadius: `${28 * scale}px ${6 * scale}px ${28 * scale}px ${6 * scale}px`,
              border: `${3 * scale}px solid white`,
              boxShadow: '0 6px 18px rgba(11,27,71,0.2)',
            }}
          >
            <Photo src={student.photoUrl} className="w-full h-full object-cover" />
          </div>
        </div>

        <div style={{ marginTop: 12 * scale }}>
          <p
            className="font-black uppercase"
            style={{ fontSize: 12 * scale, color: '#0B1B47', lineHeight: 1.25, marginBottom: 6 * scale }}
          >
            {student.name}
          </p>
          {[
            ["Father's Name", student.fatherName],
            ['Id No', student.rollNo],
            ['Class', designation],
            ['Address', student.address],
            ['Father / Mother Mobile', formatParentMobiles(student)],
            ['Blood Group', student.bloodGroup || '—'],
          ].map(([label, value]) => (
            <p key={label} style={{ fontSize: 9 * scale, color: '#0B1B47', lineHeight: 1.35, marginBottom: 2 * scale }}>
              <span className="font-bold">{label} :</span>{' '}
              <span style={{ fontWeight: label === 'Address' ? 500 : 600 }}>{value}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <svg className="w-full" style={{ height: 18 * scale, display: 'block' }} viewBox="0 0 320 26" preserveAspectRatio="none">
          <path d="M0,26 Q70,2 160,12 T320,18 L320,26 L0,26 Z" fill="#0B1B47" />
        </svg>
        <SchoolContactFooter school={school} scale={scale} />
        <IdCardDisclaimer scale={scale} />
      </div>
    </div>
  );
}

/** 2 — Mount Convent Matriculation School (landscape blue header) */
export function MountConventCard({ student, school, scale = 1 }: CardProps) {
  const classLabel = `${student.className.replace(/^Class\s*/i, '')}${student.section ? ` '${student.section}'` : ''}`;

  return (
    <div
      className="relative overflow-hidden bg-white text-left flex flex-col"
      style={{ width: 480 * scale, height: 300 * scale, fontFamily: 'Segoe UI, Arial, sans-serif' }}
    >
      <div className="flex items-center gap-2 text-white" style={{ background: '#003B7A', padding: `${8 * scale}px ${12 * scale}px` }}>
        <div
          className="rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 border-white"
          style={{ width: 36 * scale, height: 36 * scale, background: '#fff' }}
        >
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div style={{ width: 28 * scale, height: 28 * scale, borderRadius: '50%', background: '#c026d3' }} />
          )}
        </div>
        <div className="flex-1 text-center min-w-0">
          <p className="font-bold uppercase leading-tight" style={{ fontSize: 11 * scale }}>
            {school.name}
          </p>
          <p style={{ fontSize: 7 * scale, opacity: 0.9 }}>(Affiliated to CBSE, New Delhi)</p>
        </div>
      </div>

      <div
        className="flex justify-between items-center border-b border-slate-300"
        style={{ background: '#E8E8E8', padding: `${5 * scale}px ${12 * scale}px` }}
      >
        <p className="font-black uppercase" style={{ fontSize: 10 * scale, color: '#111' }}>
          Identity Card
        </p>
        <p className="font-bold" style={{ fontSize: 10 * scale, color: '#111' }}>
          {school.session}
        </p>
      </div>

      <div className="flex-1 flex relative" style={{ padding: `${8 * scale}px ${12 * scale}px`, paddingBottom: 38 * scale }}>
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: 90 * scale,
            height: 108 * scale,
            borderRadius: 8 * scale,
            border: `${3 * scale}px solid #f472b6`,
            boxShadow: `0 0 ${12 * scale}px rgba(244,114,182,0.55)`,
          }}
        >
          <Photo src={student.photoUrl} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 flex flex-col justify-between min-w-0" style={{ paddingLeft: 12 * scale }}>
          <div className="space-y-0.5">
            {[
              ['Student Name', student.name],
              ['Father Name', student.fatherName],
              ['Student ID', student.rollNo],
              ['Class', classLabel],
              ['Address', student.address],
              ['Father / Mother Mobile', formatParentMobiles(student)],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-1" style={{ fontSize: 8 * scale, color: '#003B7A' }}>
                <span className="font-semibold shrink-0" style={{ minWidth: 82 * scale }}>
                  {label} :
                </span>
                <span className="font-bold text-slate-800 break-words">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="text-center text-white font-bold uppercase" style={{ background: '#003B7A', padding: `${4 * scale}px`, fontSize: 7 * scale }}>
          {school.name} · {school.address} · Ph: {school.phone}
        </div>
        <IdCardDisclaimer scale={scale} />
      </div>
    </div>
  );
}

/** 3 — Professional Staff / John Doe (blue geometric) */
export function ProfessionalStaffCard({ student, school, scale = 1 }: CardProps) {
  const role = student.designation || 'Student';

  return (
    <div
      className="relative overflow-hidden bg-white text-left"
      style={{ width: 320 * scale, height: 500 * scale, fontFamily: 'Segoe UI, Arial, sans-serif' }}
    >
      <div className="relative" style={{ height: 100 * scale, background: '#B8D4E8' }}>
        <div
          className="absolute"
          style={{
            top: 0,
            right: 0,
            width: '55%',
            height: '100%',
            background: '#1E5A8A',
            clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)',
          }}
        />
        <div className="relative z-10 flex items-center gap-2" style={{ padding: `${14 * scale}px ${12 * scale}px` }}>
          <div
            className="rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0"
            style={{ width: 36 * scale, height: 36 * scale, border: `${2 * scale}px solid #1E5A8A` }}
          >
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <GradCapLogo scale={scale * 0.7} color="#1E5A8A" />
            )}
          </div>
          <p className="font-bold uppercase text-white" style={{ fontSize: 9 * scale, maxWidth: 120 * scale }}>
            {school.name}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center" style={{ padding: `0 ${16 * scale}px`, marginTop: -10 * scale }}>
        <div
          className="overflow-hidden bg-sky-100"
          style={{
            width: 110 * scale,
            height: 110 * scale,
            border: `${4 * scale}px solid white`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          <Photo src={student.photoUrl} className="w-full h-full object-cover" />
        </div>

        <p className="font-black uppercase text-center" style={{ fontSize: 16 * scale, marginTop: 10 * scale, color: '#111' }}>
          {student.name}
        </p>

        <div
          className="text-white font-semibold text-center"
          style={{
            background: '#1E5A8A',
            borderRadius: 20 * scale,
            padding: `${5 * scale}px ${20 * scale}px`,
            fontSize: 9 * scale,
            marginTop: 8 * scale,
          }}
        >
          {role}
        </div>

        <div className="w-full space-y-1" style={{ marginTop: 10 * scale, fontSize: 9 * scale, paddingBottom: 90 * scale }}>
          {[
            ['Father Name', student.fatherName],
            ['ID Number', student.rollNo],
            ['Address', student.address],
            ['Father / Mother Mobile', formatParentMobiles(student)],
            ['Department', student.course || student.className],
          ].map(([label, value]) => (
            <p key={label}>
              <span className="font-bold" style={{ color: '#1E5A8A' }}>
                {label}:
              </span>{' '}
              <span className="text-slate-800">{value}</span>
            </p>
          ))}
        </div>

        <p className="font-bold text-center absolute left-0 right-0" style={{ fontSize: 8 * scale, bottom: 84 * scale, color: '#111' }}>
          {school.name} · {school.phone}
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <IdCardDisclaimer scale={scale} />
      </div>

      <div className="absolute left-0 right-0 z-10" style={{ bottom: DISCLAIMER_HEIGHT * scale, height: 50 * scale }}>
        <div style={{ height: '100%', background: '#B8D4E8', clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }} />
        <div
          className="absolute bottom-0 right-0"
          style={{
            width: '60%',
            height: '80%',
            background: '#1E5A8A',
            clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 0 100%)',
          }}
        />
      </div>
    </div>
  );
}

/** 4 — Bright Future Public School (teal, circular photo, white info card) */
export function BrightFutureCard({ student, school, scale = 1 }: CardProps) {
  const parts = school.name.split(/\s+/);
  const line1 = parts.slice(0, 2).join(' ').toUpperCase() || 'BRIGHT FUTURE';
  const line2 = parts.slice(2).join(' ').toUpperCase() || 'PUBLIC SCHOOL';

  return (
    <div
      className="relative overflow-hidden text-left"
      style={{
        width: 320 * scale,
        height: 500 * scale,
        background: '#0D4F4F',
        fontFamily: 'Georgia, Times New Roman, serif',
      }}
    >
      <div className="text-center" style={{ padding: `${16 * scale}px ${12 * scale}px ${8 * scale}px` }}>
        <p className="text-white font-bold" style={{ fontSize: 18 * scale, letterSpacing: 1 }}>
          {line1}
        </p>
        <p style={{ fontSize: 9 * scale, color: '#F97316', fontWeight: 700, letterSpacing: 2, marginTop: 2 * scale }}>
          {line2}
        </p>
      </div>

      <div className="relative flex flex-col items-center" style={{ padding: `0 ${14 * scale}px` }}>
        <div
          className="relative z-10 overflow-hidden"
          style={{
            width: 110 * scale,
            height: 110 * scale,
            borderRadius: '50%',
            border: `${4 * scale}px solid #F97316`,
            marginTop: 8 * scale,
          }}
        >
          <Photo src={student.photoUrl} className="w-full h-full object-cover" />
        </div>

        <div
          className="relative w-full bg-white rounded-xl"
          style={{
            marginTop: -40 * scale,
            paddingTop: 48 * scale,
            padding: `${48 * scale}px ${14 * scale}px ${14 * scale}px`,
            borderRadius: 12 * scale,
          }}
        >
          <p style={{ fontSize: 8 * scale, color: '#F97316', fontWeight: 700 }}>NAME</p>
          <p className="font-bold text-slate-900 uppercase" style={{ fontSize: 13 * scale, marginBottom: 10 * scale }}>
            {student.name}
          </p>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1" style={{ fontSize: 7.5 * scale }}>
              {[
                ['FATHER NAME', student.fatherName],
                ['ADDRESS', student.address],
                ['FATHER / MOTHER MOBILE', formatParentMobiles(student)],
                ['D.O.B.', student.dob],
              ].map(([label, value]) => (
                <div key={label}>
                  <span style={{ color: '#0D4F4F', fontWeight: 700 }}>{label}</span>
                  <p className="text-slate-800 font-semibold leading-tight">{value}</p>
                </div>
              ))}
            </div>
            <div className="shrink-0 text-center">
              <div
                className="border-2 border-teal-800 font-bold"
                style={{ padding: `${4 * scale}px ${8 * scale}px`, fontSize: 11 * scale, color: '#0D4F4F' }}
              >
                {student.className.replace(/^Class\s*/i, '')}
                <span style={{ fontSize: 8 * scale }}>th</span>
              </div>
              <p style={{ fontSize: 7 * scale, marginTop: 2 * scale }}>{school.session}</p>
              <div style={{ marginTop: 6 * scale }}>
                <FakeQr scale={scale} size={44} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <p className="text-center" style={{ fontSize: 7 * scale, color: '#5EEAD4', padding: `${4 * scale}px`, background: '#0D4F4F' }}>
          {school.name} · {school.address} · Ph: {school.phone}
        </p>
        <IdCardDisclaimer scale={scale} light={false} />
      </div>
    </div>
  );
}

/** 5 — Air Force International (navy vertical stripe, identity card) */
export function AirForceCard({ student, school, scale = 1 }: CardProps) {
  const classSec = `${student.className.replace(/^Class\s*/i, '')} ${student.section || 'A'}`.toUpperCase();

  return (
    <div
      className="relative overflow-hidden bg-slate-100 text-left"
      style={{ width: 320 * scale, height: 500 * scale, fontFamily: 'Segoe UI, Arial, sans-serif' }}
    >
      <div className="text-white text-center" style={{ background: '#002147', padding: `${10 * scale}px ${8 * scale}px` }}>
        <p className="font-bold uppercase leading-tight" style={{ fontSize: 9 * scale }}>
          {school.name}
        </p>
        <p style={{ fontSize: 7 * scale, marginTop: 3 * scale, opacity: 0.9 }}>
          {school.address}
        </p>
        <p style={{ fontSize: 7 * scale }}>Ph: {school.phone}</p>
      </div>

      <p className="text-center font-black uppercase" style={{ fontSize: 11 * scale, color: '#002147', padding: `${8 * scale}px 0` }}>
        Identity Card
      </p>

      <div
        className="absolute left-0 bottom-0 top-0 flex flex-col items-center justify-between"
        style={{
          width: 52 * scale,
          background: '#002147',
          paddingTop: 120 * scale,
          paddingBottom: 16 * scale,
        }}
      >
        <p
          className="text-white font-bold uppercase"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 9 * scale,
            letterSpacing: 1,
          }}
        >
          {school.session.replace('-', ' - ')}
        </p>
        <div className="text-center">
          <p className="italic text-sky-300" style={{ fontSize: 9 * scale, fontFamily: 'cursive' }}>
            Sign
          </p>
          <p className="text-slate-400 uppercase" style={{ fontSize: 6 * scale }}>
            Principal
          </p>
        </div>
      </div>

      <div style={{ marginLeft: 58 * scale, padding: `0 ${10 * scale}px ${DISCLAIMER_HEIGHT + 8}px` }}>
        <div className="flex gap-2 items-start">
          <div
            className="shrink-0 overflow-hidden border-2 border-white shadow"
            style={{ width: 88 * scale, height: 100 * scale }}
          >
            <Photo src={student.photoUrl} className="w-full h-full object-cover" />
          </div>
          <div
            className="flex-1 flex items-center justify-center"
            style={{ width: 56 * scale, height: 70 * scale, background: '#002147', borderRadius: 4 * scale }}
          >
            <span className="text-white font-black" style={{ fontSize: 22 * scale }}>
              D
            </span>
          </div>
        </div>

        <div className="space-y-0.5" style={{ marginTop: 8 * scale, fontSize: 7.5 * scale }}>
          {[
            ['ADMISSION NO', student.rollNo],
            ['NAME', student.name.toUpperCase()],
            ['FATHER NAME', student.fatherName.toUpperCase()],
            ['CLASS & SEC', classSec],
            ['ADDRESS', student.address],
            ['FATHER / MOTHER MOBILE', formatParentMobiles(student)],
          ].map(([label, value]) => (
            <p key={label} className="font-bold uppercase text-slate-900 leading-snug">
              {label} : <span className="font-black">{value}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <IdCardDisclaimer scale={scale} />
      </div>
    </div>
  );
}

/** 6 — School Inc (curved navy arch, centered layout, barcode) */
export function SchoolIncCard({ student, school, scale = 1 }: CardProps) {
  return (
    <div
      className="relative overflow-hidden bg-white text-center"
      style={{ width: 320 * scale, height: 500 * scale, fontFamily: 'Segoe UI, Arial, sans-serif' }}
    >
      <div style={{ padding: `${16 * scale}px ${12 * scale}px ${8 * scale}px` }}>
        <div className="flex flex-col items-center gap-1">
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 36 * scale, height: 36 * scale, background: '#003B5C' }}
          >
            <GradCapLogo scale={scale * 0.65} color="#4ED2E0" />
          </div>
          <p className="font-black uppercase" style={{ fontSize: 11 * scale, color: '#003B5C' }}>
            {school.name.split(' ').slice(0, 2).join(' ').toUpperCase() || 'SCHOOL INC.'}
          </p>
        </div>
      </div>

      <div className="relative flex justify-center" style={{ marginTop: 4 * scale, zIndex: 5 }}>
        <div
          className="overflow-hidden rounded-full"
          style={{
            width: 100 * scale,
            height: 100 * scale,
            border: `${4 * scale}px solid #4ED2E0`,
            background: '#e2e8f0',
          }}
        >
          <Photo src={student.photoUrl} className="w-full h-full object-cover" />
        </div>
      </div>

      <div
        className="absolute left-0 right-0 bottom-0 text-white flex flex-col items-center"
        style={{
          top: 130 * scale,
          background: '#003B5C',
          borderTop: `${3 * scale}px solid #4ED2E0`,
          borderRadius: `${160 * scale}px ${160 * scale}px 0 0`,
          padding: `${70 * scale}px ${16 * scale}px ${DISCLAIMER_HEIGHT + 52}px`,
        }}
      >
        <p className="font-black uppercase" style={{ fontSize: 15 * scale, letterSpacing: 1 }}>
          {student.name}
        </p>
        <p className="font-semibold uppercase" style={{ fontSize: 9 * scale, marginTop: 4 * scale, opacity: 0.9 }}>
          {student.fatherName}
        </p>

        <p className="font-bold uppercase" style={{ fontSize: 8 * scale, marginTop: 10 * scale }}>
          Address
        </p>
        <p style={{ fontSize: 8 * scale, marginTop: 2 * scale, lineHeight: 1.35 }}>{student.address}</p>

        <p className="font-bold uppercase" style={{ fontSize: 8 * scale, marginTop: 8 * scale }}>
          Father / Mother Mobile
        </p>
        <p style={{ fontSize: 8 * scale, marginTop: 2 * scale }}>{formatParentMobiles(student)}</p>

        <p className="font-bold uppercase" style={{ fontSize: 8 * scale, marginTop: 8 * scale }}>
          Student No
        </p>
        <p style={{ fontSize: 9 * scale, letterSpacing: 1 }}>{student.rollNo}</p>

        <p style={{ fontSize: 7 * scale, marginTop: 8 * scale, opacity: 0.85 }}>
          {school.name} · {school.phone}
        </p>

        <div style={{ marginTop: 8 * scale }}>
          <FakeBarcode scale={scale} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <IdCardDisclaimer scale={scale} light={false} />
      </div>
    </div>
  );
}

/** 7 — Greenwood Primary (blue/orange diagonal accents, shield banner) */
export function GreenwoodPrimaryCard({ student, school, scale = 1 }: CardProps) {
  const grade = student.className.replace(/^Class\s*/i, '');

  return (
    <div
      className="relative overflow-hidden bg-white text-center"
      style={{ width: 320 * scale, height: 500 * scale, fontFamily: 'Georgia, Times New Roman, serif' }}
    >
      {/* Top-left diagonal */}
      <div className="absolute top-0 left-0" style={{ width: 120 * scale, height: 120 * scale, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 160 * scale, height: 24 * scale, background: '#1d70b8', transform: 'rotate(-45deg)', top: 28 * scale, left: -40 * scale }} />
        <div style={{ position: 'absolute', width: 160 * scale, height: 10 * scale, background: '#f47738', transform: 'rotate(-45deg)', top: 38 * scale, left: -40 * scale }} />
        <div style={{ position: 'absolute', width: 160 * scale, height: 10 * scale, background: '#f47738', transform: 'rotate(-45deg)', top: 50 * scale, left: -40 * scale }} />
      </div>

      {/* Bottom-right diagonal */}
      <div className="absolute bottom-0 right-0" style={{ width: 120 * scale, height: 120 * scale, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 160 * scale, height: 24 * scale, background: '#1d70b8', transform: 'rotate(-45deg)', bottom: 28 * scale, right: -40 * scale }} />
        <div style={{ position: 'absolute', width: 160 * scale, height: 10 * scale, background: '#f47738', transform: 'rotate(-45deg)', bottom: 38 * scale, right: -40 * scale }} />
        <div style={{ position: 'absolute', width: 160 * scale, height: 10 * scale, background: '#f47738', transform: 'rotate(-45deg)', bottom: 50 * scale, right: -40 * scale }} />
      </div>

      {/* Shield banner */}
      <div className="absolute top-0 right-0 flex flex-col items-center text-white" style={{ width: 90 * scale }}>
        <div
          style={{
            width: '100%',
            background: '#1d70b8',
            clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
            padding: `${10 * scale}px ${6 * scale}px ${18 * scale}px`,
          }}
        >
          <div className="mx-auto mb-1" style={{ fontSize: 16 * scale }}>
            🎓
          </div>
          <p className="font-bold uppercase leading-tight" style={{ fontSize: 7 * scale }}>
            {school.name}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center" style={{ paddingTop: 20 * scale, paddingBottom: DISCLAIMER_HEIGHT + 8 }}>
        <div
          className="overflow-hidden rounded-full"
          style={{
            width: 110 * scale,
            height: 110 * scale,
            border: `${4 * scale}px solid #1d70b8`,
            marginTop: 20 * scale,
          }}
        >
          <Photo src={student.photoUrl} className="w-full h-full object-cover" />
        </div>

        <p className="font-bold uppercase" style={{ fontSize: 14 * scale, color: '#1d70b8', marginTop: 10 * scale }}>
          {student.name}
        </p>
        <p className="font-bold uppercase" style={{ fontSize: 8 * scale, color: '#1d70b8', marginTop: 2 * scale }}>
          Name
        </p>

        <div style={{ marginTop: 8 * scale }}>
          <FakeQr scale={scale} size={40} />
        </div>

        <div className="space-y-1.5 text-left w-full px-4" style={{ marginTop: 10 * scale, fontSize: 8 * scale }}>
          <div>
            <p className="font-bold uppercase" style={{ color: '#1d70b8' }}>Father Name</p>
            <p className="font-semibold text-slate-900">{student.fatherName}</p>
          </div>
          <div>
            <p className="font-bold uppercase" style={{ color: '#1d70b8' }}>Address</p>
            <p className="font-semibold text-slate-900">{student.address}</p>
          </div>
          <div>
            <p className="font-bold uppercase" style={{ color: '#1d70b8' }}>Father / Mother Mobile</p>
            <p className="font-semibold text-slate-900">{formatParentMobiles(student)}</p>
          </div>
          <div>
            <p className="font-bold uppercase" style={{ color: '#1d70b8' }}>Class</p>
            <p className="font-semibold text-slate-900">
              {grade}
              {student.section ? ` (${student.section})` : ''}
            </p>
          </div>
          <p className="text-center font-semibold" style={{ color: '#1d70b8', fontSize: 7 * scale }}>
            {school.name} · {school.phone}
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <IdCardDisclaimer scale={scale} />
      </div>
    </div>
  );
}

// Legacy exports kept for any direct imports
export const SaiJyotiCard = MountConventCard;
export const AdarshCard = ProfessionalStaffCard;
export const OxfordCard = BrightFutureCard;
export const EmeraldCrestCard = AirForceCard;
export const ModernMinimalCard = SchoolIncCard;
export const RoyalMaroonCard = GreenwoodPrimaryCard;

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
  const map: Record<IdCardTemplateId, ComponentType<CardProps>> = {
    stAnthony: StAnthonyCard,
    saiJyoti: MountConventCard,
    adarsh: ProfessionalStaffCard,
    oxford: BrightFutureCard,
    emeraldCrest: AirForceCard,
    modernMinimal: SchoolIncCard,
    royalMaroon: GreenwoodPrimaryCard,
  };
  const Card = map[templateId] || StAnthonyCard;
  return <Card student={student} school={school} scale={scale} />;
}
