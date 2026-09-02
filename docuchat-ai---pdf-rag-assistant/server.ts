import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { CONFIG, initDirectories } from './server/config';
import { extractTextByPage, sanitizeFilename } from './server/ingestion';
import { chunkDocumentPages } from './server/chunking';
import { vectorStore } from './server/vectorStore';
import { executeRAGQuery } from './server/rag';
import { retrieveRelevantChunks } from './server/retriever';
import { sessionMemory } from './server/memory';
import { DocumentMetadata } from './server/types';
import { SAMPLE_DOCUMENTS, loadSampleDocument, seedSampleDocumentsIfEmpty } from './server/samples';
import { EVALUATION_TEST_CASES, runEvaluationSuite } from './server/evaluation';

dotenv.config();
initDirectories();

// Setup Multer for PDF file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CONFIG.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = sanitizeFilename(file.originalname);
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: CONFIG.MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported for document indexing.'));
    }
  },
});

async function startServer() {
  const app = express();
  const PORT = CONFIG.PORT;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Seed sample documents on initial startup so the app is instantly usable
  seedSampleDocumentsIfEmpty().catch((err) =>
    console.error('Initial sample seeding error:', err)
  );

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const stats = vectorStore.getStats();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'DocuChat AI RAG Backend',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      vectorStore: stats,
    });
  });

  // Upload and index a PDF document
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname;
      const sanitizedName = sanitizeFilename(originalName);
      const documentId = `doc_${uuidv4().slice(0, 8)}`;

      console.log(`[API /upload] Parsing PDF: ${originalName} (${req.file.size} bytes)`);

      // 1. Extract text page-by-page
      const pages = await extractTextByPage(filePath);
      const totalChars = pages.reduce((acc, p) => acc + p.text.length, 0);

      if (totalChars < 20) {
        return res.status(422).json({
          error:
            'No extractable text found in this PDF. It may be a scanned image or empty document requiring OCR.',
          pageCount: pages.length,
        });
      }

      // 2. Chunk pages with page-aware metadata
      const rawChunks = chunkDocumentPages(documentId, sanitizedName, pages);

      if (rawChunks.length === 0) {
        return res.status(422).json({
          error: 'Document text could not be split into meaningful chunks.',
        });
      }

      // 3. Create metadata
      const metadata: DocumentMetadata = {
        id: documentId,
        filename: sanitizedName,
        originalName,
        fileSize: req.file.size,
        pageCount: pages.length,
        chunkCount: rawChunks.length,
        uploadedAt: new Date().toISOString(),
        sourceType: 'pdf',
        status: 'processing',
      };

      // 4. Index embeddings in persistent vector store
      await vectorStore.addDocument(metadata, rawChunks);

      const savedDoc = vectorStore.getDocument(documentId);
      res.json({
        success: true,
        document: savedDoc,
        message: `Successfully indexed ${pages.length} page(s) and ${rawChunks.length} vector chunk(s).`,
      });
    } catch (err: any) {
      console.error('[API /upload] Ingestion error:', err);
      res.status(500).json({
        error: err.message || 'Failed to process and index PDF.',
      });
    }
  });

  // List sample documents available to preload
  app.get('/api/sample-documents', (req, res) => {
    res.json(
      SAMPLE_DOCUMENTS.map((d) => ({
        id: d.id,
        filename: d.filename,
        title: d.title,
        description: d.description,
        fileSize: d.fileSize,
        pageCount: d.pages.length,
      }))
    );
  });

  // Load a pre-built sample document
  app.post('/api/upload-sample', async (req, res) => {
    try {
      const { sampleId } = req.body;
      if (!sampleId) {
        return res.status(400).json({ error: 'sampleId is required.' });
      }

      const doc = await loadSampleDocument(sampleId);
      res.json({
        success: true,
        document: doc,
        message: `Successfully indexed sample document '${doc.filename}'.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load sample document.' });
    }
  });

  // List all indexed documents
  app.get('/api/documents', (req, res) => {
    const docs = vectorStore.getDocuments();
    res.json(docs);
  });

  // Get specific document metadata
  app.get('/api/documents/:id', (req, res) => {
    const doc = vectorStore.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  });

  // Get all chunks for a document (for vector/chunk inspector)
  app.get('/api/documents/:id/chunks', (req, res) => {
    const doc = vectorStore.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const chunks = vectorStore.getDocumentChunks(req.params.id);
    res.json({
      document: doc,
      chunks: chunks.map((c) => ({
        id: c.id,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        charCount: c.charCount,
        text: c.text,
        hasEmbedding: !!c.embedding,
        embeddingDimension: c.embedding?.length || 0,
      })),
    });
  });

  // Delete a document and purge all its chunk vectors
  app.delete('/api/documents/:id', (req, res) => {
    const success = vectorStore.deleteDocument(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Document not found or already deleted.' });
    }
    res.json({ success: true, message: 'Document and embeddings deleted successfully.' });
  });

  // Main RAG Chat query endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { question, sessionId, topK, filterDocumentId, filterDocumentIds } = req.body;

      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: 'Question is required.' });
      }

      console.log(`[API /chat] Query: "${question.trim()}" (Session: ${sessionId || 'new'})`);

      const effectiveDocFilter = filterDocumentIds || filterDocumentId;

      const result = await executeRAGQuery(
        question.trim(),
        sessionId,
        topK ? parseInt(topK, 10) : undefined,
        effectiveDocFilter
      );

      res.json(result);
    } catch (err: any) {
      console.error('[API /chat] Error executing RAG pipeline:', err);
      res.status(500).json({
        error: err.message || 'An error occurred while generating grounded response.',
      });
    }
  });

  // Vector similarity search preview (without calling LLM)
  app.post('/api/vector-store/search-preview', async (req, res) => {
    try {
      const { query, topK, filterDocumentId } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required.' });
      }

      const retrieval = await retrieveRelevantChunks(
        query,
        undefined,
        topK ? parseInt(topK, 10) : CONFIG.DEFAULT_TOP_K,
        filterDocumentId
      );

      res.json({
        query,
        rewrittenQuery: retrieval.rewrittenQuery,
        retrievalTimeMs: retrieval.retrievalTimeMs,
        embeddingTimeMs: retrieval.embeddingTimeMs,
        topScore: retrieval.topScore,
        chunks: retrieval.chunks.map((item) => ({
          score: item.score,
          documentId: item.chunk.documentId,
          filename: item.chunk.filename,
          pageNumber: item.chunk.pageNumber,
          chunkId: item.chunk.id,
          text: item.chunk.text,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vector Store Statistics
  app.get('/api/vector-store/stats', (req, res) => {
    res.json(vectorStore.getStats());
  });

  // List all stored chunks for vector exploration
  app.get('/api/vector-store/chunks', (req, res) => {
    const allChunks = vectorStore.getAllChunks();
    res.json(
      allChunks.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        filename: c.filename,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        charCount: c.charCount,
        text: c.text,
        embeddingPreview: c.embedding ? c.embedding.slice(0, 5) : [],
        embeddingDimension: c.embedding?.length || 0,
      }))
    );
  });

  // Get session chat history
  app.get('/api/chat/history/:sessionId', (req, res) => {
    const session = sessionMemory.getOrCreateSession(req.params.sessionId);
    res.json(session);
  });

  // Clear session chat history
  app.delete('/api/chat/history/:sessionId', (req, res) => {
    sessionMemory.clearSession(req.params.sessionId);
    res.json({ success: true, message: 'Session history cleared.' });
  });

  // Evaluation endpoints
  app.get('/api/evaluation/tests', (req, res) => {
    res.json(EVALUATION_TEST_CASES);
  });

  app.post('/api/evaluation/run', async (req, res) => {
    try {
      console.log('[API /evaluation/run] Running automated RAG evaluation suite...');
      const report = await runEvaluationSuite();
      res.json(report);
    } catch (err: any) {
      console.error('[API /evaluation/run] Evaluation suite error:', err);
      res.status(500).json({ error: err.message || 'Evaluation run failed.' });
    }
  });

  // -------------------------------------------------------------
  // VITE & STATIC SERVING
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`DocuChat AI RAG Server active on http://0.0.0.0:${PORT}`);
    console.log(`Persistent vector storage: ${CONFIG.VECTOR_STORE_FILE}`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
