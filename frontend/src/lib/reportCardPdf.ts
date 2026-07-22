import { jsPDF } from 'jspdf';
import type { ReportCardPreviewData, ReportCardTemplate } from './examinationServices';

type PdfData = ReportCardPreviewData;

const TEMPLATE_COLORS: Record<ReportCardTemplate, { primary: [number, number, number]; accent: [number, number, number]; bg: [number, number, number] }> = {
  PRE_PRIMARY: { primary: [236, 72, 153], accent: [251, 191, 36], bg: [253, 242, 248] },
  PRIMARY: { primary: [37, 99, 235], accent: [59, 130, 246], bg: [239, 246, 255] },
  MIDDLE: { primary: [5, 150, 105], accent: [16, 185, 129], bg: [236, 253, 245] },
  UPPER: { primary: [124, 58, 237], accent: [139, 92, 246], bg: [245, 243, 255] },
  BOARD: { primary: [180, 83, 9], accent: [217, 119, 6], bg: [255, 251, 235] },
};

function addImageIfPresent(pdf: jsPDF, data: string, x: number, y: number, w: number, h: number) {
  if (!data) return;
  try {
    const fmt = data.startsWith('/9j') ? 'JPEG' : 'PNG';
    pdf.addImage(`data:image/${fmt.toLowerCase()};base64,${data}`, fmt, x, y, w, h);
  } catch {
    // skip invalid image data
  }
}

function drawHeader(pdf: jsPDF, data: PdfData, colors: typeof TEMPLATE_COLORS.PRIMARY, yStart: number) {
  const pageW = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(...colors.bg);
  pdf.rect(10, yStart, pageW - 20, 38, 'F');
  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(0.8);
  pdf.rect(10, yStart, pageW - 20, 38);

  if (data.config?.headerLogoData) {
    addImageIfPresent(pdf, data.config.headerLogoData, 14, yStart + 4, 18, 18);
  }

  pdf.setTextColor(...colors.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(data.config?.schoolName || 'School Name', pageW / 2, yStart + 12, { align: 'center' });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text(data.config?.schoolAddress || '', pageW / 2, yStart + 18, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...colors.primary);
  pdf.text('REPORT CARD', pageW / 2, yStart + 28, { align: 'center' });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text(`${data.result.examinationName} · ${data.result.academicYear}`, pageW / 2, yStart + 34, { align: 'center' });

  return yStart + 44;
}

function drawStudentInfo(pdf: jsPDF, data: PdfData, y: number) {
  const margin = 14;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(30, 30, 30);
  const lines = [
    [`Student Name: ${data.result.studentName}`, `Admission No: ${data.result.admissionNumber}`],
    [`Class: ${data.result.className} — ${data.result.sectionName}`, `DOB: ${data.student.dateOfBirth || '—'}`],
    [`Father: ${data.student.fatherName || '—'}`, `Mother: ${data.student.motherName || '—'}`],
  ];
  for (const [left, right] of lines) {
    pdf.text(left, margin, y);
    pdf.text(right, 110, y);
    y += 5.5;
  }
  return y + 4;
}

function drawSubjectTable(
  pdf: jsPDF,
  data: PdfData,
  colors: typeof TEMPLATE_COLORS.PRIMARY,
  y: number,
  compact = false,
) {
  const margin = 14;
  const pageW = pdf.internal.pageSize.getWidth();
  const colW = compact ? [70, 30, 30, 25] : [80, 35, 35, 30];
  const headers = compact ? ['Subject', 'Obtained', 'Max', 'Grade'] : ['Subject', 'Marks Obtained', 'Max Marks', 'Grade'];

  pdf.setFillColor(...colors.primary);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(compact ? 7 : 8);
  let x = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.rect(x, y, colW[i], 7, 'F');
    pdf.text(headers[i], x + 2, y + 5);
    x += colW[i];
  }
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 30, 30);
  const scores = data.result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[];
  for (const row of scores) {
    x = margin;
    const cells = [row.subjectName, String(row.obtained), String(row.max), row.grade];
    for (let i = 0; i < cells.length; i++) {
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(x, y, colW[i], compact ? 6 : 7);
      pdf.text(cells[i], x + 2, y + (compact ? 4 : 5));
      x += colW[i];
    }
    y += compact ? 6 : 7;
  }

  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(
    `Total: ${data.result.totalObtained} / ${data.result.totalMax}   |   Percentage: ${data.result.percentage}%   |   Grade: ${data.result.grade}`,
    margin, y,
  );
  y += 6;
  if (!compact) {
    pdf.setFont('helvetica', 'normal');
    pdf.text(`GPA: ${data.result.gpa}   |   Rank: ${data.result.rank}   |   ${data.result.overallPerformance}`, margin, y);
    y += 6;
    pdf.text(`Remarks: ${data.result.remarks}`, margin, y);
    y += 6;
  }
  return y;
}

