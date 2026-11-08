import { Quiz, Question } from "../types";

export function formatQuizToMarkdown(quiz: Quiz, showKey: boolean = false): string {
  let md = `## 📝 ${quiz.title}\n`;
  md += `*Mata Pelajaran: ${quiz.subject} | Jenjang: ${quiz.gradeClass}*\n\n---\n\n`;

  const trueFalseQuestions = quiz.questions.filter((q: Question) => q.type === 'Benar / Salah');
  const matchingQuestions = quiz.questions.filter((q: Question) => q.type === 'Mencocokkan');
  const otherQuestions = quiz.questions.filter((q: Question) => q.type !== 'Benar / Salah' && q.type !== 'Mencocokkan');

  let qNum = 1;

  // 1. Regular Questions (PG & Essay)
  if (otherQuestions.length > 0) {
    otherQuestions.forEach((q: Question) => {
      md += `**${qNum}.** ${q.questionText} *(${q.type})*\n`;
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt: string, idx: number) => {
          md += `   ${String.fromCharCode(65 + idx)}. ${opt}\n`;
        });
      }
      md += `\n`;
      qNum++;
    });
  }

  // 2. Matching Questions
  if (matchingQuestions.length > 0) {
    md += `### 🧩 BAGIAN II. SOAL MENJODOHKAN\n`;
    md += `**Petunjuk:** Jodohkanlah pertanyaan di Kolom A dengan pilihan kata kunci di Kolom B!\n\n`;
    
    // Get all options (including distractors) for Column B
    let allChoices: string[] = [];
    matchingQuestions.forEach((q: Question) => {
      if (q.options) {
        q.options.forEach((opt: string) => {
          if (!allChoices.includes(opt)) allChoices.push(opt);
        });
      }
    });

    // Shuffle choices for Column B
    const shuffle = (array: string[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    const shuffledChoices = shuffle([...allChoices]);

    md += `| NO | KOLOM A (PERTANYAAN) | KOLOM B (PILIHAN JAWABAN) |\n`;
    md += `|:---:|:-------------------|:--------------------------|\n`;
    
    const maxRows = Math.max(matchingQuestions.length, shuffledChoices.length);
    for (let i = 0; i < maxRows; i++) {
      const q = matchingQuestions[i];
      const colA = q ? `**${qNum + i}.** ${q.questionText}` : "";
      const choice = shuffledChoices[i] ? `**${String.fromCharCode(97 + i)}.** ${shuffledChoices[i]}` : ""; // Lowercase a, b, c...
      md += `| ${q ? qNum + i : ""} | ${colA} | ${choice} |\n`;
    }
    
    md += `\n**Jawaban:**\n`;
    matchingQuestions.forEach((_, idx) => {
      md += `${qNum + idx}. ....... &nbsp;&nbsp; `;
    });
    
    qNum += matchingQuestions.length;
    md += `\n\n`;


  }

  // 3. True / False Questions
  if (trueFalseQuestions.length > 0) {
    md += `### 🔘 BAGIAN III. SOAL BENAR / SALAH\n`;
    md += `**Petunjuk:** Berilah tanda centang (✓) atau silang (X) pada kolom Benar atau Salah!\n\n`;
    md += `| No | Pertanyaan / Pernyataan | Benar | Salah |\n`;
    md += `|:---:|:------------------------|:---:|:---:|\n`;
    
    trueFalseQuestions.forEach((q: Question, idx: number) => {
      md += `| ${qNum + idx} | ${q.questionText} | | |\n`;
    });
    
    qNum += trueFalseQuestions.length;
    md += `\n`;
  }

  // 4. Answer Key
  if (showKey && quiz.includeKey) {
    md += `---\n### 🔑 KUNCI JAWABAN & PEMBAHASAN\n\n`;
    quiz.questions.forEach((q: Question, idx: number) => {
      md += `**${idx + 1}. Jawaban:** \`${q.correctAnswer}\`  \n`;
      if (q.explanation) md += `*Pembahasan:* ${q.explanation}\n\n`;
    });
  }

  return md;
}
