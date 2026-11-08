import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

async function createServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini with correct SDK pattern
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Gemini Proxy Route
  app.post("/api/generate-exam", async (req, res) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const { prompt, systemInstruction, responseSchema } = req.body;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: { role: 'user', parts: prompt },
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            candidateCount: 1,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.MINIMAL
            }
          },
        });






        return res.json(JSON.parse(response.text || "{}"));
      } catch (error: any) {
        attempt++;
        const isTransient = error.message?.includes('503') || error.message?.includes('429') || error.message?.includes('high demand');
        
        if (isTransient && attempt <= maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`Gemini transient error. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.error("Gemini Fatal Error:", error);
        return res.status(500).json({ error: error.message });
      }
    }
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

createServer();
