import { jsPDF } from 'jspdf';
import type { FeeDiscount } from './feeFinanceServices';

function inr(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Printable approved Account Settlement receipt for accounts. */
export function downloadSettlementReceiptPdf(
  record: FeeDiscount,
  opts?: { institutionName?: string },
) {
  if (record.scope !== 'ACCOUNT_SETTLEMENT') {
    throw new Error('Only account settlements can print a settlement receipt');
  }
  if (record.status !== 'APPROVED') {
    throw new Error('Only approved settlements can be printed');
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const institutionName = opts?.institutionName || 'Institution';

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(institutionName, pageW / 2, 18, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text('Account Settlement Receipt', pageW / 2, 26, { align: 'center' });

  pdf.setTextColor(22, 101, 52);
  pdf.setFontSize(10);
  pdf.text('APPROVED', pageW / 2, 32, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  let y = 42;
  const lines: Array<[string, string]> = [
    ['Settlement Code', record.code],
    ['Student', record.studentName || '—'],
    ['Admission No', record.admissionNumber || '—'],
    ['Academic Year', record.academicYear],
    ['Settlement Amount', inr(record.settlementAmount)],
    ['Reason', record.remarks || '—'],
    ['Description', record.description || '—'],
    ['Requested By', record.requestedBy || '—'],
    ['Approved By', record.approvedBy || '—'],
    [
      'Approved At',
      record.approvedAt ? new Date(record.approvedAt).toLocaleString('en-IN') : '—',
    ],
  ];

  for (const [label, value] of lines) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, 20, y);
    pdf.setFont('helvetica', 'normal');
    const wrapped = pdf.splitTextToSize(String(value), 110);
    pdf.text(wrapped, 70, y);
    y += Math.max(8, wrapped.length * 5);
  }

  y += 8;
  pdf.setDrawColor(180);
  pdf.line(20, y, pageW - 20, y);
  y += 10;
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text(
    `Generated ${new Date().toLocaleString('en-IN')} — Accounts department printout`,
    20,
    y,
  );

  pdf.save(`Settlement_Receipt_${record.code}.pdf`);
}
