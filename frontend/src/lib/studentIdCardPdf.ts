import { jsPDF } from 'jspdf';
import { captureElementToCanvas } from './html2canvasCapture';
import type { IdCardSchool, IdCardStudent, IdCardTemplateId } from '../components/crm/InstitutionSetup/idCardTypes';
import { IdCardByTemplate } from '../components/crm/InstitutionSetup/IdCardFaces';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';

export type IdCardPdfItem = {
  templateId: IdCardTemplateId;
  student: IdCardStudent;
  classLabel?: string;
};

const CARDS_PER_PAGE = 2;

async function renderCardToCanvas(
  templateId: IdCardTemplateId,
  student: IdCardStudent,
  school: IdCardSchool,
  host: HTMLElement,
): Promise<HTMLCanvasElement> {
  const mount = document.createElement('div');
  mount.setAttribute('data-id-card', '1');
  host.appendChild(mount);

  const root: Root = createRoot(mount);
  root.render(createElement(IdCardByTemplate, { templateId, student, school, scale: 1 }));
  await new Promise((r) => setTimeout(r, 120));

  try {
    return await captureElementToCanvas(mount, { scale: 2 });
  } finally {
    root.unmount();
    mount.remove();
  }
}

function addCoverPage(pdf: jsPDF, title: string, subtitle: string) {
  const pageW = pdf.internal.pageSize.getWidth();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(title, pageW / 2, 40, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(subtitle, pageW / 2, 52, { align: 'center' });
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text('Prepared for printing — 360 School ERP', pageW / 2, 62, { align: 'center' });
  pdf.setTextColor(0);
}

function fitImageInSlot(
  pdf: jsPDF,
  imgData: string,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
) {
  const ratio = canvas.width / canvas.height;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  const offsetX = x + (maxW - w) / 2;
  const offsetY = y + (maxH - h) / 2;
  pdf.addImage(imgData, 'PNG', offsetX, offsetY, w, h);
}

export async function downloadStudentIdCardPdf(
  templateId: IdCardTemplateId,
  student: IdCardStudent,
  school: IdCardSchool,
  fileName: string,
) {
  await downloadBulkStudentIdCardsPdf(
    [{ templateId, student }],
    school,
    fileName,
  );
}

export async function downloadBulkStudentIdCardsPdf(
  items: IdCardPdfItem[],
  school: IdCardSchool,
  fileName: string,
  opts?: {
    coverTitle?: string;
    coverSubtitle?: string;
    groupByClass?: boolean;
    onProgress?: (current: number, total: number, label?: string) => void;
  },
) {
  if (items.length === 0) throw new Error('No ID cards selected');

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.background = '#ffffff';
  document.body.appendChild(host);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const slotH = (pageH - margin * (CARDS_PER_PAGE + 1)) / CARDS_PER_PAGE;
  const slotW = pageW - margin * 2;

  let slotOnPage = 0;
  let needsNewPage = true;
  let prevClass: string | undefined;

  if (opts?.coverTitle) {
    addCoverPage(pdf, opts.coverTitle, opts.coverSubtitle || `${items.length} student ID card(s)`);
    needsNewPage = true;
    slotOnPage = 0;
  }

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const classLabel = item.classLabel || item.student.className;

      opts?.onProgress?.(i + 1, items.length, item.student.name);

      if (opts?.groupByClass && classLabel !== prevClass) {
        if (i > 0 || opts?.coverTitle) {
          pdf.addPage();
          slotOnPage = 0;
        }
        addCoverPage(
          pdf,
          `Class: ${classLabel}`,
          `${items.filter((x) => (x.classLabel || x.student.className) === classLabel).length} ID card(s) · ${school.session}`,
        );
        pdf.addPage();
        slotOnPage = 0;
        needsNewPage = false;
        prevClass = classLabel;
      }

      if (needsNewPage) {
        if (i > 0 || opts?.coverTitle) pdf.addPage();
        needsNewPage = false;
        slotOnPage = 0;
      }

      const canvas = await renderCardToCanvas(item.templateId, item.student, school, host);
      const imgData = canvas.toDataURL('image/png');
      const slotY = margin + slotOnPage * (slotH + margin);
      fitImageInSlot(pdf, imgData, canvas, margin, slotY, slotW, slotH);

      slotOnPage += 1;
      if (slotOnPage >= CARDS_PER_PAGE) {
        needsNewPage = true;
        slotOnPage = 0;
      }
    }

    pdf.save(fileName);
  } finally {
    host.remove();
  }
}

/** Download one PDF file per class (for print vendors / shareholders). */
export async function downloadClassWiseIdCardPdfs(
  itemsByClass: Map<string, IdCardPdfItem[]>,
  school: IdCardSchool,
  academicYear: string,
  onProgress?: (className: string, current: number, total: number) => void,
) {
  const classes = [...itemsByClass.keys()].sort();
  for (let c = 0; c < classes.length; c++) {
    const className = classes[c];
    const items = itemsByClass.get(className) || [];
    if (items.length === 0) continue;
    const safeClass = className.replace(/[^a-zA-Z0-9]+/g, '_');
    await downloadBulkStudentIdCardsPdf(items, school, `ID_Cards_${safeClass}_${academicYear.replace(/\//g, '-')}.pdf`, {
      coverTitle: `Student ID Cards — ${className}`,
      coverSubtitle: `${items.length} card(s) · ${academicYear} · For printing`,
      onProgress: (cur, _tot, _label) => onProgress?.(className, cur, items.length),
    });
    if (c < classes.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}
