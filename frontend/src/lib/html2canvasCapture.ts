import html2canvas from 'html2canvas-pro';

export type CaptureOptions = Parameters<typeof html2canvas>[1];

export async function captureElementToCanvas(
  sourceEl: HTMLElement,
  options?: CaptureOptions,
): Promise<HTMLCanvasElement> {
  return html2canvas(sourceEl, {
    scale: 2.5,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    ...options,
  });
}
