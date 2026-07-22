import { jsPDF } from 'jspdf';
import type { StudentAdmissionFormData } from './studentAdmissionFormTypes';
import { fullName } from './studentAdmissionFormTypes';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from './StudentAdmissionFormPreview';
import { captureElementToCanvas } from '../../../lib/html2canvasCapture';

export async function downloadAdmissionFormPdf(
  page1El: HTMLElement,
  page2El: HTMLElement,
  form: StudentAdmissionFormData,
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const pages = [page1El, page2El];

  for (let i = 0; i < pages.length; i++) {
    const el = pages[i];
    // Brief pause so flex layout / fonts settle before capture
    await new Promise((r) => setTimeout(r, 80));

    const canvas = await captureElementToCanvas(el, {
      scale: 2,
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
      windowWidth: A4_WIDTH_PX,
      windowHeight: A4_HEIGHT_PX,
    });

    const img = canvas.toDataURL('image/png');
    if (i > 0) pdf.addPage();
    // Fill the entire A4 page edge-to-edge for print-ready output
    pdf.addImage(img, 'PNG', 0, 0, pageW, pageH);
  }

  const safeName = fullName(form).replace(/[^a-zA-Z0-9]+/g, '_') || 'Student';
  pdf.save(`Admission_Application_${safeName}.pdf`);
}
