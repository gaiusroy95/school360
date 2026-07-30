import * as XLSX from 'xlsx';
import type { MeritListEntry } from './meritListServices';

export function downloadMeritListExcel(
  entries: MeritListEntry[],
  filename = `Merit_List_${new Date().toISOString().slice(0, 10)}.xlsx`,
) {
  const rows = entries.map((entry) => ({
    Rank: entry.rank ?? '',
    'Application ID': entry.applicationId,
    'Student Name': entry.studentName,
    Class: entry.classApplied || '',
    Mobile: entry.mobile || '',
    Email: entry.email || '',
    Session: entry.academicSession || '',
    Test: entry.testTitle,
    Source: entry.scoreSource === 'manual' ? 'Manual' : 'Digital',
    'Score %': entry.scorePercent ?? '',
    'Raw Score': entry.rawScore ?? '',
    'Max Score': entry.maxScore ?? '',
    'Pass Marks %': entry.passMarksRequired,
    Badge: entry.meritBadge && entry.meritBadge !== 'NONE' ? entry.meritBadge : '',
    Teacher: entry.teacherName || '',
    Subjects: entry.subjects?.map((s) => `${s.name} ${s.obtainedMarks}/${s.maxMarks}`).join('; ') || '',
    Result: !entry.submitted ? 'Pending' : entry.passed ? 'Passed' : 'Failed',
    'Submitted At': entry.submittedAt ? entry.submittedAt.slice(0, 16).replace('T', ' ') : '',
    Correct: entry.correctCount ?? '',
    Partial: entry.partialCount ?? '',
    Wrong: entry.wrongCount ?? '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Merit List');
  XLSX.writeFile(wb, filename);
}
