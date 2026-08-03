import { jsPDF } from 'jspdf';
import type { TransportFeeCollection } from './feeFinanceServices';

function inr(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Printable transport fee deposit receipt. */
export function downloadTransportFeeReceiptPdf(
  record: TransportFeeCollection,
  opts?: { institutionName?: string },
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const institutionName = opts?.institutionName || 'Institution';

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(institutionName, pageW / 2, 18, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text('Transport Fee Receipt', pageW / 2, 26, { align: 'center' });

  pdf.setTextColor(22, 101, 52);
  pdf.setFontSize(10);
  pdf.text('DEPOSITED', pageW / 2, 32, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  let y = 42;
  const lines: Array<[string, string]> = [
    ['Receipt No', record.receiptNumber],
    ['Student', record.studentName || '—'],
    ['Admission No', record.admissionNumber || '—'],
    ['Class / Section', [record.className, record.sectionName].filter(Boolean).join(' · ') || '—'],
    ['Route', record.routeName || '—'],
    ['Month', record.monthLabel || '—'],
    ['Academic Year', record.academicYear],
    ['Total Due Fees', inr(record.totalDueFees || 0)],
    ['Amount Deposited', inr(record.amount)],
    ['Payment Mode', record.paymentMode || '—'],
    ['Collected By', record.collectedBy || '—'],
    [
      'Collected At',
      record.collectedAt ? new Date(record.collectedAt).toLocaleString('en-IN') : '—',
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
    `Generated ${new Date().toLocaleString('en-IN')} — Transport fee deposit receipt`,
    20,
    y,
  );

  pdf.save(`Transport_Fee_Receipt_${record.receiptNumber}.pdf`);
}
