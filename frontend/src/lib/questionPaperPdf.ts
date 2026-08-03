import { jsPDF } from 'jspdf';

export type QuestionPaperPrintData = {
  title: string;
  classGroup: string;
  subjectName: string;
  purposeLabel: string;
  academicYear: string;
  durationMinutes: number;
  passMarksPercent: number;
  questionType: string;
  difficulty: string;
  questions: {
    number: number;
    questionText: string;
    options: string[];
    type?: string;
    marks?: number;
  }[];
};

/** Printable question paper PDF for manual / hall exams (no answer key). */
export function downloadQuestionPaperPdf(paper: QuestionPaperPrintData, fileName?: string) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text(paper.title || 'Question Paper', pageW / 2, y, { align: 'center' });
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `${paper.classGroup} · ${paper.subjectName} · ${paper.purposeLabel} · ${paper.academicYear}`,
    pageW / 2,
    y,
    { align: 'center' },
  );
  y += 5;
  pdf.text(
    `Duration: ${paper.durationMinutes} min · Pass: ${paper.passMarksPercent}% · ${paper.questionType} · ${paper.difficulty}`,
    pageW / 2,
    y,
    { align: 'center' },
  );
  y += 6;

  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;

  pdf.setFontSize(9);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Name: ____________________________    Adm No: ____________    Roll: ______', margin, y);
  y += 8;

  for (const q of paper.questions) {
    const qText = `Q${q.number}. ${q.questionText}${q.marks ? `  (${q.marks} mark${q.marks === 1 ? '' : 's'})` : ''}`;
    const lines = pdf.splitTextToSize(qText, pageW - margin * 2);
    if (y + lines.length * 5 + (q.options?.length || 0) * 5 > 280) {
      pdf.addPage();
      y = 16;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.text(lines, margin, y);
    y += lines.length * 5 + 1;
    pdf.setFont('helvetica', 'normal');
    if (q.options?.length) {
      for (let i = 0; i < q.options.length; i++) {
        const label = String.fromCharCode(65 + i);
        const optLines = pdf.splitTextToSize(`   (${label}) ${q.options[i]}`, pageW - margin * 2 - 4);
        if (y + optLines.length * 4.5 > 280) {
          pdf.addPage();
          y = 16;
        }
        pdf.text(optLines, margin, y);
        y += optLines.length * 4.5;
      }
    } else {
      pdf.setTextColor(148, 163, 184);
      pdf.text('   _______________________________________________', margin, y);
      y += 6;
      pdf.setTextColor(30, 41, 59);
    }
    y += 4;
  }

  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('— End of Question Paper —', pageW / 2, Math.min(y + 6, 285), { align: 'center' });

  const safeName = (fileName || paper.title || 'question-paper').replace(/[^\w\-]+/g, '_').slice(0, 80);
  pdf.save(`${safeName}.pdf`);
}
