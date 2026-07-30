import { jsPDF } from 'jspdf';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { SchoolBranding, StudentAdmissionFormData } from './studentAdmissionFormTypes';
import { fullName } from './studentAdmissionFormTypes';
import {
  AdmissionFormPage1,
  AdmissionFormPage2,
  A4_WIDTH_PX,
} from './StudentAdmissionFormPreview';
import { captureElementToCanvas } from '../../../lib/html2canvasCapture';

async function renderExportPageToCanvas(
  page: 1 | 2,
  form: StudentAdmissionFormData,
  school: SchoolBranding,
): Promise<HTMLCanvasElement> {
  const host = document.createElement('div');
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${A4_WIDTH_PX}px`,
    'opacity:0.01',
    'pointer-events:none',
    'z-index:-1',
    'overflow:visible',
    'background:#ffffff',
  ].join(';');
  document.body.appendChild(host);

  const root = createRoot(host);
  const Page = page === 1 ? AdmissionFormPage1 : AdmissionFormPage2;
  root.render(createElement(Page, { form, school, exportMode: true }));

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 300));

  try {
    const pageEl = host.querySelector('[data-admission-page]') as HTMLElement | null;
    if (!pageEl) throw new Error('Failed to render admission form page for PDF');

    const contentHeight = Math.max(pageEl.scrollHeight, pageEl.offsetHeight);
    host.style.height = `${contentHeight}px`;

    return await captureElementToCanvas(pageEl, {
      scale: 2,
      width: A4_WIDTH_PX,
      height: contentHeight,
      windowWidth: A4_WIDTH_PX,
      windowHeight: contentHeight,
      backgroundColor: '#ffffff',
    });
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function downloadAdmissionFormPdf(
  form: StudentAdmissionFormData,
  school: SchoolBranding,
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 1; i <= 2; i++) {
    const canvas = await renderExportPageToCanvas(i as 1 | 2, form, school);
    const img = canvas.toDataURL('image/png');
    let renderW = pageW;
    let renderH = (canvas.height * pageW) / canvas.width;
    if (renderH > pageH) {
      renderH = pageH;
      renderW = (canvas.width * pageH) / canvas.height;
    }
    const x = (pageW - renderW) / 2;
    if (i > 1) pdf.addPage();
    pdf.addImage(img, 'PNG', x, 0, renderW, renderH);
  }

  const safeName = fullName(form).replace(/[^a-zA-Z0-9]+/g, '_') || 'Student';
  pdf.save(`Admission_Application_${safeName}.pdf`);
}
