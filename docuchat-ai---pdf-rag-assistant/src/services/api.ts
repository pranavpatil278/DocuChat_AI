import {
  DocumentMetadata,
  DocumentChunk,
  ChatMessage,
  RAGMetrics,
  VectorStoreStats,
  SampleDocInfo,
  EvaluationReport,
  Citation,
} from '../types';

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  metrics: RAGMetrics;
  rewrittenQuery?: string;
  sessionId: string;
}

export const api = {
  // Documents
  async getDocuments(): Promise<DocumentMetadata[]> {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadPdf(file: File): Promise<{ success: boolean; document: DocumentMetadata; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload PDF');
    }
    return data;
  },

  async getSampleDocuments(): Promise<SampleDocInfo[]> {
    const res = await fetch('/api/sample-documents');
    if (!res.ok) throw new Error('Failed to fetch sample documents');
    return res.json();
  },

  async loadSampleDocument(sampleId: string): Promise<{ success: boolean; document: DocumentMetadata; message: string }> {
    const res = await fetch('/api/upload-sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load sample document');
    }
    return data;
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete document');
    }
  },

  async getDocumentChunks(id: string): Promise<{ document: DocumentMetadata; chunks: DocumentChunk[] }> {
    const res = await fetch(`/api/documents/${id}/chunks`);
    if (!res.ok) throw new Error('Failed to fetch document chunks');
    return res.json();
  },

  // Chat
  async sendChat(
    question: string,
    sessionId?: string,
    topK?: number,
    filterDocumentId?: string | string[],
    filterDocumentIds?: string[]
  ): Promise<ChatResponse> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        sessionId,
        topK,
        filterDocumentId: typeof filterDocumentId === 'string' ? filterDocumentId : undefined,
        filterDocumentIds: Array.isArray(filterDocumentId) ? filterDocumentId : filterDocumentIds,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate answer');
    }
    return data;
  },

  async getChatHistory(sessionId: string): Promise<{ messages: ChatMessage[] }> {
    const res = await fetch(`/api/chat/history/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async clearChatHistory(sessionId: string): Promise<void> {
    const res = await fetch(`/api/chat/history/${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear chat history');
  },

  // Vector Store Stats & Exploration
  async getVectorStats(): Promise<VectorStoreStats> {
    const res = await fetch('/api/vector-store/stats');
    if (!res.ok) throw new Error('Failed to fetch vector store stats');
    return res.json();
  },

  async getAllChunks(): Promise<DocumentChunk[]> {
    const res = await fetch('/api/vector-store/chunks');
    if (!res.ok) throw new Error('Failed to fetch chunks');
    return res.json();
  },

  async searchVectorPreview(query: string, topK?: number, filterDocumentId?: string) {
    const res = await fetch('/api/vector-store/search-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK, filterDocumentId }),
    });
    if (!res.ok) throw new Error('Vector search preview failed');
    return res.json();
  },

  // Evaluation
  async runEvaluation(): Promise<EvaluationReport> {
    const res = await fetch('/api/evaluation/run', {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Evaluation failed');
    return data;
  },
};