function drawSignatures(pdf: jsPDF, data: PdfData, y: number) {
  const margin = 14;
  const pageW = pdf.internal.pageSize.getWidth();

  if (y > 240) { pdf.addPage(); y = 20; }

  if (data.config?.classTeacherSignatureData) {
    addImageIfPresent(pdf, data.config.classTeacherSignatureData, margin, y, 35, 12);
  }
  if (data.config?.principalSignatureData) {
    addImageIfPresent(pdf, data.config.principalSignatureData, pageW - 55, y, 35, 12);
  }
  if (data.config?.schoolSealData) {
    addImageIfPresent(pdf, data.config.schoolSealData, pageW / 2 - 12, y - 2, 24, 24);
  }

  y += 16;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(60, 60, 60);
  pdf.line(margin, y, margin + 50, y);
  pdf.line(pageW - 64, y, pageW - 14, y);
  pdf.text('Class Teacher', margin, y + 4);
  pdf.text(data.config?.principalName || 'Principal', pageW - 64, y + 4);
  y += 10;

  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text(data.config?.footerNote || '', pageW / 2, y, { align: 'center' });
  return y;
}

function renderPrePrimary(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.PRE_PRIMARY;
  let y = drawHeader(pdf, data, colors, 12);
  y = drawStudentInfo(pdf, data, y);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.primary);
  pdf.text('Learning Progress & Grades', 14, y);
  y += 6;

  const scores = data.result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[];
  for (const row of scores) {
    pdf.setFillColor(...colors.bg);
    pdf.roundedRect(14, y, 182, 10, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(50, 50, 50);
    pdf.text(row.subjectName, 18, y + 6.5);
    pdf.setTextColor(...colors.primary);
    pdf.text(`Grade: ${row.grade}`, 160, y + 6.5);
    y += 12;
  }

  y += 4;
  pdf.setFontSize(10);
  pdf.text(`Overall: ${data.result.overallPerformance} (${data.result.percentage}%)`, 14, y);
  y += 10;
  drawSignatures(pdf, data, y);
}

function renderPrimary(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.PRIMARY;
  let y = drawHeader(pdf, data, colors, 12);
  y = drawStudentInfo(pdf, data, y);
  y = drawSubjectTable(pdf, data, colors, y, false);
  drawSignatures(pdf, data, y);
}

function renderMiddle(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.MIDDLE;
  let y = drawHeader(pdf, data, colors, 12);
  y = drawStudentInfo(pdf, data, y);

  pdf.setFillColor(...colors.bg);
  pdf.roundedRect(14, y, 182, 14, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...colors.primary);
  pdf.text(`Rank: ${data.result.rank}`, 20, y + 9);
  pdf.text(`GPA: ${data.result.gpa}`, 80, y + 9);
  pdf.text(`Performance: ${data.result.overallPerformance}`, 130, y + 9);
  y += 20;

  y = drawSubjectTable(pdf, data, colors, y, false);
  drawSignatures(pdf, data, y);
}

function renderUpper(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.UPPER;
  let y = drawHeader(pdf, data, colors, 12);
  y = drawStudentInfo(pdf, data, y);

  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(0.5);
  pdf.line(14, y, 196, y);
  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.primary);
  pdf.text('Academic Performance Summary', 14, y);
  y += 8;

  const summary = [
    ['Aggregate Marks', `${data.result.totalObtained} / ${data.result.totalMax}`],
    ['Percentage', `${data.result.percentage}%`],
    ['Grade', data.result.grade],
    ['CGPA', String(data.result.gpa)],
    ['Class Rank', String(data.result.rank)],
    ['Result', data.result.remarks],
  ];
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  for (const [label, value] of summary) {
    pdf.setTextColor(80, 80, 80);
    pdf.text(label, 20, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text(value, 80, y);
    pdf.setFont('helvetica', 'normal');
    y += 6;
  }
  y += 4;
  y = drawSubjectTable(pdf, data, colors, y, true);
  drawSignatures(pdf, data, y);
}

function renderBoard(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.BOARD;
  let y = drawHeader(pdf, data, colors, 12);
  y = drawStudentInfo(pdf, data, y);

  pdf.setFillColor(...colors.bg);
  pdf.roundedRect(14, y, 182, 30, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.primary);
  pdf.text('Board Examination — Government Issued Marksheet', 20, y + 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 80);
  const notice = data.config?.boardExamNotice
    || 'Marksheet for this class is issued by the Board of Education as per government rules.';
  const lines = pdf.splitTextToSize(notice, 170);
  pdf.text(lines, 20, y + 18);
  y += 38;

  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 60);
  pdf.text('Upload the official board marksheet via the Board Exam tab in Report Cards.', 14, y);
  drawSignatures(pdf, data, y + 10);
}

export function downloadReportCardPdf(data: PdfData, fileName?: string) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const template = data.result.templateType;

  switch (template) {
    case 'PRE_PRIMARY': renderPrePrimary(pdf, data); break;
    case 'MIDDLE': renderMiddle(pdf, data); break;
    case 'UPPER': renderUpper(pdf, data); break;
    case 'BOARD': renderBoard(pdf, data); break;
    default: renderPrimary(pdf, data); break;
  }

  const safeName = data.result.studentName.replace(/[^\w-]+/g, '_');
  pdf.save(fileName || `ReportCard_${safeName}.pdf`);
}

export const TEMPLATE_PREVIEW_COLORS = TEMPLATE_COLORS;
