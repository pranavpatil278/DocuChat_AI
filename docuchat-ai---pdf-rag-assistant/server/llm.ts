import { GoogleGenAI } from '@google/genai';
import { CONFIG } from './config';
import { Citation, RetrievedChunk } from './types';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'dummy-key',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface GenerationResult {
  answer: string;
  citations: Citation[];
  generationTimeMs: number;
  grounded: boolean;
}

/**
 * Ordered list of candidate models for robust fallback
 */
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
];

/**
 * Calls Gemini with grounded system instruction, multi-model fallback, and robust timeout handling
 */
export async function generateGroundedAnswer(
  systemInstruction: string,
  userPrompt: string,
  retrievedChunks: RetrievedChunk[]
): Promise<GenerationResult> {
  const startTime = Date.now();

  // If no chunks retrieved at all, return immediate honest refusal
  if (retrievedChunks.length === 0) {
    return {
      answer:
        'The uploaded documents do not contain information to answer this question. Please upload or index relevant documents first.',
      citations: [],
      generationTimeMs: Date.now() - startTime,
      grounded: false,
    };
  }

  const ai = getAiClient();
  let generatedAnswer = '';
  let successfulModel = '';

  // Try candidate models in sequence
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const perModelTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout with model ${modelName}`)), 12000)
      );

      const generateCall = ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.15,
        },
      });

      const response = await Promise.race([generateCall, perModelTimeout]);
      const text = response.text?.trim();

      if (text && text.length > 0) {
        generatedAnswer = text;
        successfulModel = modelName;
        break;
      }
    } catch (err: any) {
      console.warn(`[LLM] Model ${modelName} call failed or timed out: ${err?.message || err}`);
    }
  }

  // If all API calls failed (e.g. 503 high demand or quota limits), provide grounded extractive fallback
  if (!generatedAnswer) {
    generatedAnswer = buildExtractiveFallbackAnswer(retrievedChunks);
  }

  const generationTimeMs = Date.now() - startTime;

  // Check if the model explicitly refused due to missing evidence
  const isRefusal =
    /do not contain (sufficient|enough|any)? information|not found in the uploaded documents|no mention of|not contain information to answer/i.test(
      generatedAnswer
    );

  // Build matched citations list from retrieved chunks
  const citations: Citation[] = [];
  const usedKeys = new Set<string>();

  for (const item of retrievedChunks) {
    const { chunk, score } = item;
    const pageRef = new RegExp(`page\\s*${chunk.pageNumber}|Doc:\\s*${escapeRegExp(chunk.filename)}`, 'i');
    const isCitedOrTop = pageRef.test(generatedAnswer) || score >= 0.55 || citations.length < 2;
    const key = `${chunk.filename}-p${chunk.pageNumber}-${chunk.id}`;

    if (!isRefusal && isCitedOrTop && !usedKeys.has(key)) {
      citations.push({
        filename: chunk.filename,
        pageNumber: chunk.pageNumber,
        chunkId: chunk.id,
        score,
        textSnippet: chunk.text,
      });
      usedKeys.add(key);
    }
  }

  citations.sort((a, b) => b.score - a.score);

  return {
    answer: generatedAnswer,
    citations: isRefusal ? [] : citations,
    generationTimeMs,
    grounded: !isRefusal,
  };
}

/**
 * Deterministic extractive fallback when external LLM endpoints are unavailable
 */
function buildExtractiveFallbackAnswer(chunks: RetrievedChunk[]): string {
  const topChunks = chunks.filter((c) => c.score > 0.35).slice(0, 3);
  if (topChunks.length === 0) {
    return 'The uploaded documents do not contain sufficient information to answer this question.';
  }

  const sections = topChunks.map((item, idx) => {
    const { chunk, score } = item;
    const cleanText = chunk.text
      .replace(/\n+/g, ' ')
      .trim();
    return `### Source Reference ${idx + 1} (${(score * 100).toFixed(0)}% match)\n${cleanText}\n[Doc: ${chunk.filename}, Page: ${chunk.pageNumber}]`;
  });

  return `Based on relevant excerpts retrieved from your indexed documents:\n\n${sections.join('\n\n')}`;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

