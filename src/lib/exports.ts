import { Quiz, Question } from "../types";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const BLACK = "000000";

export async function exportToWord(quiz: Quiz) {
  const docChildren: any[] = [];

  // Header
  docChildren.push(new Paragraph({
    children: [new TextRun({ text: quiz.title.toUpperCase(), bold: true, size: 32, color: BLACK })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }));

  docChildren.push(new Paragraph({
    children: [new TextRun({ text: `Mata Pelajaran: ${quiz.subject}  |  Kelas: ${quiz.gradeClass}`, bold: true, size: 20, color: BLACK })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  }));

  // Questions
  const trueFalseQuestions = quiz.questions.filter(q => q.type === 'Benar / Salah');
  const matchingQuestions = quiz.questions.filter(q => q.type === 'Mencocokkan');
  const otherQuestions = quiz.questions.filter(q => q.type !== 'Benar / Salah' && q.type !== 'Mencocokkan');

  let qNum = 1;

  // 1. Regular Questions
  if (otherQuestions.length > 0) {
    otherQuestions.forEach((q, idx) => {
      docChildren.push(new Paragraph({
        children: [
          new TextRun({ text: `${qNum}. `, bold: true, size: 24, color: BLACK }),
          new TextRun({ text: q.questionText, size: 24, color: BLACK })
        ],
        spacing: { before: 200, after: 100 }
      }));

      if (q.options) {
        q.options.forEach((opt: string, optIdx: number) => {
          docChildren.push(new Paragraph({
            children: [new TextRun({ text: `    ${String.fromCharCode(65 + optIdx)}. ${opt}`, size: 22, color: BLACK })],
            spacing: { after: 50 }
          }));
        });
      }
      qNum++;
    });
  }

  // 2. Matching Questions
  if (matchingQuestions.length > 0) {
    docChildren.push(new Paragraph({
      children: [new TextRun({ text: "BAGIAN II. SOAL MENJODOHKAN", bold: true, size: 26, color: BLACK })],
      spacing: { before: 400, after: 100 }
    }));

    docChildren.push(new Paragraph({
      children: [new TextRun({ text: "Petunjuk Pengerjaan: Jodohkanlah pertanyaan di Kolom A dengan pilihan kata kunci di Kolom B!", italics: true, size: 18, color: BLACK })],
      spacing: { after: 200 }
    }));

    let allChoices: string[] = [];
    matchingQuestions.forEach(q => {
      if (q.options) {
        q.options.forEach(opt => {
          if (!allChoices.includes(opt)) allChoices.push(opt);
        });
      }
    });

    // Shuffle choices
    const shuffle = (array: string[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    const shuffledChoices = shuffle([...allChoices]);

    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true, size: 20, color: BLACK })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KOLOM A (PERTANYAAN)", bold: true, size: 20, color: BLACK })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KOLOM B (PILIHAN JAWABAN)", bold: true, size: 20, color: BLACK })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];

    const maxRows = Math.max(matchingQuestions.length, shuffledChoices.length);
    for (let i = 0; i < maxRows; i++) {
      const q = matchingQuestions[i];
      const choice = shuffledChoices[i];
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q ? `${qNum + i}` : "", size: 20, color: BLACK })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q ? q.questionText : "", size: 20, color: BLACK })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: choice ? `${String.fromCharCode(97 + i)}. ${choice}` : "", size: 20, color: BLACK })] })] }), // Lowercase a, b, c...
        ],
      }));
    }

    docChildren.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));

    // Add Jawaban section
    docChildren.push(new Paragraph({
      children: [new TextRun({ text: "Jawaban:", bold: true, size: 20, color: BLACK })],
      spacing: { before: 200, after: 100 }
    }));
    
    let answerText = "";
    matchingQuestions.forEach((_, idx) => {
      answerText += `${qNum + idx}. .......     `;
    });
    
    docChildren.push(new Paragraph({
      children: [new TextRun({ text: answerText, size: 20, color: BLACK })],
      spacing: { after: 200 }
    }));

    qNum += matchingQuestions.length;

  }

  // 3. True / False Questions
  if (trueFalseQuestions.length > 0) {
    docChildren.push(new Paragraph({
      children: [new TextRun({ text: "BAGIAN III. SOAL BENAR / SALAH", bold: true, size: 26, color: BLACK })],
      spacing: { before: 400, after: 100 }
    }));

    docChildren.push(new Paragraph({
      children: [new TextRun({ text: "Petunjuk Pengerjaan: Berilah tanda centang (✓) atau silang (X) pada kolom Benar atau Salah!", italics: true, size: 18, color: BLACK })],
      spacing: { after: 200 }
    }));

    const tfRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true, size: 20, color: BLACK })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Pertanyaan", bold: true, size: 20, color: BLACK })] })], width: { size: 70, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Benar", bold: true, size: 20, color: BLACK })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Salah", bold: true, size: 20, color: BLACK })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];

    trueFalseQuestions.forEach((q, idx) => {
      tfRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${qNum + idx}`, size: 20, color: BLACK })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q.questionText, size: 20, color: BLACK })] })] }),
          new TableCell({ children: [new Paragraph({ children: [] })] }),
          new TableCell({ children: [new Paragraph({ children: [] })] }),
        ],
      }));
    });

    docChildren.push(new Table({ rows: tfRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    qNum += trueFalseQuestions.length;
  }

  // 4. Key
  if (quiz.includeKey) {
    docChildren.push(new Paragraph({
      children: [new TextRun({ text: "KUNCI JAWABAN & PEMBAHASAN", bold: true, size: 24, color: BLACK })],
      spacing: { before: 600, after: 200 }
    }));

    quiz.questions.forEach((q: Question, idx: number) => {
      docChildren.push(new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. Kunci: ${q.correctAnswer}`, bold: true, size: 22, color: BLACK }),
          new TextRun({ text: q.explanation ? ` - ${q.explanation}` : '', italics: true, size: 22, color: BLACK })
        ],
        spacing: { after: 50 }
      }));
    });
  }


  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${quiz.title.replace(/\s+/g, '_')}.docx`);
}

export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${filename}.pdf`);
}

