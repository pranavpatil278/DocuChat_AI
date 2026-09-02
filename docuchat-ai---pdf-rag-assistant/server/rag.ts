import { retrieveRelevantChunks } from './retriever';
import { buildGroundedPrompt } from './prompt';
import { generateGroundedAnswer } from './llm';
import { sessionMemory } from './memory';
import { Citation, RAGMetrics } from './types';

export interface RAGExecutionResult {
  answer: string;
  citations: Citation[];
  metrics: RAGMetrics;
  rewrittenQuery?: string;
  sessionId: string;
}

export async function executeRAGQuery(
  question: string,
  sessionId?: string,
  topK?: number,
  filterDocumentIds?: string | string[]
): Promise<RAGExecutionResult> {
  const totalStartTime = Date.now();
  const session = sessionMemory.getOrCreateSession(sessionId);

  // 1. Retrieval Stage (Rewriting based on prior turns + Embedding + Vector Search)
  const retrievalResult = await retrieveRelevantChunks(
    question,
    session.id,
    topK,
    filterDocumentIds
  );

  // 2. Prompt Construction
  const promptPayload = buildGroundedPrompt(
    question,
    retrievalResult.chunks
  );

  // 3. Grounded Generation
  const generationResult = await generateGroundedAnswer(
    promptPayload.systemInstruction,
    promptPayload.userPrompt,
    retrievalResult.chunks
  );

  const totalTimeMs = Date.now() - totalStartTime;

  const metrics: RAGMetrics = {
    retrievalTimeMs: retrievalResult.retrievalTimeMs,
    embeddingTimeMs: retrievalResult.embeddingTimeMs,
    generationTimeMs: generationResult.generationTimeMs,
    totalTimeMs,
    chunksRetrieved: retrievalResult.chunks.length,
    topScore: retrievalResult.topScore,
    rewrittenQuery:
      retrievalResult.rewrittenQuery !== question ? retrievalResult.rewrittenQuery : undefined,
    grounded: generationResult.grounded,
  };

  // 4. Record user query and assistant response in session memory
  sessionMemory.addMessage(session.id, {
    role: 'user',
    content: question,
  });

  sessionMemory.addMessage(session.id, {
    role: 'assistant',
    content: generationResult.answer,
    citations: generationResult.citations,
    metrics,
  });

  return {
    answer: generationResult.answer,
    citations: generationResult.citations,
    metrics,
    rewrittenQuery: metrics.rewrittenQuery,
    sessionId: session.id,
  };
}
