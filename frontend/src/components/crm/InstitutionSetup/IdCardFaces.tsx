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
  if (templateId === 'adarsh') return <AdarshCard student={student} school={school} scale={scale} />;
  if (templateId === 'oxford') return <OxfordCard student={student} school={school} scale={scale} />;
  return <SaiJyotiCard student={student} school={school} scale={scale} />;
}
