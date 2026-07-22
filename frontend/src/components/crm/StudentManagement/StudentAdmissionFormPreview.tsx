import type { ReactNode, Ref } from 'react';
import type { SchoolBranding, StudentAdmissionFormData } from './studentAdmissionFormTypes';
import { formatDisplayDate, fullName, getAdmissionDocuments, getSubmittedDocumentLabels } from './studentAdmissionFormTypes';

/** A4 at 72 DPI — matches jsPDF portrait dimensions for pixel-perfect export */
export const A4_WIDTH_PX = 595;
export const A4_HEIGHT_PX = 842;

function PhotoBox({ label, src, exportMode }: { label: string; src?: string; exportMode?: boolean }) {
  if (exportMode) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-[88px] h-[108px] border-2 border-slate-400 bg-slate-50 flex items-center justify-center overflow-hidden text-[10px] text-slate-400 text-center leading-tight">
          {src ? <img src={src} alt={label} className="w-full h-full object-cover" /> : label}
        </div>
        <span className="text-[11px] font-bold text-slate-700 mt-1">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <div className="w-[52px] h-[64px] border border-slate-400 bg-slate-50 flex items-center justify-center overflow-hidden text-[6px] text-slate-400 text-center leading-tight">
        {src ? <img src={src} alt={label} className="w-full h-full object-cover" /> : label}
      </div>
      <span className="text-[7px] font-bold text-slate-600 mt-0.5">{label}</span>
    </div>
  );
}

function Row({ label, value, exportMode }: { label: string; value: string; exportMode?: boolean }) {
  if (exportMode) {
    return (
      <tr className="border-b border-slate-300">
        <td className="px-3 py-[8px] text-[10.5px] font-semibold text-slate-700 bg-slate-50 w-[38%] border-r border-slate-300 align-middle">{label}</td>
        <td className="px-3 py-[8px] text-[10.5px] text-slate-900 align-middle">{value || '—'}</td>
      </tr>
    );
  }
  return (
    <tr className="border-b border-slate-300">
      <td className="px-1 py-0.5 text-[7px] font-semibold text-slate-600 bg-slate-50 w-[38%] border-r border-slate-300">{label}</td>
      <td className="px-1 py-0.5 text-[7px] text-slate-800">{value || '—'}</td>
    </tr>
  );
}

