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

/** Formal A4 header — same language as admission application forms. */
function drawHeader(pdf: jsPDF, data: PdfData, colors: typeof TEMPLATE_COLORS.PRIMARY, yStart: number) {
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 12;
  const boxW = pageW - margin * 2;

  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(1.2);
  pdf.rect(margin, yStart, boxW, 273);

  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(0.6);
  pdf.line(margin + 2, yStart + 34, margin + boxW - 2, yStart + 34);

  if (data.config?.headerLogoData) {
    addImageIfPresent(pdf, data.config.headerLogoData, margin + 4, yStart + 4, 22, 22);
  } else {
    pdf.setDrawColor(180, 180, 180);
    pdf.rect(margin + 4, yStart + 4, 22, 22);
    pdf.setFontSize(6);
    pdf.setTextColor(150, 150, 150);
    pdf.text('LOGO', margin + 15, yStart + 16, { align: 'center' });
  }

  if (data.config?.schoolSealData) {
    addImageIfPresent(pdf, data.config.schoolSealData, pageW - margin - 26, yStart + 4, 20, 20);
  }

  pdf.setTextColor(...colors.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(data.config?.schoolName || 'School Name', pageW / 2, yStart + 10, { align: 'center' });
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  const addr = pdf.splitTextToSize(data.config?.schoolAddress || '', 120);
  pdf.text(addr, pageW / 2, yStart + 16, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...colors.primary);
  pdf.text(
    data.result.templateType === 'BOARD' ? 'BOARD MARKSHEET NOTICE' : 'STUDENT REPORT CARD',
    pageW / 2,
    yStart + 26,
    { align: 'center' },
  );
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text(`${data.result.examinationName} · Academic Year ${data.result.academicYear}`, pageW / 2, yStart + 31, { align: 'center' });

  return yStart + 40;
}

function drawInfoRow(
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW: number,
  valueW: number,
  rowH: number,
) {
  pdf.setDrawColor(100, 100, 100);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(x, y, labelW, rowH, 'FD');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x + labelW, y, valueW, rowH, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(70, 70, 70);
  pdf.text(label, x + 2, y + 4.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(20, 20, 20);
  pdf.text(value || '—', x + labelW + 2, y + 4.5);
}

function drawStudentInfo(pdf: jsPDF, data: PdfData, y: number) {
  const margin = 16;
  const pageW = pdf.internal.pageSize.getWidth();
  const totalW = pageW - margin * 2;
  const labelW = 38;
  const valueW = totalW - labelW;
  const rowH = 7;
  const rows: [string, string][] = [
    ['Student Name', data.result.studentName],
    ['Admission No.', data.result.admissionNumber],
    ['Class / Section', `${data.result.className} — ${data.result.sectionName}`],
    ['Examination', data.result.examinationName],
    ['Father / Mother', `${data.student.fatherName || '—'} / ${data.student.motherName || '—'}`],
  ];
  for (const [label, value] of rows) {
    drawInfoRow(pdf, label, value, margin, y, labelW, valueW, rowH);
    y += rowH;
  }
  return y + 6;
}

function drawSubjectTable(
  pdf: jsPDF,
  data: PdfData,
  colors: typeof TEMPLATE_COLORS.PRIMARY,
  y: number,
  compact = false,
) {
  const margin = 16;
  const colW = compact ? [70, 30, 30, 28] : [78, 34, 34, 30];
  const headers = compact ? ['Subject', 'Obtained', 'Max', 'Grade'] : ['Subject', 'Marks Obtained', 'Max Marks', 'Grade'];
  const rowH = compact ? 6.5 : 7.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(40, 40, 40);
  pdf.text('SCHOLASTIC PERFORMANCE', margin, y);
  y += 4;

  pdf.setFillColor(...colors.primary);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(compact ? 7 : 8);
  let x = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.rect(x, y, colW[i], rowH, 'F');
    pdf.text(headers[i], x + 2, y + 5);
    x += colW[i];
  }
  y += rowH;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 30, 30);
  const scores = data.result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[];
  for (const row of scores) {
    x = margin;
    const cells = [row.subjectName, String(row.obtained), String(row.max), row.grade];
    for (let i = 0; i < cells.length; i++) {
      pdf.setDrawColor(150, 150, 150);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x, y, colW[i], rowH, 'FD');
      pdf.text(cells[i], x + 2, y + 5);
      x += colW[i];
    }
    y += rowH;
  }

  // Totals row
  x = margin;
  pdf.setFillColor(248, 250, 252);
  pdf.setFont('helvetica', 'bold');
  const totalCells = [
    'Total',
    String(data.result.totalObtained),
    String(data.result.totalMax),
    `${data.result.percentage}%`,
  ];
  for (let i = 0; i < totalCells.length; i++) {
    pdf.setDrawColor(100, 100, 100);
    pdf.rect(x, y, colW[i], rowH, 'FD');
    pdf.text(totalCells[i], x + 2, y + 5);
    x += colW[i];
  }
  y += rowH + 5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(40, 40, 40);
  if (!compact) {
    pdf.text(
      `Grade: ${data.result.grade}   |   GPA: ${data.result.gpa}   |   Rank: ${data.result.rank}   |   ${data.result.overallPerformance}`,
      margin,
      y,
    );
    y += 5;
  }
  pdf.setDrawColor(150, 150, 150);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, colW.reduce((a, b) => a + b, 0), 12, 'FD');
  pdf.setFontSize(7.5);
  const remark = pdf.splitTextToSize(`Remarks: ${data.result.remarks || data.result.overallPerformance}`, colW.reduce((a, b) => a + b, 0) - 4);
  pdf.text(remark, margin + 2, y + 4);
  y += 16;
  return y;
}

