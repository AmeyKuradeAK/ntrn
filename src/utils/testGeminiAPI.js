import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ role: "user", parts: [{ text: "Explain how AI works" }] }],
  });

  const text = response.text(); // Parses the first candidate's response
  console.log("✅ Gemini says:\n", text);
}

main();