function DocumentCheckRow({
  label,
  submitted,
  exportMode,
}: {
  label: string;
  submitted: boolean;
  exportMode?: boolean;
}) {
  if (exportMode) {
    return (
      <tr className="border-b border-slate-300">
        <td className="px-3 py-[8px] text-[10.5px] font-semibold text-slate-700 bg-slate-50 w-[38%] border-r border-slate-300 align-middle">
          {submitted ? '☑' : '☐'} {label}
        </td>
        <td className={`px-3 py-[8px] text-[10.5px] align-middle font-medium ${submitted ? 'text-emerald-700' : 'text-slate-500'}`}>
          {submitted ? 'Submitted ✓' : 'Not Submitted'}
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-b border-slate-300">
      <td className="px-1 py-0.5 text-[7px] font-semibold text-slate-600 bg-slate-50 w-[38%] border-r border-slate-300">
        {submitted ? '☑' : '☐'} {label}
      </td>
      <td className={`px-1 py-0.5 text-[7px] ${submitted ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
        {submitted ? 'Submitted ✓' : 'Not Submitted'}
      </td>
    </tr>
  );
}

function SignatureLine({ label, exportMode }: { label: string; exportMode?: boolean }) {
  return (
    <div className={`text-center border-t border-slate-400 ${exportMode ? 'pt-8 mt-3 text-[10px]' : 'pt-4 mt-2 text-[6px]'} text-slate-600`}>
      {label}
    </div>
  );
}

function SectionTitle({ children, exportMode }: { children: ReactNode; exportMode?: boolean }) {
  return (
    <p className={`font-bold text-slate-800 uppercase ${exportMode ? 'text-[12px] mb-1 mt-1' : 'text-[7px] mb-0.5'}`}>
      {children}
    </p>
  );
}

function FormHeader({ school, page, exportMode }: { school: SchoolBranding; page: 1 | 2; exportMode?: boolean }) {
  if (exportMode) {
    return (
      <div className="border-b-[3px] border-slate-800 pb-3 mb-4 shrink-0">
        <div className="flex items-start gap-4">
          <div className="w-[72px] h-[72px] border-2 border-slate-300 bg-white flex items-center justify-center shrink-0 overflow-hidden">
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-[11px] font-bold text-indigo-700 text-center leading-tight">LOGO</span>
            )}
          </div>
          <div className="flex-1 text-center pt-1">
            <h2 className="text-[18px] font-bold text-slate-900 uppercase tracking-wide leading-tight">{school.name}</h2>
            <p className="text-[10px] text-slate-600 leading-snug mt-1">{school.address}</p>
            <p className="text-[10px] text-slate-500">Ph: {school.phone} | {school.email}</p>
            <p className="text-[13px] font-bold text-indigo-800 mt-2 uppercase">Student Admission Application Form</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Session: {school.session} · Page {page} of 2</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="border-b-2 border-slate-800 pb-1.5 mb-2">
      <div className="flex items-start gap-2">
        <div className="w-10 h-10 border border-slate-300 bg-white flex items-center justify-center shrink-0 overflow-hidden">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-[8px] font-bold text-indigo-700 text-center leading-tight">LOGO</span>
          )}
        </div>
        <div className="flex-1 text-center">
          <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-wide leading-tight">{school.name}</h2>
          <p className="text-[6px] text-slate-600 leading-snug">{school.address}</p>
          <p className="text-[6px] text-slate-500">Ph: {school.phone} | {school.email}</p>
          <p className="text-[7px] font-bold text-indigo-800 mt-1 uppercase">Student Admission Application Form</p>
          <p className="text-[6px] text-slate-500">Session: {school.session} · Page {page} of 2</p>
        </div>
      </div>
    </div>
  );
}

export function AdmissionFormPage1({
  form,
  school,
  id,
  exportMode = false,
  innerRef,
}: {
  form: StudentAdmissionFormData;
  school: SchoolBranding;
  id?: string;
  exportMode?: boolean;
  innerRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={innerRef}
      id={id}
      data-admission-page="1"
      className={`bg-white text-left w-full box-border ${
        exportMode
          ? 'border border-slate-300 p-8 flex flex-col'
          : 'border border-slate-300 shadow-sm p-3 max-w-[280px] mx-auto'
      }`}
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        ...(exportMode ? { width: A4_WIDTH_PX, height: A4_HEIGHT_PX, minHeight: A4_HEIGHT_PX } : {}),
      }}
    >
      <FormHeader school={school} page={1} exportMode={exportMode} />

      <div className={`flex justify-center gap-6 shrink-0 ${exportMode ? 'mb-5' : 'mb-2'}`}>
        <PhotoBox label="Student" src={form.studentPhoto} exportMode={exportMode} />
        <PhotoBox label="Father" src={form.fatherPhoto} exportMode={exportMode} />
        <PhotoBox label="Mother" src={form.motherPhoto} exportMode={exportMode} />
      </div>

      <div className={exportMode ? 'flex-1 flex flex-col justify-between gap-3 min-h-0' : ''}>
        <section>
          <SectionTitle exportMode={exportMode}>Admission Details</SectionTitle>
          <table className={`w-full border border-slate-300 border-collapse ${exportMode ? '' : 'mb-2'}`}>
            <tbody>
              <Row exportMode={exportMode} label="Academic Year" value={form.academicYear} />
              <Row exportMode={exportMode} label="Class Applied" value={form.className} />
              <Row exportMode={exportMode} label="Section" value={form.sectionName} />
              <Row exportMode={exportMode} label="Admission Type" value={form.admissionType} />
              <Row exportMode={exportMode} label="Admission Date" value={formatDisplayDate(form.admissionDate)} />
              <Row exportMode={exportMode} label="Previous School" value={form.previousSchool} />
            </tbody>
          </table>
        </section>

        <section>
          <SectionTitle exportMode={exportMode}>Student Information</SectionTitle>
          <table className={`w-full border border-slate-300 border-collapse ${exportMode ? '' : 'mb-2'}`}>
            <tbody>
              <Row exportMode={exportMode} label="Full Name" value={fullName(form)} />
              <Row exportMode={exportMode} label="Date of Birth" value={formatDisplayDate(form.dateOfBirth)} />
              <Row exportMode={exportMode} label="Gender" value={form.gender} />
              <Row exportMode={exportMode} label="Blood Group" value={form.bloodGroup} />
              <Row exportMode={exportMode} label="Aadhaar No." value={form.aadhaarNumber} />
              <Row exportMode={exportMode} label="Category" value={form.category} />
              <Row exportMode={exportMode} label="Religion" value={form.religion} />
              <Row exportMode={exportMode} label="Nationality" value={form.nationality} />
              <Row exportMode={exportMode} label="Mobile" value={form.mobile} />
              <Row exportMode={exportMode} label="Email" value={form.email} />
            </tbody>
          </table>
        </section>

        <section>
          <SectionTitle exportMode={exportMode}>Parent Information</SectionTitle>
          <table className="w-full border border-slate-300 border-collapse">
            <tbody>
              <Row exportMode={exportMode} label="Father's Name" value={form.fatherName} />
              <Row exportMode={exportMode} label="Father Mobile" value={form.fatherMobile} />
              <Row exportMode={exportMode} label="Father Occupation" value={form.fatherOccupation} />
              <Row exportMode={exportMode} label="Mother's Name" value={form.motherName} />
              <Row exportMode={exportMode} label="Mother Mobile" value={form.motherMobile} />
              <Row exportMode={exportMode} label="Mother Occupation" value={form.motherOccupation} />
              <Row exportMode={exportMode} label="Guardian" value={form.guardianName} />
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

export function AdmissionFormPage2({
  form,
  school,
  id,
  exportMode = false,
  innerRef,
}: {
  form: StudentAdmissionFormData;
  school: SchoolBranding;
  id?: string;
  exportMode?: boolean;
  innerRef?: Ref<HTMLDivElement>;
}) {
  const docs = getAdmissionDocuments(form);
  const submittedLabels = getSubmittedDocumentLabels(form);
  const submittedCount = submittedLabels.length;

  return (
    <div
      ref={innerRef}
      id={id}
      data-admission-page="2"
      className={`bg-white text-left w-full box-border ${
        exportMode
          ? 'border border-slate-300 p-8 flex flex-col'
          : 'border border-slate-300 shadow-sm p-3 max-w-[280px] mx-auto'
      }`}
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        ...(exportMode ? { width: A4_WIDTH_PX, height: A4_HEIGHT_PX, minHeight: A4_HEIGHT_PX } : {}),
      }}
    >
      <FormHeader school={school} page={2} exportMode={exportMode} />

      <div className={exportMode ? 'flex-1 flex flex-col justify-between gap-3 min-h-0' : ''}>
        <section>
          <SectionTitle exportMode={exportMode}>Address</SectionTitle>
          <table className={`w-full border border-slate-300 border-collapse ${exportMode ? '' : 'mb-2'}`}>
            <tbody>
              <Row exportMode={exportMode} label="Permanent Address" value={form.address} />
              <Row exportMode={exportMode} label="City" value={form.city} />
              <Row exportMode={exportMode} label="State" value={form.state} />
              <Row exportMode={exportMode} label="Pincode" value={form.pincode} />
              <Row exportMode={exportMode} label="Place of Birth" value={form.placeOfBirth} />
            </tbody>
          </table>
        </section>

        <section>
          <SectionTitle exportMode={exportMode}>Medical</SectionTitle>
          <table className={`w-full border border-slate-300 border-collapse ${exportMode ? '' : 'mb-2'}`}>
            <tbody>
              <Row exportMode={exportMode} label="Allergies" value={form.allergies} />
              <Row exportMode={exportMode} label="Conditions" value={form.medicalConditions} />
              <Row exportMode={exportMode} label="Doctor" value={form.doctorName} />
              <Row exportMode={exportMode} label="Doctor Phone" value={form.doctorPhone} />
              <Row exportMode={exportMode} label="Emergency Contact" value={form.emergencyContact} />
              <Row exportMode={exportMode} label="Vaccination" value={form.vaccinationStatus} />
            </tbody>
          </table>
        </section>

        <section>
          <SectionTitle exportMode={exportMode}>Transport & Hostel</SectionTitle>
          <table className={`w-full border border-slate-300 border-collapse ${exportMode ? '' : 'mb-2'}`}>
            <tbody>
              <Row exportMode={exportMode} label="Transport" value={form.transportRequired} />
              <Row exportMode={exportMode} label="Route / Stop" value={[form.transportRoute, form.transportStop].filter(Boolean).join(' — ')} />
              <Row exportMode={exportMode} label="Hostel" value={form.hostelRequired} />
              <Row exportMode={exportMode} label="Room / Mess" value={[form.hostelRoomType, form.messPreference].filter(Boolean).join(' / ')} />
              <Row exportMode={exportMode} label="Fee Group" value={form.feeGroup} />
            </tbody>
          </table>
        </section>

        <section>
          <SectionTitle exportMode={exportMode}>Documents Submitted</SectionTitle>
          <table className={`w-full border border-slate-300 border-collapse ${exportMode ? '' : 'mb-2'}`}>
            <tbody>
              {docs.map((d) => (
                <DocumentCheckRow
                  key={d.key}
                  exportMode={exportMode}
                  label={d.label}
                  submitted={d.submitted}
                />
              ))}
            </tbody>
          </table>
        </section>

        <section className={exportMode ? 'shrink-0' : ''}>
          <SectionTitle exportMode={exportMode}>Document Submission Declaration</SectionTitle>
          <div className={`text-slate-700 leading-relaxed border border-slate-300 bg-slate-50 rounded ${exportMode ? 'text-[10px] p-3 mb-3' : 'text-[6px] mb-2 p-1.5'}`}>
            {submittedCount > 0 ? (
              <>
                <p className="mb-2">
                  I hereby declare that the following <strong>{submittedCount}</strong> document{submittedCount !== 1 ? 's have' : ' has'} been submitted along with this admission application for verification:
                </p>
                <ul className={`list-disc pl-4 space-y-0.5 mb-2 ${exportMode ? 'text-[10px]' : 'text-[6px]'}`}>
                  {submittedLabels.map((label) => (
                    <li key={label} className="font-semibold text-slate-800">{label}</li>
                  ))}
                </ul>
                <p>
                  I confirm that the copies submitted are true and correct. Original documents may be required for verification at the time of admission. I understand that incomplete documentation may delay the admission process.
                </p>
              </>
            ) : (
              <p>No documents have been marked as submitted at the time of this application.</p>
            )}
          </div>
          <div className={`grid grid-cols-2 gap-4 ${exportMode ? 'mb-4' : 'mb-2'}`}>
            <SignatureLine exportMode={exportMode} label="Parent / Guardian Signature" />
            <SignatureLine exportMode={exportMode} label="Date" />
          </div>
        </section>

        <section className={exportMode ? 'mt-auto shrink-0' : ''}>
          <SectionTitle exportMode={exportMode}>General Declaration</SectionTitle>
          <p className={`text-slate-600 leading-snug border border-slate-200 bg-slate-50 rounded ${exportMode ? 'text-[10px] p-3 mb-4' : 'text-[6px] mb-2 p-1.5'}`}>
            I hereby declare that all information provided in this admission application is true and correct to the best of my knowledge. I agree to abide by the rules and regulations of <strong>{school.name}</strong>.
            {form.declarationAccepted ? ' [Accepted electronically]' : ''}
          </p>
          <div className={`grid grid-cols-2 gap-3 text-slate-600 ${exportMode ? 'text-[10px]' : 'text-[6px]'}`}>
            {['Student', 'Father', 'Mother', 'Admission Officer'].map((role) => (
              <SignatureLine key={role} exportMode={exportMode} label={role} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