export async function createGoogleForm(quiz: Quiz, accessToken: string) {
  // 1. Create the Form
  const createResponse = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: quiz.title,
        documentTitle: quiz.title,
      },
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(`Failed to create form: ${error.error?.message || createResponse.statusText}`);
  }

  const form = await createResponse.json();
  const formId = form.formId;

  // 2. Turn into a Quiz
  const updateSettingsResponse = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          updateSettings: {
            settings: {
              quizSettings: { isQuiz: true },
            },
            updateMask: 'quizSettings.isQuiz',
          },
        },
      ],
    }),
  });

  if (!updateSettingsResponse.ok) {
    throw new Error('Failed to enable quiz settings on form');
  }

  // 3. Add Questions
  const items = quiz.questions.map((q, idx) => {
    let options = q.options || [];
    
    // Auto-populate Benar/Salah options if missing
    if (q.type === 'Benar / Salah' && options.length === 0) {
      options = ['Benar', 'Salah'];
    }

    // Ensure correctAnswer exists in options (case-insensitive fix)
    let finalCorrectAnswer = q.correctAnswer;
    if (options.length > 0) {
      const matchedOption = options.find(opt => opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
      if (matchedOption) {
        finalCorrectAnswer = matchedOption;
      }
    }

    const item: any = {
      title: q.questionText,
      questionItem: {
        question: {
          required: true,
          grading: {
            pointValue: 1,
            correctAnswers: {
              answers: [{ value: finalCorrectAnswer }],
            },
          },
        },
      },
    };

    if (options.length > 0) {
      item.questionItem.question.choiceQuestion = {
        type: 'RADIO',
        options: options.map(opt => ({ value: opt })),
      };
    } else {
      item.questionItem.question.textQuestion = { paragraph: true };
    }

    return {
      createItem: {
        item,
        location: { index: idx },
      },
    };
  });


  const addQuestionsResponse = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests: items }),
  });

  if (!addQuestionsResponse.ok) {
    const error = await addQuestionsResponse.json();
    throw new Error(`Failed to add questions: ${error.error?.message || addQuestionsResponse.statusText}`);
  }

  return `https://docs.google.com/forms/d/${formId}/edit`;
}

export function generateGoogleFormScript(quiz: Quiz) {
// ... existing code
  let code = `function createQuizForm() {\n  var form = FormApp.create(${JSON.stringify(quiz.title)});\n  form.setIsQuiz(true);\n\n`;
  
  quiz.questions.forEach((q: Question) => {
    if (q.options && q.options.length > 0) {
      code += `  var item = form.addMultipleChoiceItem();\n  item.setTitle(${JSON.stringify(q.questionText)});\n  item.setChoices([\n`;
      q.options.forEach((opt: string) => {
        const isCorrect = opt.toLowerCase().includes((q.correctAnswer || "").toLowerCase());
        code += `    item.createChoice(${JSON.stringify(opt)}, ${isCorrect}),\n`;
      });
      code += `  ]);\n\n`;
    } else {
      code += `  var item = form.addParagraphTextItem();\n  item.setTitle(${JSON.stringify(q.questionText)});\n\n`;
    }
  });
  
  code += `}\n`;
  return code;
}
