import { PDFParse } from 'pdf-parse';

export async function extractTextFromPdfBase64(base64: string): Promise<{ text: string; pages: number }> {
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  const buf = Buffer.from(raw, 'base64');
  if (buf.length < 5 || buf.subarray(0, 5).toString('utf8') !== '%PDF-') {
    throw new Error('Invalid PDF file');
  }

  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return {
      text: (result.text || '').trim(),
      pages: result.total || 0,
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

export async function extractTextFromPdfs(
  files: { fileName: string; fileData: string }[],
): Promise<{ combinedText: string; fileMeta: { fileName: string; pages: number; charCount: number }[] }> {
  const parts: string[] = [];
  const fileMeta: { fileName: string; pages: number; charCount: number }[] = [];

  for (const file of files) {
    const { text, pages } = await extractTextFromPdfBase64(file.fileData);
    if (!text) {
      throw new Error(
        `Could not extract text from "${file.fileName}". The PDF may be scanned images only — use OCR Test Generation instead.`,
      );
    }
    fileMeta.push({ fileName: file.fileName, pages, charCount: text.length });
    parts.push(`--- ${file.fileName} ---\n${text}`);
  }

  const combinedText = parts.join('\n\n');
  if (!combinedText.trim()) {
    throw new Error('No readable text found in uploaded PDFs');
  }

  return { combinedText, fileMeta };
}

/** Keep prompt within model limits */
export function truncateSourceText(text: string, maxChars = 120_000): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Text truncated for AI processing…]`;
}
