import { GoogleGenAI } from '@google/genai';
import { CONFIG } from './config';

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

// In-memory embedding cache to avoid redundant API requests
const embeddingCache = new Map<string, number[]>();

/**
 * Creates vector embedding for a single text string using Gemini Embedding API
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) {
    return new Array(768).fill(0);
  }

  const cacheKey = `${CONFIG.EMBEDDING_MODEL}:${cleanText}`;
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  try {
    const ai = getAiClient();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Embedding API timed out')), 8000)
    );

    const embedPromise = ai.models.embedContent({
      model: CONFIG.EMBEDDING_MODEL,
      contents: cleanText,
    });

    const result = await Promise.race([embedPromise, timeoutPromise]);

    let vector: number[] = [];
    if (result.embeddings && result.embeddings.length > 0 && result.embeddings[0].values) {
      vector = result.embeddings[0].values;
    } else if ((result as any).embedding?.values) {
      vector = (result as any).embedding.values;
    } else {
      // Fallback deterministic semantic hash vector
      vector = generateFallbackEmbedding(cleanText);
    }

    // Normalize vector to unit length for fast cosine similarity
    const normalized = normalizeVector(vector);
    embeddingCache.set(cacheKey, normalized);
    return normalized;
  } catch (error: any) {
    console.warn('Gemini embedding API error (using semantic dense fallback):', error?.message || error);
    const fallbackVector = generateFallbackEmbedding(cleanText);
    const normalized = normalizeVector(fallbackVector);
    embeddingCache.set(cacheKey, normalized);
    return normalized;
  }
}

/**
 * Batch creates embeddings for multiple text chunks
 */
export async function createBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  const batchSize = 10;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map((t) => createEmbedding(t));
    const batchResults = await Promise.all(batchPromises);
    embeddings.push(...batchResults);
  }

  return embeddings;
}

/**
 * Computes Cosine Similarity between two normalized vectors: A . B
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, (sim + 1) / 2)); // Normalized to 0.0 - 1.0 range
}

function normalizeVector(vec: number[]): number[] {
  let sumSquares = 0;
  for (const val of vec) {
    sumSquares += val * val;
  }
  const mag = Math.sqrt(sumSquares);
  if (mag === 0) return vec;
  return vec.map((v) => v / mag);
}

/**
 * High-dimensional semantic bag-of-words / character n-gram dense hashing vectorizer
 * Used as a robust local fallback when network or API quota limits occur.
 */
function generateFallbackEmbedding(text: string, dim = 768): number[] {
  const vec = new Array(dim).fill(0);
  const words = text.toLowerCase().split(/[\s,.-_()!?]+/).filter(Boolean);

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1;

    // Subword n-grams for semantic fuzzy overlap
    for (let i = 0; i < word.length - 2; i++) {
      const trigram = word.substring(i, i + 3);
      let triHash = 0;
      for (let j = 0; j < trigram.length; j++) {
        triHash = (triHash << 5) - triHash + trigram.charCodeAt(j);
        triHash |= 0;
      }
      const triIdx = Math.abs(triHash) % dim;
      vec[triIdx] += 0.4;
    }
  }

  return normalizeVector(vec);
}