function drawSignatures(pdf: jsPDF, data: PdfData, y: number) {
  const margin = 16;
  const pageW = pdf.internal.pageSize.getWidth();
  const cols = [
    { label: 'Class Teacher', x: margin, sig: data.config?.classTeacherSignatureData },
    { label: data.config?.principalName || 'Principal', x: pageW / 2 - 25, sig: data.config?.principalSignatureData },
    { label: 'School Seal', x: pageW - margin - 50, sig: data.config?.schoolSealData },
  ];

  if (y > 245) {
    pdf.addPage();
    y = 20;
  }

  pdf.setDrawColor(120, 120, 120);
  pdf.line(margin, y, pageW - margin, y);
  y += 6;

  for (const col of cols) {
    if (col.sig) {
      addImageIfPresent(pdf, col.sig, col.x + 5, y, 35, 12);
    }
    pdf.line(col.x, y + 14, col.x + 45, y + 14);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(40, 40, 40);
    pdf.text(col.label, col.x + 22.5, y + 18, { align: 'center' });
  }

  y += 24;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    data.config?.footerNote
      || 'This is a computer-generated report card. Parent signature acknowledging receipt is required.',
    pageW / 2,
    y,
    { align: 'center' },
  );
  return y;
}

function renderPrePrimary(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.PRE_PRIMARY;
  let y = drawHeader(pdf, data, colors, 10);
  y = drawStudentInfo(pdf, data, y);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(40, 40, 40);
  pdf.text('DEVELOPMENTAL ASSESSMENT', 16, y);
  y += 4;

  const margin = 16;
  const colW = [120, 52];
  pdf.setFillColor(...colors.primary);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.rect(margin, y, colW[0], 7, 'F');
  pdf.rect(margin + colW[0], y, colW[1], 7, 'F');
  pdf.text('Learning Area', margin + 2, y + 5);
  pdf.text('Grade', margin + colW[0] + 2, y + 5);
  y += 7;

  const scores = data.result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[];
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 30, 30);
  for (const row of scores) {
    pdf.setDrawColor(150, 150, 150);
    pdf.rect(margin, y, colW[0], 7);
    pdf.rect(margin + colW[0], y, colW[1], 7);
    pdf.text(row.subjectName, margin + 2, y + 5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.primary);
    pdf.text(row.grade, margin + colW[0] + 2, y + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 30, 30);
    y += 7;
  }

  y += 6;
  pdf.setDrawColor(150, 150, 150);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, 172, 14, 'FD');
  pdf.setFontSize(7.5);
  pdf.setTextColor(40, 40, 40);
  const remark = pdf.splitTextToSize(
    `Teacher remark: ${data.result.remarks || data.result.overallPerformance}`,
    168,
  );
  pdf.text(remark, margin + 2, y + 5);
  y += 20;
  drawSignatures(pdf, data, y);
}

function renderPrimary(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.PRIMARY;
  let y = drawHeader(pdf, data, colors, 10);
  y = drawStudentInfo(pdf, data, y);
  y = drawSubjectTable(pdf, data, colors, y, false);
  drawSignatures(pdf, data, y);
}

function renderMiddle(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.MIDDLE;
  let y = drawHeader(pdf, data, colors, 10);
  y = drawStudentInfo(pdf, data, y);

  const margin = 16;
  const cellW = 57;
  pdf.setDrawColor(150, 150, 150);
  pdf.setFillColor(248, 250, 252);
  [
    ['GPA', String(data.result.gpa)],
    ['Percentage', `${data.result.percentage}%`],
    ['Class Rank', String(data.result.rank)],
  ].forEach(([label, value], i) => {
    const x = margin + i * cellW;
    pdf.rect(x, y, cellW, 12, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.text(label, x + cellW / 2, y + 4, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.primary);
    pdf.text(value, x + cellW / 2, y + 10, { align: 'center' });
  });
  y += 16;

  y = drawSubjectTable(pdf, data, colors, y, false);
  drawSignatures(pdf, data, y);
}

function renderUpper(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.UPPER;
  let y = drawHeader(pdf, data, colors, 10);
  y = drawStudentInfo(pdf, data, y);

  const margin = 16;
  const cellW = 57;
  pdf.setDrawColor(150, 150, 150);
  pdf.setFillColor(248, 250, 252);
  [
    ['CGPA', String(data.result.gpa)],
    ['Percentage', `${data.result.percentage}%`],
    ['Class Rank', String(data.result.rank)],
  ].forEach(([label, value], i) => {
    const x = margin + i * cellW;
    pdf.rect(x, y, cellW, 12, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.text(label, x + cellW / 2, y + 4, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.primary);
    pdf.text(value, x + cellW / 2, y + 10, { align: 'center' });
  });
  y += 16;

  y = drawSubjectTable(pdf, data, colors, y, true);
  drawSignatures(pdf, data, y);
}

function renderBoard(pdf: jsPDF, data: PdfData) {
  const colors = TEMPLATE_COLORS.BOARD;
  let y = drawHeader(pdf, data, colors, 10);
  y = drawStudentInfo(pdf, data, y);

  pdf.setFillColor(...colors.bg);
  pdf.setDrawColor(...colors.primary);
  pdf.rect(16, y, 178, 36, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.primary);
  pdf.text('Class 5, 8, 10, 12 — Government board marksheet', 20, y + 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(60, 60, 60);
  const notice = data.config?.boardExamNotice
    || 'Marksheet for this class is issued by the Board of Education as per government rules. Upload the official board marksheet from the Board Exam tab.';
  const lines = pdf.splitTextToSize(notice, 170);
  pdf.text(lines, 20, y + 18);
  y += 44;

  drawSignatures(pdf, data, y);
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
