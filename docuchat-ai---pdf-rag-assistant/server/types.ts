export interface DocumentMetadata {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  pageCount: number;
  chunkCount: number;
  uploadedAt: string;
  sourceType: 'pdf' | 'sample';
  status: 'indexed' | 'processing' | 'error';
  error?: string;
  summary?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  filename: string;
  pageNumber: number;
  chunkIndex: number;
  totalChunksInDoc: number;
  text: string;
  charCount: number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface RetrievedChunk {
  chunk: DocumentChunk;
  score: number; // Cosine similarity 0.0 - 1.0
}

export interface Citation {
  filename: string;
  pageNumber: number;
  chunkId: string;
  score: number;
  textSnippet: string;
}

export interface RAGMetrics {
  retrievalTimeMs: number;
  embeddingTimeMs: number;
  generationTimeMs: number;
  totalTimeMs: number;
  chunksRetrieved: number;
  topScore: number;
  rewrittenQuery?: string;
  promptTokensEstimate?: number;
  grounded: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  metrics?: RAGMetrics;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationResult {
  id: string;
  category: 'known_answer' | 'cross_page' | 'no_evidence_refusal' | 'multi_doc' | 'ambiguous_followup';
  question: string;
  expectedBehavior: string;
  actualAnswer: string;
  grounded: boolean;
  retrievalHit: boolean;
  score: number;
  latencyMs: number;
  citationsCount: number;
  status: 'passed' | 'warning' | 'failed';
  details: string;
}
