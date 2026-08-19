import { jsPDF } from 'jspdf';

export type PayslipPdfComponent = { name: string; amount: number };
export type PayslipPdfLeave = { code: string; label: string; entitled: number; available: number };

export type PayslipPdfData = {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  affiliationNo?: string;
  registrationNo?: string;
  payPeriod: string;
  slipNumber?: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  panNumber?: string;
  bankAccount?: string;
  uanNumber?: string;
  pfNumber?: string;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  earnings: PayslipPdfComponent[];
  deductions: PayslipPdfComponent[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status?: string;
  leaveSummary?: PayslipPdfLeave[];
};

export type PayslipPdfOptions = {
  includeEarnings?: boolean;
  includeDeductions?: boolean;
  includeLeaveSummary?: boolean;
  includeAttendanceSummary?: boolean;
  includeCompanyDetails?: boolean;
};

function inr(n: number) {
  return `Rs ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safe(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function drawTableHeader(pdf: jsPDF, x: number, y: number, w: number, label: string, fill: [number, number, number]) {
  pdf.setFillColor(...fill);
  pdf.rect(x, y, w, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(label, x + 3, y + 5);
  pdf.setTextColor(0, 0, 0);
}

function drawAmountRows(
  pdf: jsPDF,
  rows: PayslipPdfComponent[],
  x: number,
  y: number,
  w: number,
  emptyLabel: string,
) {
  let cursor = y;
  if (!rows.length) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(emptyLabel, x + 3, cursor + 5);
    pdf.setTextColor(0, 0, 0);
    return cursor + 8;
  }
  for (const row of rows) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(row.name, x + 3, cursor + 5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(inr(row.amount), x + w - 3, cursor + 5, { align: 'right' });
    cursor += 6;
  }
  return cursor;
}

/** Printable employee salary slip using Institution Setup letterhead. */
export function downloadPayslipPdf(preview: PayslipPdfData, options: PayslipPdfOptions = {}) {
  const includeEarnings = options.includeEarnings !== false;
  const includeDeductions = options.includeDeductions !== false;
  const includeLeaveSummary = options.includeLeaveSummary !== false;
  const includeAttendanceSummary = options.includeAttendanceSummary !== false;
  const includeCompanyDetails = options.includeCompanyDetails !== false;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 16;

  pdf.setDrawColor(30, 64, 175);
  pdf.setLineWidth(0.8);
  pdf.rect(margin - 2, 10, contentW + 4, 277);

  if (includeCompanyDetails) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(30, 64, 175);
    pdf.text(preview.schoolName || 'School', pageW / 2, y, { align: 'center' });
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    if (preview.schoolAddress) {
      const addr = pdf.splitTextToSize(preview.schoolAddress, contentW - 8);
      pdf.text(addr, pageW / 2, y, { align: 'center' });
      y += addr.length * 4;
    }
    const contact = [preview.schoolPhone ? `Ph: ${preview.schoolPhone}` : '', preview.schoolEmail || '']
      .filter(Boolean)
      .join('  ·  ');
    if (contact) {
      pdf.text(contact, pageW / 2, y, { align: 'center' });
      y += 4;
    }
    const affiliation = [
      preview.affiliationNo ? `Affiliation: ${preview.affiliationNo}` : '',
      preview.registrationNo ? `Reg. No: ${preview.registrationNo}` : '',
    ]
      .filter(Boolean)
      .join('  ·  ');
    if (affiliation) {
      pdf.text(affiliation, pageW / 2, y, { align: 'center' });
      y += 4;
    }
    y += 2;
  }

  pdf.setFillColor(30, 64, 175);
  pdf.rect(margin, y, contentW, 9, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Salary Slip — ${preview.payPeriod}`, pageW / 2, y + 6, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 14;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  const details: Array<[string, string]> = [
    ['Employee Name', safe(preview.employeeName)],
    ['Employee Code', safe(preview.employeeCode)],
    ['Department', safe(preview.department)],
    ['Designation', safe(preview.designation)],
    ['PAN', safe(preview.panNumber)],
    ['Bank A/c', safe(preview.bankAccount)],
    ['UAN', safe(preview.uanNumber)],
    ['PF No.', safe(preview.pfNumber)],
    ['Slip No.', safe(preview.slipNumber)],
    ['Status', safe(preview.status)],
  ];
  const colW = contentW / 2;
  for (let i = 0; i < details.length; i += 2) {
    const left = details[i];
    const right = details[i + 1];
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100);
    pdf.text(`${left[0]}:`, margin, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(left[1], margin + 32, y);
    if (right) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(`${right[0]}:`, margin + colW, y);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(right[1], margin + colW + 28, y);
    }
    y += 5.5;
  }

  if (includeAttendanceSummary) {
    y += 2;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, y, contentW, 10, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    const attY = y + 6.5;
    pdf.text(`Working Days: ${preview.workingDays}`, margin + 4, attY);
    pdf.text(`Present: ${preview.presentDays}`, margin + contentW / 3, attY);
    pdf.text(`Leave: ${preview.leaveDays}`, margin + (contentW * 2) / 3, attY);
    y += 14;
  } else {
    y += 4;
  }

  const tableTop = y;
  const half = (contentW - 4) / 2;
  let leftBottom = tableTop + 7;
  let rightBottom = tableTop + 7;

  if (includeEarnings) {
    drawTableHeader(pdf, margin, tableTop, half, 'Earnings', [22, 163, 74]);
    leftBottom = drawAmountRows(pdf, preview.earnings, margin, tableTop + 7, half, 'No earnings');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, tableTop, half, Math.max(leftBottom, rightBottom) - tableTop);
  }

  if (includeDeductions) {
    const dx = margin + half + 4;
    drawTableHeader(pdf, dx, tableTop, half, 'Deductions', [220, 38, 38]);
    rightBottom = drawAmountRows(pdf, preview.deductions, dx, tableTop + 7, half, 'No deductions');
  }

  const tableBottom = Math.max(leftBottom, rightBottom, tableTop + 14) + 2;
  if (includeEarnings) {
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, tableTop, half, tableBottom - tableTop);
  }
  if (includeDeductions) {
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin + half + 4, tableTop, half, tableBottom - tableTop);
  }
  y = tableBottom + 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Gross Earnings: ${inr(preview.grossEarnings)}`, margin, y);
  pdf.text(`Total Deductions: ${inr(preview.totalDeductions)}`, margin + contentW / 2, y, { align: 'left' });
  y += 8;

  pdf.setFillColor(220, 252, 231);
  pdf.rect(margin, y, contentW, 10, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(22, 101, 52);
  pdf.text('Net Pay', margin + 4, y + 6.5);
  pdf.text(inr(preview.netPay), margin + contentW - 4, y + 6.5, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
  y += 16;

  if (includeLeaveSummary && preview.leaveSummary?.length) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Leave Summary', margin, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    for (const leave of preview.leaveSummary) {
      pdf.text(
        `${leave.code} — ${leave.label}: Entitled ${leave.entitled}  ·  Available ${leave.available}`,
        margin,
        y,
      );
      y += 4.5;
    }
    y += 2;
  }

  pdf.setDrawColor(203, 213, 225);
  pdf.line(margin, y, margin + contentW, y);
  y += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100);
  pdf.text('This is a computer-generated payslip. No signature is required.', margin, y);
  y += 4;
  pdf.text(`Generated ${new Date().toLocaleString('en-IN')} — HR & Payroll`, margin, y);

  const code = preview.employeeCode.replace(/[^\w-]+/g, '_');
  const period = preview.payPeriod.replace(/\s+/g, '_');
  pdf.save(`Payslip_${code}_${period}.pdf`);
}
