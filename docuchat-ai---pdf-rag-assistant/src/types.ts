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
  pageNumber: number;
  chunkIndex: number;
  charCount: number;
  text: string;
  hasEmbedding?: boolean;
  embeddingDimension?: number;
  embeddingPreview?: number[];
  filename?: string;
  documentId?: string;
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

export interface VectorStoreStats {
  documentCount: number;
  chunkCount: number;
  embeddingDimension: number;
  storageSizeBytes: number;
  storagePath: string;
  isLoaded: boolean;
}

export interface SampleDocInfo {
  id: string;
  filename: string;
  title: string;
  description: string;
  fileSize: number;
  pageCount: number;
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

export interface EvaluationReport {
  summary: {
    totalTests: number;
    passed: number;
    warnings: number;
    failed: number;
    overallAccuracy: number;
    avgLatencyMs: number;
    avgRetrievalTimeMs: number;
    avgGenerationTimeMs: number;
  };
  results: EvaluationResult[];
}
