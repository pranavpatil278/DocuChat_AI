import { GoogleGenAI } from '@google/genai';
import { createEmbedding } from './embeddings';
import { vectorStore } from './vectorStore';
import { sessionMemory } from './memory';
import { CONFIG } from './config';
import { RetrievedChunk } from './types';

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

/**
 * Rewrites a potentially ambiguous follow-up question into a standalone search query using conversational context.
 */
export async function rewriteQueryIfFollowUp(
  question: string,
  sessionId?: string
): Promise<string> {
  if (!sessionId) return question;

  const history = sessionMemory.getRecentMessages(sessionId, 4);
  if (history.length === 0) return question;

  // Check if question looks like a follow-up or pronoun reference
  const isPotentialFollowUp =
    /^(it|its|they|them|these|those|this|that|he|she|what about|and|why|how about|also|another)\b/i.test(question.trim()) ||
    question.split(' ').length < 5;

  if (!isPotentialFollowUp) return question;

  try {
    const ai = getAiClient();
    const historyText = history
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `Given the chat history and the user's latest follow-up question, rewrite the question into a clear, standalone search query that contains all necessary document search terms. Do not answer the question, only output the single rewritten search query string.

Chat History:
${historyText}

Follow-up Question: ${question}

Standalone Search Query:`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query rewrite timeout')), 3500)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const rewritten = response.text?.trim().replace(/^["']|["']$/g, '');
    if (rewritten && rewritten.length > 3 && rewritten.length < 200) {
      console.log(`[Retriever] Rewrote query: "${question}" -> "${rewritten}"`);
      return rewritten;
    }
  } catch (err) {
    console.warn('[Retriever] Query rewriting skipped/failed:', err);
  }

  return question;
}

export interface RetrievalResult {
  rewrittenQuery: string;
  chunks: RetrievedChunk[];
  retrievalTimeMs: number;
  embeddingTimeMs: number;
  topScore: number;
}

/**
 * Executes the full retrieval pipeline: Query rewriting -> Embedding -> Vector search -> Top-k ranking
 */
export async function retrieveRelevantChunks(
  question: string,
  sessionId?: string,
  topK = CONFIG.DEFAULT_TOP_K,
  filterDocumentIds?: string | string[]
): Promise<RetrievalResult> {
  const startTime = Date.now();

  // 1. Contextual Query Rewriting
  const rewrittenQuery = await rewriteQueryIfFollowUp(question, sessionId);

  // 2. Query Embedding
  const embedStartTime = Date.now();
  const queryEmbedding = await createEmbedding(rewrittenQuery);
  const embeddingTimeMs = Date.now() - embedStartTime;

  // 3. Vector Similarity Search against persistent storage
  const chunks = vectorStore.similaritySearch(queryEmbedding, topK, filterDocumentIds);
  const retrievalTimeMs = Date.now() - startTime;

  const topScore = chunks.length > 0 ? chunks[0].score : 0;

  return {
    rewrittenQuery,
    chunks,
    retrievalTimeMs,
    embeddingTimeMs,
    topScore,
  };
}
