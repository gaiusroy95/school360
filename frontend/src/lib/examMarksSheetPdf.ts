import { jsPDF } from 'jspdf';

export type ExaminerPdfPayload = {
  examinationName: string;
  className: string;
  sectionName: string;
  subjectName: string;
  examinerName: string;
  submittedAtDisplay: string;
  enabledMaxTotal: number;
  columns: { key: string; label: string; maxMarks: number }[];
  rows: {
    studentName: string;
    admissionNumber: string;
    columns: { label: string; maxMarks: number; marksObtained: string | number; graceMarks: number }[];
    totalObtained: number;
    totalMax: number;
    overallGrade: string;
  }[];
};

export function downloadExaminerMarkSheetPdf(data: ExaminerPdfPayload, fileName?: string) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('Subject-wise Examiner Mark Sheet', pageW / 2, y, { align: 'center' });
  y += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const meta = [
    `Examination: ${data.examinationName}`,
    `Class & Section: ${data.className} — ${data.sectionName}`,
    `Subject: ${data.subjectName}`,
    `Examiner: ${data.examinerName}`,
    `Submitted: ${data.submittedAtDisplay}`,
  ];
  for (const line of meta) {
    pdf.text(line, margin, y);
    y += 4.5;
  }
  y += 4;

  const enabledCols = data.columns;
  const colWidths = [50, ...enabledCols.map(() => 22), 24, 18];
  const headers = ['Student Name', ...enabledCols.map((c) => c.label), 'Total', 'Grade'];
  const maxRow = ['Max. Marks', ...enabledCols.map((c) => String(c.maxMarks)), String(data.enabledMaxTotal), ''];

  pdf.setFillColor(200, 220, 240);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);

  let x = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.rect(x, y, colWidths[i], 6, 'F');
    pdf.text(maxRow[i] || '', x + 1, y + 4);
    x += colWidths[i];
  }
  y += 6;

  x = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.rect(x, y, colWidths[i], 6, 'F');
    pdf.text(headers[i], x + 1, y + 4);
    x += colWidths[i];
  }
  y += 6;

  pdf.setFont('helvetica', 'normal');
  for (const row of data.rows) {
    if (y > 185) {
      pdf.addPage();
      y = margin;
    }
    x = margin;
    const cells = [
      row.studentName,
      ...row.columns.map((c) => String(c.marksObtained)),
      String(row.totalObtained),
      row.overallGrade,
    ];
    for (let i = 0; i < cells.length; i++) {
      pdf.rect(x, y, colWidths[i], 5.5);
      pdf.text(cells[i].slice(0, i === 0 ? 28 : 8), x + 1, y + 4);
      x += colWidths[i];
    }
    y += 5.5;
  }

  y += 10;
  if (y > 180) { pdf.addPage(); y = margin; }
  pdf.setFont('helvetica', 'normal');
  pdf.text('Examiner Signature: _______________________________', margin, y);
  y += 6;
  pdf.text(`Date: ${data.submittedAtDisplay}`, margin, y);

  const safeName = `${data.subjectName}_${data.className}`.replace(/[^\w-]+/g, '_');
  pdf.save(fileName || `Examiner_MarkSheet_${safeName}.pdf`);
}
