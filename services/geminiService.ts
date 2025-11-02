import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// La función para generar descripciones de clases ya no es necesaria con el nuevo diseño.
// Se puede añadir nueva funcionalidad de IA aquí en el futuro.
