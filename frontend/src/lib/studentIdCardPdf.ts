import { jsPDF } from 'jspdf';
import { captureElementToCanvas } from './html2canvasCapture';
import type { IdCardSchool, IdCardStudent, IdCardTemplateId } from '../components/crm/InstitutionSetup/idCardTypes';
import { IdCardByTemplate } from '../components/crm/InstitutionSetup/IdCardFaces';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import {
  a4CardSlot,
  cardsPerA4Page,
  cr80PrintLabel,
  idCardRenderScale,
  isLandscapeIdCardTemplate,
} from './idCardPrintSizes';

export type IdCardPdfItem = {
  templateId: IdCardTemplateId;
  student: IdCardStudent;
  classLabel?: string;
};

async function renderCardToCanvas(
  templateId: IdCardTemplateId,
  student: IdCardStudent,
  school: IdCardSchool,
  host: HTMLElement,
): Promise<HTMLCanvasElement> {
  const mount = document.createElement('div');
  mount.setAttribute('data-id-card', '1');
  host.appendChild(mount);

  const renderScale = idCardRenderScale(templateId);
  const root: Root = createRoot(mount);
  root.render(createElement(IdCardByTemplate, { templateId, student, school, scale: renderScale }));
  await new Promise((r) => setTimeout(r, 150));

  try {
    return await captureElementToCanvas(mount, { scale: 1 });
  } finally {
    root.unmount();
    mount.remove();
  }
}

function addCoverPage(pdf: jsPDF, title: string, subtitle: string, templateId?: IdCardTemplateId) {
  const pageW = pdf.internal.pageSize.getWidth();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(title, pageW / 2, 40, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(subtitle, pageW / 2, 52, { align: 'center' });
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  const sizeNote = templateId
    ? `Print size: ${cr80PrintLabel(templateId)} · 360 School ERP`
    : 'Print size: CR80 standard (54 × 85.6 mm) · 360 School ERP';
  pdf.text(sizeNote, pageW / 2, 62, { align: 'center' });
  pdf.setTextColor(0);
}

function addCardImage(
  pdf: jsPDF,
  imgData: string,
  templateId: IdCardTemplateId,
  slotIndex: number,
) {
  const slot = a4CardSlot(templateId, slotIndex);
  pdf.addImage(imgData, 'PNG', slot.x, slot.y, slot.widthMm, slot.heightMm, undefined, 'FAST');
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

  let slotOnPage = 0;
  let layoutTemplate: IdCardTemplateId | null = null;
  let needsNewPage = true;
  let prevClass: string | undefined;

  if (opts?.coverTitle) {
    addCoverPage(pdf, opts.coverTitle, opts.coverSubtitle || `${items.length} student ID card(s)`, items[0]?.templateId);
    needsNewPage = true;
    slotOnPage = 0;
    layoutTemplate = null;
  }

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const classLabel = item.classLabel || item.student.className;
      const perPage = cardsPerA4Page(item.templateId);
      const landscape = isLandscapeIdCardTemplate(item.templateId);

      opts?.onProgress?.(i + 1, items.length, item.student.name);

      if (opts?.groupByClass && classLabel !== prevClass) {
        if (i > 0 || opts?.coverTitle) {
          pdf.addPage();
          slotOnPage = 0;
          layoutTemplate = null;
        }
        addCoverPage(
          pdf,
          `Class: ${classLabel}`,
          `${items.filter((x) => (x.classLabel || x.student.className) === classLabel).length} ID card(s) · ${school.session}`,
          item.templateId,
        );
        pdf.addPage();
        slotOnPage = 0;
        layoutTemplate = null;
        needsNewPage = false;
        prevClass = classLabel;
      }

      const layoutChanged = layoutTemplate !== null && layoutTemplate !== item.templateId
        && isLandscapeIdCardTemplate(layoutTemplate) !== landscape;

      if (needsNewPage || slotOnPage >= perPage || layoutChanged) {
        if (i > 0 || opts?.coverTitle) pdf.addPage();
        slotOnPage = 0;
        needsNewPage = false;
      }

      layoutTemplate = item.templateId;

      const canvas = await renderCardToCanvas(item.templateId, item.student, school, host);
      const imgData = canvas.toDataURL('image/png');
      addCardImage(pdf, imgData, item.templateId, slotOnPage);

      slotOnPage += 1;
      if (slotOnPage >= perPage) {
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
      coverSubtitle: `${items.length} card(s) · ${academicYear} · CR80 print-ready`,
      onProgress: (cur, _tot, _label) => onProgress?.(className, cur, items.length),
    });
    if (c < classes.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}
