import fs from 'fs';
import path from 'path';
import { CONFIG, initDirectories } from './config';
import { DocumentChunk, DocumentMetadata, RetrievedChunk } from './types';
import { cosineSimilarity, createBatchEmbeddings } from './embeddings';

interface VectorStoreData {
  version: string;
  updatedAt: string;
  documents: Record<string, DocumentMetadata>;
  chunks: DocumentChunk[];
}

export class PersistentVectorStore {
  private documents: Map<string, DocumentMetadata> = new Map();
  private chunks: DocumentChunk[] = [];
  private isLoaded = false;

  constructor() {
    initDirectories();
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(CONFIG.VECTOR_STORE_FILE)) {
        const rawData = fs.readFileSync(CONFIG.VECTOR_STORE_FILE, 'utf-8');
        const parsed: VectorStoreData = JSON.parse(rawData);
        
        this.documents.clear();
        for (const [id, doc] of Object.entries(parsed.documents || {})) {
          this.documents.set(id, doc);
        }
        this.chunks = parsed.chunks || [];
        console.log(`[VectorStore] Loaded ${this.documents.size} documents and ${this.chunks.length} chunks from disk.`);
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('[VectorStore] Failed to load persistent vector store:', err);
      this.documents.clear();
      this.chunks = [];
      this.isLoaded = true;
    }
  }

  public saveToDisk() {
    try {
      const data: VectorStoreData = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        documents: Object.fromEntries(this.documents.entries()),
        chunks: this.chunks,
      };

      // Write atomically to temporary file then rename
      const tempPath = `${CONFIG.VECTOR_STORE_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, CONFIG.VECTOR_STORE_FILE);
      console.log(`[VectorStore] Successfully persisted ${this.chunks.length} chunks to disk.`);
    } catch (err) {
      console.error('[VectorStore] Error writing persistent index to disk:', err);
    }
  }

  public async addDocument(
    doc: DocumentMetadata,
    rawChunks: DocumentChunk[]
  ): Promise<void> {
    // If document already exists, remove previous chunks first
    if (this.documents.has(doc.id)) {
      this.deleteDocument(doc.id);
    }

    // Embed all chunks
    const textsToEmbed = rawChunks.map((c) => c.text);
    console.log(`[VectorStore] Generating embeddings for ${textsToEmbed.length} chunks...`);
    const embeddings = await createBatchEmbeddings(textsToEmbed);

    const indexedChunks: DocumentChunk[] = rawChunks.map((chunk, idx) => ({
      ...chunk,
      embedding: embeddings[idx],
    }));

    // Add to in-memory store
    this.documents.set(doc.id, {
      ...doc,
      chunkCount: indexedChunks.length,
      status: 'indexed',
    });

    this.chunks.push(...indexedChunks);

    // Save to persistent storage
    this.saveToDisk();
  }

  public getDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  public getDocument(id: string): DocumentMetadata | undefined {
    return this.documents.get(id);
  }

  public getDocumentChunks(documentId: string): DocumentChunk[] {
    return this.chunks.filter((c) => c.documentId === documentId);
  }

  public getAllChunks(): DocumentChunk[] {
    return this.chunks;
  }

  public deleteDocument(id: string): boolean {
    const exists = this.documents.has(id);
    if (!exists) return false;

    this.documents.delete(id);
    this.chunks = this.chunks.filter((c) => c.documentId !== id);

    this.saveToDisk();
    return true;
  }

  public clearAll(): void {
    this.documents.clear();
    this.chunks = [];
    this.saveToDisk();
  }

  /**
   * Performs vector similarity search with cosine ranking and optional document filtering
   */
  public similaritySearch(
    queryEmbedding: number[],
    topK = CONFIG.DEFAULT_TOP_K,
    filterDocumentIds?: string | string[]
  ): RetrievedChunk[] {
    let candidateChunks = this.chunks;
    if (filterDocumentIds) {
      if (Array.isArray(filterDocumentIds) && filterDocumentIds.length > 0) {
        const allowed = new Set(filterDocumentIds);
        candidateChunks = candidateChunks.filter((c) => allowed.has(c.documentId));
      } else if (typeof filterDocumentIds === 'string' && filterDocumentIds.trim()) {
        candidateChunks = candidateChunks.filter((c) => c.documentId === filterDocumentIds);
      }
    }

    if (candidateChunks.length === 0) {
      return [];
    }

    // Score all candidates
    const scoredChunks: RetrievedChunk[] = candidateChunks.map((chunk) => {
      const score = chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0;
      return {
        chunk,
        score,
      };
    });

    // Sort descending by similarity score
    scoredChunks.sort((a, b) => b.score - a.score);

    // Return top K
    return scoredChunks.slice(0, topK);
  }

  public getStats() {
    let storageSizeBytes = 0;
    try {
      if (fs.existsSync(CONFIG.VECTOR_STORE_FILE)) {
        storageSizeBytes = fs.statSync(CONFIG.VECTOR_STORE_FILE).size;
      }
    } catch {}

    return {
      documentCount: this.documents.size,
      chunkCount: this.chunks.length,
      embeddingDimension: this.chunks[0]?.embedding?.length || 768,
      storageSizeBytes,
      storagePath: CONFIG.VECTOR_STORE_FILE,
      isLoaded: this.isLoaded,
    };
  }
}

export const vectorStore = new PersistentVectorStore();
