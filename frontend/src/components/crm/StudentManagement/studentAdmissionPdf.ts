import { jsPDF } from 'jspdf';
import type { StudentAdmissionFormData } from './studentAdmissionFormTypes';
import { fullName } from './studentAdmissionFormTypes';
import { captureElementToCanvas } from '../../../lib/html2canvasCapture';

export async function downloadAdmissionFormPdf(
  page1El: HTMLElement,
  page2El: HTMLElement,
  form: StudentAdmissionFormData,
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;

  for (let i = 0; i < 2; i++) {
    const el = i === 0 ? page1El : page2El;
    const canvas = await captureElementToCanvas(el, { scale: 2.5 });
    const img = canvas.toDataURL('image/png');
    const imgH = (canvas.height * contentW) / canvas.width;
    if (i > 0) pdf.addPage();
    pdf.addImage(img, 'PNG', margin, margin, contentW, Math.min(imgH, pageH - margin * 2));
  }

  const safeName = fullName(form).replace(/[^a-zA-Z0-9]+/g, '_') || 'Student';
  pdf.save(`Admission_Application_${safeName}.pdf`);
}
