import type { SchoolBranding, StudentAdmissionFormData } from './studentAdmissionFormTypes';
import { formatDisplayDate, fullName } from './studentAdmissionFormTypes';

function PhotoBox({ label, src }: { label: string; src?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-[52px] h-[64px] border border-slate-400 bg-slate-50 flex items-center justify-center overflow-hidden text-[6px] text-slate-400 text-center leading-tight">
        {src ? <img src={src} alt={label} className="w-full h-full object-cover" /> : label}
      </div>
      <span className="text-[7px] font-bold text-slate-600 mt-0.5">{label}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-300">
      <td className="px-1 py-0.5 text-[7px] font-semibold text-slate-600 bg-slate-50 w-[38%] border-r border-slate-300">{label}</td>
      <td className="px-1 py-0.5 text-[7px] text-slate-800">{value || '—'}</td>
    </tr>
  );
}

function FormHeader({ school, page }: { school: SchoolBranding; page: 1 | 2 }) {
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
}: {
  form: StudentAdmissionFormData;
  school: SchoolBranding;
  id?: string;
  exportMode?: boolean;
}) {
  return (
    <div
      id={id}
      data-admission-page="1"
      className={`bg-white border border-slate-300 shadow-sm p-3 text-left w-full ${exportMode ? 'max-w-none' : 'max-w-[280px] mx-auto'}`}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <FormHeader school={school} page={1} />
      <div className="flex justify-center gap-3 mb-2">
        <PhotoBox label="Student" src={form.studentPhoto} />
        <PhotoBox label="Father" src={form.fatherPhoto} />
        <PhotoBox label="Mother" src={form.motherPhoto} />
      </div>
      <p className="text-[7px] font-bold text-slate-800 mb-0.5 uppercase">Admission Details</p>
      <table className="w-full border border-slate-300 border-collapse mb-2">
        <tbody>
          <Row label="Academic Year" value={form.academicYear} />
          <Row label="Class Applied" value={form.className} />
          <Row label="Section" value={form.sectionName} />
          <Row label="Admission Type" value={form.admissionType} />
          <Row label="Admission Date" value={formatDisplayDate(form.admissionDate)} />
          <Row label="Previous School" value={form.previousSchool} />
        </tbody>
      </table>
      <p className="text-[7px] font-bold text-slate-800 mb-0.5 uppercase">Student Information</p>
      <table className="w-full border border-slate-300 border-collapse mb-2">
        <tbody>
          <Row label="Full Name" value={fullName(form)} />
          <Row label="Date of Birth" value={formatDisplayDate(form.dateOfBirth)} />
          <Row label="Gender" value={form.gender} />
          <Row label="Blood Group" value={form.bloodGroup} />
          <Row label="Aadhaar No." value={form.aadhaarNumber} />
          <Row label="Category" value={form.category} />
          <Row label="Religion" value={form.religion} />
          <Row label="Nationality" value={form.nationality} />
          <Row label="Mobile" value={form.mobile} />
          <Row label="Email" value={form.email} />
        </tbody>
      </table>
      <p className="text-[7px] font-bold text-slate-800 mb-0.5 uppercase">Parent Information</p>
      <table className="w-full border border-slate-300 border-collapse">
        <tbody>
          <Row label="Father's Name" value={form.fatherName} />
          <Row label="Father Mobile" value={form.fatherMobile} />
          <Row label="Father Occupation" value={form.fatherOccupation} />
          <Row label="Mother's Name" value={form.motherName} />
          <Row label="Mother Mobile" value={form.motherMobile} />
          <Row label="Mother Occupation" value={form.motherOccupation} />
          <Row label="Guardian" value={form.guardianName} />
        </tbody>
      </table>
    </div>
  );
}

export function AdmissionFormPage2({
  form,
  school,
  id,
  exportMode = false,
}: {
  form: StudentAdmissionFormData;
  school: SchoolBranding;
  id?: string;
  exportMode?: boolean;
}) {
  const docs = [
    { label: 'Birth Certificate', ok: form.docBirthCertificate },
    { label: 'Aadhaar Card', ok: form.docAadhaar },
    { label: 'Transfer Certificate', ok: form.docTransferCertificate },
    { label: 'Previous Marksheet', ok: form.docMarksheet },
    { label: 'Passport Photo', ok: form.docPhoto },
  ];

  return (
    <div
      id={id}
      data-admission-page="2"
      className={`bg-white border border-slate-300 shadow-sm p-3 text-left w-full ${exportMode ? 'max-w-none' : 'max-w-[280px] mx-auto'}`}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <FormHeader school={school} page={2} />
      <p className="text-[7px] font-bold text-slate-800 mb-0.5 uppercase">Address</p>
      <table className="w-full border border-slate-300 border-collapse mb-2">
        <tbody>
          <Row label="Permanent Address" value={form.address} />
          <Row label="City" value={form.city} />
          <Row label="State" value={form.state} />
          <Row label="Pincode" value={form.pincode} />
          <Row label="Place of Birth" value={form.placeOfBirth} />
        </tbody>
      </table>
      <p className="text-[7px] font-bold text-slate-800 mb-0.5 uppercase">Medical</p>
      <table className="w-full border border-slate-300 border-collapse mb-2">
        <tbody>
          <Row label="Allergies" value={form.allergies} />
          <Row label="Conditions" value={form.medicalConditions} />
          <Row label="Doctor" value={form.doctorName} />
          <Row label="Doctor Phone" value={form.doctorPhone} />
          <Row label="Emergency Contact" value={form.emergencyContact} />
          <Row label="Vaccination" value={form.vaccinationStatus} />
        </tbody>
      </table>
      <p className="text-[7px] font-bold text-slate-800 mb-0.5 uppercase">Transport & Hostel</p>
      <table className="w-full border border-slate-300 border-collapse mb-2">
        <tbody>
          <Row label="Transport" value={form.transportRequired} />
          <Row label="Route / Stop" value={[form.transportRoute, form.transportStop].filter(Boolean).join(' — ')} />
          <Row label="Hostel" value={form.hostelRequired} />
          <Row label="Room / Mess" value={[form.hostelRoomType, form.messPreference].filter(Boolean).join(' / ')} />
          <Row label="Fee Group" value={form.feeGroup} />
        </tbody>
      </table>
      <p className="text-[7px] font-bold text-slate-800 mb-0.5 uppercase">Documents Submitted</p>
      <table className="w-full border border-slate-300 border-collapse mb-2">
        <tbody>
          {docs.map((d) => (
            <Row key={d.label} label={d.label} value={d.ok ? 'Yes ✓' : 'Pending'} />
          ))}
        </tbody>
      </table>
      <p className="text-[6px] text-slate-600 leading-snug mb-2 border border-slate-200 bg-slate-50 p-1.5 rounded">
        <strong>Declaration:</strong> I hereby declare that the information provided above is true and correct. I agree to abide by the rules and regulations of {school.name}.
        {form.declarationAccepted ? ' [Accepted]' : ''}
      </p>
      <div className="grid grid-cols-2 gap-2 text-[6px] text-slate-600">
        {['Student', 'Father', 'Mother', 'Admission Officer'].map((role) => (
          <div key={role} className="text-center pt-4 border-t border-slate-400 mt-2">
            {role}
          </div>
        ))}
      </div>
    </div>
  );
}
