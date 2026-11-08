import { GenerateConfig } from "../types";

export async function generateExam(config: GenerateConfig) {
  let formatInstruction = "";
  
  // New granular type selection logic
  const enabledTypes = Object.entries(config.typeConfig).filter(([_, cfg]) => cfg.enabled);
  
  if (enabledTypes.length > 0) {
    const totalSelected = enabledTypes.reduce((acc, [_, cfg]) => acc + cfg.count, 0);
    formatInstruction = `FORMAT KETAT SOAL (Total ${totalSelected} soal):\n`;
    enabledTypes.forEach(([typeName, cfg], idx) => {
      formatInstruction += `${idx + 1}. ${typeName}: Tepat ${cfg.count} soal.\n`;
    });
    
    const sequence = enabledTypes.map(([name, cfg]) => `${cfg.count} ${name}`).join(", ");
    formatInstruction += `\nSusun urutan array 'questions' dalam JSON sesuai urutan kelompok di atas (${sequence}).`;
  } else if (config.type === "Campuran") {
    // Fallback logic for old "Campuran" type if no granular config
    const totalCount = config.count;
    const isElementaryLower = config.gradeClass && (config.gradeClass.includes('Kelas 1') || config.gradeClass.includes('Kelas 2') || config.gradeClass.includes('Kelas 3'));
    const essayOrShortType = isElementaryLower ? "Isian Singkat" : "Uraian / Essay";
    const remainingPgCount = Math.max(1, totalCount - 12);

    formatInstruction = `FORMAT KETAT SOAL CAMPURAN (Total ${totalCount} soal):
1. Pilihan Ganda: Tepat ${remainingPgCount} soal.
2. Benar / Salah: Tepat 4 soal.
3. Mencocokkan: Tepat 3 soal.
4. ${essayOrShortType}: Tepat 5 soal.

Susun urutan array 'questions' dalam JSON sesuai urutan kelompok di atas (${remainingPgCount} PG, 4 Benar/Salah, 3 Mencocokkan, 5 ${essayOrShortType}).`;
  }


  const systemPrompt = `BoimSmart: Pakar Ujian Merdeka & BMR.
Tugas: Buat soal AKURAT, INSTAN, JSON ONLY.
Konfigurasi: ${config.subject}, ${config.gradeClass}, ${config.difficulty}.

PRINSIP:
1. AKURASI: Jika file diunggah, HANYA gunakan materi dari file. Jika ada GAMBAR, buat soal yang merujuk pada detail visual (contoh: "Berdasarkan gambar nomor 1...").
2. BAHASA: Indonesia formal, profesional, sesuai jenjang.
3. NO FILLER: Langsung JSON. Dilarang teks tambahan.
4. MATCHING (MENJODOHKAN): 
   - 'questionText': Pernyataan/Deskripsi singkat di Kolom A.
   - 'correctAnswer': Kata kunci/Jawaban tepat di Kolom B.
   - 'options': WAJIB isi dengan gabungan SEMUA 'correctAnswer' dari kelompok soal menjodohkan ini + 2 pengecoh.

${formatInstruction}

Output: JSON valid schema.`;





  let userTextContent = "";
  if (config.attachedFile) {
    userTextContent = `TUGAS SANGAT KRITIS (STRICT ADHERENCE):
1. Buatkan ${config.count} soal bertipe ${config.type} untuk ${config.gradeClass}.
2. GUNAKAN HANYA materi dari file terlampir (${config.attachedFile.name}).
3. DILARANG KERAS menambahkan fakta, konsep, atau data di luar file tersebut.
4. DILARANG KERAS mengabaikan atau melewatkan poin utama dari materi yang ada.
5. Soal harus merefleksikan kedalaman materi di dalam file secara akurat.`;
  } else {
    userTextContent = `Buatkan ${config.count} soal bertipe ${config.type} untuk ${config.gradeClass}. Prompt/Materi: ${config.prompt || 'Materi umum mata pelajaran'}`;
  }

  const parts = [{ text: userTextContent }];

  if (config.attachedFile) {
    if (config.attachedFile.mimeType.startsWith('image/')) {
      parts.push({
        //@ts-ignore
        inlineData: {
          mimeType: config.attachedFile.mimeType,
          data: config.attachedFile.data
        }
      });
    } else {
      parts[0].text += `\n\n[MATER UTAMA DARI FILE: ${config.attachedFile.name}]`;
    }
  }

  const responseSchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      subject: { type: "string" },
      level: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number" },
            questionText: { type: "string" },
            type: { type: "string" }, 
            options: {
              type: "array",
              items: { type: "string" }
            },
            correctAnswer: { type: "string" },
            explanation: { type: "string" }
          },
          required: ["id", "questionText", "correctAnswer"]
        }
      }
    },
    required: ["title", "questions"]
  };

  const response = await fetch("/api/generate-exam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: parts,
      systemInstruction: systemPrompt,
      responseSchema: responseSchema,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP Error ${response.status}`);
  }

  return await response.json();
}
