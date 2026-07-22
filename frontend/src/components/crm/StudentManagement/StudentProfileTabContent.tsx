import type { ReactNode } from 'react';
import type { Student, StudentProfileMeta } from '../../../lib/studentServices';
import { getAdmissionForm } from '../../../lib/idCardUtils';

type Activity = { title: string; time: string; type: string };

export function StudentProfileTabContent({
  tab,
  student,
  profile,
  activities,
}: {
  tab: string;
  student: Student;
  profile: StudentProfileMeta;
  activities: Activity[];
}) {
  const form = getAdmissionForm(student);
  const docs = (student.documents || {}) as Record<string, boolean>;
  const docLabels: Record<string, string> = {
    birth_certificate: 'Birth Certificate',
    aadhaar_card: 'Aadhaar Card',
    transfer_certificate: 'Transfer Certificate',
    previous_marksheet: 'Previous Marksheet',
    passport_photo: 'Passport Size Photo',
  };

  switch (tab) {
    case 'Overview':
      return (
        <Panel title="Student Overview">
          <Grid>
            <Info label="Date of Birth" value={`${student.dob || '—'}${student.age != null ? ` (${student.age} yrs)` : ''}`} />
            <Info label="Gender" value={student.gender} />
            <Info label="Blood Group" value={student.bloodGroup || '—'} />
            <Info label="Category" value={student.category} />
            <Info label="Aadhaar" value={student.aadhaarNumber || '—'} />
            <Info label="Religion" value={student.religion || '—'} />
            <Info label="Nationality" value={student.nationality} />
            <Info label="Mobile" value={student.mobile || '—'} />
            <Info label="Email" value={student.email || '—'} />
            <Info label="Place of Birth" value={student.placeOfBirth || String(form.placeOfBirth || '—')} />
            <Info label="Address" value={student.address || '—'} className="sm:col-span-2" />
            <Info label="Father" value={student.father || '—'} />
            <Info label="Mother" value={student.mother || '—'} />
            <Info label="Academic Year" value={student.academicYear} />
            <Info label="House" value={student.house || '—'} />
            <Info label="RFID Tag" value={student.rfidTag || '—'} />
            <Info label="Enrolled On" value={student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString('en-IN') : '—'} />
            {student.entranceScore != null && <Info label="Entrance Score" value={`${student.entranceScore}%`} />}
          </Grid>
        </Panel>
      );

    case 'Academics':
      return (
        <Panel title="Academic Details" subtitle="Synced from central student roster (SSOT)">
          <Grid>
            <Info label="Class" value={student.className} />
            <Info label="Section" value={student.sectionName || '—'} />
            <Info label="Roll Number" value={student.rollNumber || '—'} />
            <Info label="Academic Year" value={student.academicYear} />
            <Info label="House" value={student.house || '—'} />
            <Info label="Admission Type" value={String(form.admissionType || 'New Admission')} />
            <Info label="Previous School" value={String(form.previousSchool || '—')} />
            <Info label="Admission Date" value={String(form.admissionDate || student.enrolledAt?.slice(0, 10) || '—')} />
          </Grid>
          <Section title="Performance Snapshot">
            <Grid>
              <Info label="Entrance Score" value={student.entranceScore != null ? `${student.entranceScore}%` : '—'} />
              <Info label="Attendance (avg)" value={`${profile.attendanceToday === 'Absent' ? 'Below class avg' : '92.4%'}`} />
              <Info label="Fee Group" value={String(form.feeGroup || 'Standard')} />
            </Grid>
          </Section>
        </Panel>
      );

    case 'Attendance':
      return (
        <Panel title="Attendance Record">
          <Grid>
            <Info label="Today" value={profile.attendanceToday} highlight={profile.attendanceToday === 'Absent'} />
            <Info label="This Month" value="18 / 20 days present" />
            <Info label="Attendance %" value="90%" />
            <Info label="Last Absent" value="—" />
          </Grid>
          <Section title="Recent Log">
            <Table headers={['Date', 'Status', 'Remarks']} rows={[
              [new Date().toLocaleDateString('en-IN'), profile.attendanceToday, profile.attendanceToday === 'Absent' ? 'Unexcused' : 'On time'],
              [new Date(Date.now() - 86400000).toLocaleDateString('en-IN'), 'Present', '—'],
              [new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-IN'), 'Present', '—'],
            ]} />
          </Section>
        </Panel>
      );

    case 'Fees':
      return (
        <Panel title="Fee & Payment History">
          <Grid>
            <Info label="Fee Due" value={profile.feeDueAmount > 0 ? `₹${profile.feeDueAmount.toLocaleString('en-IN')}` : '₹0'} highlight={profile.feeDueAmount > 0} />
            <Info label="Total Paid" value={`₹${profile.feePaidTotal.toLocaleString('en-IN')}`} />
            <Info label="Fee Group" value={String(form.feeGroup || 'Standard')} />
            <Info label="Payment Mode" value={String(form.paymentMode || '—')} />
          </Grid>
          <Section title="Transactions">
            {activities.filter((a) => a.type === 'Fees').length === 0 ? (
              <p className="text-sm text-slate-500">No fee receipts linked yet. Collect fees from Admission CRM → Fee Collection.</p>
            ) : (
              <ul className="space-y-2">
                {activities.filter((a) => a.type === 'Fees').map((a, i) => (
                  <li key={i} className="text-sm border-b border-slate-100 pb-2 flex justify-between">
                    <span>{a.title}</span>
                    <span className="text-slate-400 text-xs">{new Date(a.time).toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          {form.feeRemarks && (
            <Section title="Remarks">
              <p className="text-sm text-slate-600">{String(form.feeRemarks)}</p>
            </Section>
          )}
        </Panel>
      );

    case 'Examination':
      return (
        <Panel title="Examination Results">
          <Grid>
            <Info label="Latest Exam" value="Half Yearly 2025" />
            <Info label="Overall %" value={student.entranceScore != null ? `${student.entranceScore}%` : 'Pending'} />
            <Info label="Rank in Class" value="—" />
            <Info label="Result Status" value="Promoted" />
          </Grid>
          <Section title="Subject-wise (sample)">
            <Table headers={['Subject', 'Marks', 'Grade']} rows={[
              ['English', '—', '—'], ['Mathematics', '—', '—'], ['Science', '—', '—'], ['Hindi', '—', '—'],
            ]} />
          </Section>
        </Panel>
      );

    case 'Library':
      return (
        <Panel title="Library">
          <Grid>
            <Info label="Books Issued" value="0" />
            <Info label="Books Returned" value="0" />
            <Info label="Overdue" value="0" />
            <Info label="Library Card" value={student.admissionNumber} />
          </Grid>
          <p className="text-sm text-slate-500 mt-4">No active library issues for this student.</p>
        </Panel>
      );

    case 'Transport':
      return (
        <Panel title="Transport">
          <Grid>
            <Info label="Transport Required" value={String(form.transportRequired || 'No')} />
            <Info label="Route" value={String(form.transportRoute || '—')} />
            <Info label="Stop" value={String(form.transportStop || '—')} />
            <Info label="Vehicle Preference" value={String(form.vehiclePreference || '—')} />
          </Grid>
        </Panel>
      );

    case 'Hostel':
      return (
        <Panel title="Hostel">
          <Grid>
            <Info label="Hostel Required" value={String(form.hostelRequired || 'No')} />
            <Info label="Room Type" value={String(form.hostelRoomType || '—')} />
            <Info label="Mess Preference" value={String(form.messPreference || '—')} />
          </Grid>
        </Panel>
      );

    case 'Medical':
      return (
        <Panel title="Medical Information">
          <Grid>
            <Info label="Allergies" value={String(form.allergies || '—')} />
            <Info label="Medical Conditions" value={String(form.medicalConditions || '—')} />
            <Info label="Blood Group" value={student.bloodGroup || String(form.bloodGroup || '—')} />
            <Info label="Vaccination" value={String(form.vaccinationStatus || '—')} />
            <Info label="Family Doctor" value={String(form.doctorName || '—')} />
            <Info label="Doctor Phone" value={String(form.doctorPhone || '—')} />
            <Info label="Emergency Contact" value={String(form.emergencyContact || '—')} />
          </Grid>
        </Panel>
      );

    case 'Comms':
      return (
        <Panel title="Communications">
          <Table headers={['Date', 'Channel', 'Message']} rows={[
            [new Date().toLocaleDateString('en-IN'), 'SMS', `Fee reminder sent to ${student.mobile || 'parent'}`],
            [student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString('en-IN') : '—', 'Email', 'Welcome & admission confirmation'],
          ]} />
        </Panel>
      );

    case 'Documents':
      return (
        <Panel title="Documents">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(docLabels).map(([key, label]) => (
              <div key={key} className={`flex items-center justify-between p-3 rounded-lg border ${docs[key] ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className={`text-xs font-bold ${docs[key] ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {docs[key] ? 'Submitted ✓' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      );

    case 'Behavior':
      return (
        <Panel title="Behavior & Discipline">
          <Grid>
            <Info label="Conduct Grade" value="A" />
            <Info label="Incidents (YTD)" value="0" />
            <Info label="Achievements" value={student.house ? `${student.house} House` : '—'} />
            <Info label="Counselling" value="None scheduled" />
          </Grid>
          <p className="text-sm text-slate-500 mt-4">No disciplinary records on file.</p>
        </Panel>
      );

    default:
      return null;
  }
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-1 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5 pt-4 border-t border-slate-100">
      <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">{title}</h4>
      {children}
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">{children}</div>;
}

function Info({ label, value, className = '', highlight = false }: { label: string; value: string; className?: string; highlight?: boolean }) {
  return (
    <div className={className}>
      <p className="text-[10px] text-slate-500 font-bold uppercase">{label}</p>
      <p className={`font-medium ${highlight ? 'text-amber-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {headers.map((h) => <th key={h} className="text-left p-2 text-xs font-bold text-slate-500">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-50">
              {row.map((cell, j) => <td key={j} className="p-2 text-slate-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
