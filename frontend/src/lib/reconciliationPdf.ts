import { jsPDF } from 'jspdf';
import type { PaymentReconciliationRecord } from './feeFinanceServices';

function inr(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawTable(
  pdf: jsPDF,
  startY: number,
  title: string,
  headers: string[],
  rows: string[][],
  colWidths: number[],
) {
  const margin = 12;
  let y = startY;
  const pageH = pdf.internal.pageSize.getHeight();

  if (y > pageH - 40) {
    pdf.addPage();
    y = 16;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(title, margin, y);
  y += 5;

  pdf.setFontSize(7);
  let x = margin;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, y, colWidths.reduce((a, b) => a + b, 0), 6, 'F');
  headers.forEach((h, i) => {
    pdf.text(h, x + 1, y + 4);
    x += colWidths[i];
  });
  y += 6;

  pdf.setFont('helvetica', 'normal');
  for (const row of rows) {
    if (y > pageH - 16) {
      pdf.addPage();
      y = 16;
    }
    x = margin;
    row.forEach((cell, i) => {
      pdf.text(String(cell).slice(0, 42), x + 1, y + 4);
      x += colWidths[i];
    });
    y += 5;
  }

  return y + 4;
}

export type ReconciliationPdfPayload = {
  institutionName: string;
  reconciliation: PaymentReconciliationRecord;
  generatedAt: string;
  printable?: boolean;
  approved?: boolean;
  approvedLabel?: string;
};

/** Download PDF; for approved day closings the report is stamped APPROVED. */
export function downloadReconciliationPdf(payload: ReconciliationPdfPayload) {
  const { institutionName, reconciliation: rec } = payload;
  const report = rec.report;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const approved = Boolean(payload.approved);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(institutionName, pageW / 2, 14, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text('Payment Reconciliation — Day Closing Report', pageW / 2, 20, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Date: ${rec.reconciliationDate}  |  Status: ${rec.status.replace(/_/g, ' ')}`, pageW / 2, 26, {
    align: 'center',
  });

  if (approved) {
    pdf.setTextColor(22, 101, 52);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(payload.approvedLabel || 'APPROVED', pageW / 2, 31, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
  }

  let y = approved ? 36 : 32;

  y = drawTable(
    pdf,
    y,
    'Openings',
    ['Particular', 'Amount'],
    report.openings.map((r) => [r.label, inr(r.amount)]),
    [120, 60],
  );

  y = drawTable(
    pdf,
    y,
    'Cash Movement',
    ['Particular', 'Amount'],
    report.cashMovement.map((r) => [r.label, inr(r.amount)]),
    [120, 60],
  );

  y = drawTable(
    pdf,
    y,
    'Bank Movement',
    ['Particular', 'Amount'],
    report.bankMovement.map((r) => [r.label, inr(r.amount)]),
    [120, 60],
  );

  y = drawTable(
    pdf,
    y,
    'Collection Summary',
    ['Head', 'Cash', 'Online', 'Cheque', 'Bank', 'UPI', 'POS', 'Total'],
    report.collectionSummary.map((r) => [
      r.label,
      inr(r.cash),
      inr(r.online),
      inr(r.cheque),
      inr(r.bankTransfer),
      inr(r.upi),
      inr(r.pos),
      inr(r.total),
    ]),
    [36, 18, 18, 18, 18, 16, 16, 20],
  );

  y = drawTable(
    pdf,
    y,
    'Reconciliation Summary',
    ['Description', 'Amount'],
    report.reconciliationSummary.map((r) => [r.label, inr(r.amount)]),
    [120, 60],
  );

  y = drawTable(
    pdf,
    y,
    'System Verification',
    ['Particular', 'Amount'],
    report.systemVerification.map((r) => [r.label, inr(r.amount)]),
    [120, 60],
  );

  if (report.syncSources) {
    const s = report.syncSources;
    y = drawTable(
      pdf,
      y,
      'Synced Sources',
      ['Source', 'Count / Amount'],
      [
        ['Fee receipts (collections)', String(s.feeReceipts)],
        ['Invoice payments (no linked receipt)', String(s.invoicePayments)],
        ['Transport collections', String(s.transportCollections)],
        ['Hostel collections', String(s.hostelCollections)],
        ['Paid fines', String(s.paidFines)],
        ['Bank cash deposits', `${s.cashBankDeposits} / ${inr(s.systemCashDeposited)}`],
        ['Cheque deposit slips', `${s.chequeBankDeposits} / ${inr(s.systemChequeDeposited)}`],
        ['Online / UPI / POS gateway', inr(s.systemOnlineGateway)],
      ],
      [100, 80],
    );
  }

  if (rec.approvals.length) {
    if (y > pdf.internal.pageSize.getHeight() - 30) {
      pdf.addPage();
      y = 16;
    }
    y = drawTable(
      pdf,
      y,
      'Approval Trail & Digital Signatures',
      ['Stage', 'Action', 'By', 'Signature', 'Date'],
      rec.approvals.map((a) => [
        a.stage.replace(/_/g, ' '),
        a.action.replace(/_/g, ' '),
        a.actorName,
        a.digitalSignature.slice(0, 28),
        new Date(a.signedAt).toLocaleString('en-IN'),
      ]),
      [30, 24, 28, 50, 38],
    );
  }

  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text(
    `Generated ${new Date(payload.generatedAt).toLocaleString('en-IN')} — Accounts department printout`,
    12,
    pdf.internal.pageSize.getHeight() - 8,
  );

  const suffix = approved ? 'Approved' : 'Draft';
  pdf.save(`Payment_Reconciliation_${rec.reconciliationDate}_${suffix}.pdf`);
}

/** Browser print dialog for approved reconciliation (accounts printout). */
export function printReconciliationPdf(payload: ReconciliationPdfPayload) {
  downloadReconciliationPdf(payload);
}
