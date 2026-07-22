import type { IdCardTemplateId } from '../components/crm/InstitutionSetup/idCardTypes';

/** ISO/IEC 7810 ID-1 / CR80 — standard PVC card size (portrait). */
export const CR80_WIDTH_MM = 54;
export const CR80_HEIGHT_MM = 85.6;
export const CR80_WIDTH_IN = 2.125;
export const CR80_HEIGHT_IN = 3.375;

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const PRINT_DPI = 300;

const LANDSCAPE_TEMPLATES: IdCardTemplateId[] = ['saiJyoti'];

export function isLandscapeIdCardTemplate(templateId: IdCardTemplateId): boolean {
  return LANDSCAPE_TEMPLATES.includes(templateId);
}

/** Physical print size on paper (mm). Landscape templates use rotated CR80. */
export function idCardPrintSizeMm(templateId: IdCardTemplateId): { widthMm: number; heightMm: number } {
  if (isLandscapeIdCardTemplate(templateId)) {
    return { widthMm: CR80_HEIGHT_MM, heightMm: CR80_WIDTH_MM };
  }
  return { widthMm: CR80_WIDTH_MM, heightMm: CR80_HEIGHT_MM };
}

/** Design canvas size at scale=1 in IdCardFaces.tsx. */
export function idCardDesignSize(templateId: IdCardTemplateId): { width: number; height: number } {
  if (isLandscapeIdCardTemplate(templateId)) return { width: 480, height: 300 };
  return { width: 320, height: 500 };
}

/** Render scale so captured card matches 300 DPI print width. */
export function idCardRenderScale(templateId: IdCardTemplateId): number {
  const { widthMm } = idCardPrintSizeMm(templateId);
  const design = idCardDesignSize(templateId);
  const targetWidthPx = (widthMm / 25.4) * PRINT_DPI;
  return targetWidthPx / design.width;
}

export function cardsPerA4Page(templateId: IdCardTemplateId): number {
  return isLandscapeIdCardTemplate(templateId) ? 4 : 2;
}

export type A4CardSlot = { x: number; y: number; widthMm: number; heightMm: number };

/** CR80-sized slot positions on A4 for cutter-friendly printing. */
export function a4CardSlot(templateId: IdCardTemplateId, slotIndex: number): A4CardSlot {
  const { widthMm, heightMm } = idCardPrintSizeMm(templateId);

  if (!isLandscapeIdCardTemplate(templateId)) {
    const gap = 8;
    const x = (A4_WIDTH_MM - widthMm) / 2;
    const totalH = heightMm * 2 + gap;
    const startY = (A4_HEIGHT_MM - totalH) / 2;
    return {
      x,
      y: startY + slotIndex * (heightMm + gap),
      widthMm,
      heightMm,
    };
  }

  const gap = 6;
  const cols = 2;
  const gridW = widthMm * cols + gap;
  const gridH = heightMm * 2 + gap;
  const startX = (A4_WIDTH_MM - gridW) / 2;
  const startY = (A4_HEIGHT_MM - gridH) / 2;
  const col = slotIndex % cols;
  const row = Math.floor(slotIndex / cols);
  return {
    x: startX + col * (widthMm + gap),
    y: startY + row * (heightMm + gap),
    widthMm,
    heightMm,
  };
}

export function cr80PrintLabel(templateId: IdCardTemplateId): string {
  if (isLandscapeIdCardTemplate(templateId)) {
    return `CR80 landscape (${CR80_HEIGHT_IN}" × ${CR80_WIDTH_IN}" / ${CR80_HEIGHT_MM} × ${CR80_WIDTH_MM} mm)`;
  }
  return `CR80 portrait (${CR80_WIDTH_IN}" × ${CR80_HEIGHT_IN}" / ${CR80_WIDTH_MM} × ${CR80_HEIGHT_MM} mm)`;
}
