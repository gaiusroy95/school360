import { jsPDF } from 'jspdf';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { SchoolBranding, StudentAdmissionFormData } from './studentAdmissionFormTypes';
import { fullName } from './studentAdmissionFormTypes';
import {
  AdmissionFormPage1,
  AdmissionFormPage2,
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
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

    const contentHeight = Math.max(pageEl.scrollHeight, pageEl.offsetHeight, A4_HEIGHT_PX);
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

/**
 * Place a captured form canvas onto A4 pages at full page width.
 * If content is taller than one A4 page, additional pages are added (no shrink-to-fit).
 */
function appendCanvasAcrossA4Pages(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  options: { isFirstDocumentPage: boolean },
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Source pixels that fit one A4 page when drawn at full page width
  const pageHeightInSourcePx = (pageH / pageW) * canvas.width;

  let srcY = 0;
  let sliceIndex = 0;

  while (srcY < canvas.height - 0.5) {
    const sliceHeightPx = Math.min(pageHeightInSourcePx, canvas.height - srcY);
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.max(1, Math.ceil(sliceHeightPx));

    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create PDF page canvas');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      Math.floor(srcY),
      canvas.width,
      Math.ceil(sliceHeightPx),
      0,
      0,
      canvas.width,
      Math.ceil(sliceHeightPx),
    );

    const sliceImg = sliceCanvas.toDataURL('image/png');
    const renderH = (sliceCanvas.height * pageW) / sliceCanvas.width;

    if (sliceIndex > 0 || !options.isFirstDocumentPage) {
      pdf.addPage();
    }

    pdf.addImage(sliceImg, 'PNG', 0, 0, pageW, renderH);

    srcY += sliceHeightPx;
    sliceIndex += 1;
  }
}

export async function downloadAdmissionFormPdf(
  form: StudentAdmissionFormData,
  school: SchoolBranding,
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 1; i <= 2; i++) {
    const canvas = await renderExportPageToCanvas(i as 1 | 2, form, school);
    appendCanvasAcrossA4Pages(pdf, canvas, { isFirstDocumentPage: i === 1 });
  }

  const safeName = fullName(form).replace(/[^a-zA-Z0-9]+/g, '_') || 'Student';
  pdf.save(`Admission_Application_${safeName}.pdf`);
}
