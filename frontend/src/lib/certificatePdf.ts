import { jsPDF } from 'jspdf';

export type CertificateCategory =
  | 'PHYSICAL_HEALTH'
  | 'WORK_EDUCATION'
  | 'VISUAL_PERFORMING_ARTS'
  | 'LEADERSHIP_COMMUNITY';

type CertificatePreviewData = {
  certificate: {
    studentName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    academicYear: string;
    term: string;
    category: CertificateCategory;
    categoryLabel: string;
    activityTitle: string;
    subCategory: string;
    performanceScore: number;
    performanceGrade: string;
    performanceBandLabel: string;
    remarks: string;
    issuedAt: string | null;
    recordedBy: string;
  };
  config: {
    schoolName: string;
    schoolAddress: string;
    principalName: string;
    principalSignatureData: string;
    classTeacherSignatureData?: string;
    schoolSealData: string;
    headerLogoData: string;
    footerNote: string;
  } | null;
};

const CATEGORY_STYLES: Record<CertificateCategory, {
  primary: [number, number, number];
  accent: [number, number, number];
  bg: [number, number, number];
  title: string;
  subtitle: string;
}> = {
  PHYSICAL_HEALTH: {
    primary: [22, 163, 74],
    accent: [34, 197, 94],
    bg: [240, 253, 244],
    title: 'Certificate of Achievement',
    subtitle: 'Physical & Health Education',
  },
  WORK_EDUCATION: {
    primary: [37, 99, 235],
    accent: [59, 130, 246],
    bg: [239, 246, 255],
    title: 'Certificate of Excellence',
    subtitle: 'Work Education & Life Skills',
  },
  VISUAL_PERFORMING_ARTS: {
    primary: [147, 51, 234],
    accent: [168, 85, 247],
    bg: [250, 245, 255],
    title: 'Certificate of Merit',
    subtitle: 'Visual & Performing Arts',
  },
  LEADERSHIP_COMMUNITY: {
    primary: [234, 88, 12],
    accent: [249, 115, 22],
    bg: [255, 247, 237],
    title: 'Certificate of Appreciation',
    subtitle: 'Leadership & Community Service',
  },
};

function addImageIfPresent(pdf: jsPDF, data: string, x: number, y: number, w: number, h: number) {
  if (!data) return;
  try {
    const fmt = data.startsWith('/9j') ? 'JPEG' : 'PNG';
    pdf.addImage(`data:image/${fmt.toLowerCase()};base64,${data}`, fmt, x, y, w, h);
  } catch {
    // skip
  }
}

function drawBorder(pdf: jsPDF, colors: typeof CATEGORY_STYLES.PHYSICAL_HEALTH) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(1.5);
  pdf.rect(10, 10, pageW - 20, pageH - 20);
  pdf.setLineWidth(0.5);
  pdf.rect(14, 14, pageW - 28, pageH - 28);
}

export function downloadCertificatePdf(data: CertificatePreviewData, fileName?: string) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const style = CATEGORY_STYLES[data.certificate.category] || CATEGORY_STYLES.PHYSICAL_HEALTH;
  const config = data.config;

  pdf.setFillColor(...style.bg);
  pdf.rect(0, 0, pageW, pageH, 'F');
  drawBorder(pdf, style);

  // School logo (top center)
  if (config?.headerLogoData) {
    addImageIfPresent(pdf, config.headerLogoData, pageW / 2 - 12, 18, 24, 24);
  } else {
    pdf.setDrawColor(180, 180, 180);
    pdf.rect(pageW / 2 - 12, 18, 24, 24);
    pdf.setFontSize(6);
    pdf.setTextColor(150, 150, 150);
    pdf.text('LOGO', pageW / 2, 32, { align: 'center' });
  }

  // Seal (top right, subtle)
  if (config?.schoolSealData) {
    addImageIfPresent(pdf, config.schoolSealData, pageW - 48, 18, 22, 22);
  }

  pdf.setTextColor(...style.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(config?.schoolName || 'School Name', pageW / 2, 50, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  const address = config?.schoolAddress || 'School Address';
  const addrLines = pdf.splitTextToSize(address, pageW - 80);
  pdf.text(addrLines, pageW / 2, 56, { align: 'center' });
  const addrOffset = Math.max(0, (addrLines.length - 1) * 4);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(...style.primary);
  pdf.text(style.title, pageW / 2, 68 + addrOffset, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setTextColor(...style.accent);
  pdf.text(style.subtitle, pageW / 2, 76 + addrOffset, { align: 'center' });

  pdf.setDrawColor(...style.accent);
  pdf.setLineWidth(0.3);
  pdf.line(60, 82 + addrOffset, pageW - 60, 82 + addrOffset);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(50, 50, 50);
  pdf.text('This is to certify that', pageW / 2, 92 + addrOffset, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...style.primary);
  pdf.text(data.certificate.studentName, pageW / 2, 104 + addrOffset, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  const classText = `Admission No: ${data.certificate.admissionNumber}  |  Class: ${data.certificate.className} — ${data.certificate.sectionName}  |  Session: ${data.certificate.academicYear}`;
  pdf.text(classText, pageW / 2, 112 + addrOffset, { align: 'center' });

  const bodyLines = [
    `has demonstrated outstanding performance in`,
    `"${data.certificate.activityTitle}"`,
    data.certificate.subCategory ? `(${data.certificate.subCategory})` : '',
    `Performance: ${data.certificate.performanceScore} — Grade ${data.certificate.performanceGrade} (${data.certificate.performanceBandLabel})`,
  ].filter(Boolean);

  let y = 124 + addrOffset;
  for (const line of bodyLines) {
    pdf.setFontSize(line.includes('"') ? 12 : 10);
    pdf.setFont('helvetica', line.includes('"') ? 'bolditalic' : 'normal');
    pdf.text(line, pageW / 2, y, { align: 'center' });
    y += 7;
  }

  if (data.certificate.remarks) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`"${data.certificate.remarks}"`, pageW / 2, y + 4, { align: 'center' });
  }

  const sigY = pageH - 42;
  const teacherSig = config?.classTeacherSignatureData || '';
  const principalSig = config?.principalSignatureData || '';

  if (teacherSig) {
    addImageIfPresent(pdf, teacherSig, 35, sigY - 14, 40, 14);
  }
  if (principalSig) {
    addImageIfPresent(pdf, principalSig, pageW - 75, sigY - 14, 40, 14);
  }
  if (config?.schoolSealData) {
    addImageIfPresent(pdf, config.schoolSealData, pageW / 2 - 12, sigY - 16, 24, 24);
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 60);
  pdf.line(30, sigY + 4, 85, sigY + 4);
  pdf.line(pageW - 85, sigY + 4, pageW - 30, sigY + 4);
  pdf.text('Class Teacher', 30, sigY + 10);
  pdf.text(config?.principalName || 'Principal', pageW - 85, sigY + 10);
  pdf.text(`Recorded by: ${data.certificate.recordedBy || '—'}`, 30, sigY + 16);

  const dateStr = data.certificate.issuedAt
    ? new Date(data.certificate.issuedAt).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');
  pdf.text(`Date: ${dateStr}`, pageW - 85, sigY + 16);

  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text(config?.footerNote || 'This certificate is issued by the school authority.', pageW / 2, pageH - 16, { align: 'center' });

  const safeName = data.certificate.studentName.replace(/[^\w-]+/g, '_');
  pdf.save(fileName || `Certificate_${safeName}_${data.certificate.category}.pdf`);
}

export const CERTIFICATE_CATEGORY_STYLES = CATEGORY_STYLES;
