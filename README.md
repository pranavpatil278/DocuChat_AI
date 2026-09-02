# DocuChat_AI
A full-stack, enterprise-ready Retrieval-Augmented Generation (RAG) system with real-time PDF ingestion, recursive semantic chunking, dense vector similarity search, conversational query rewriting, strict citation grounding, and an automated 5-category evaluation benchmark.

- ## Architecture Overview

```
                                  USER INTERFACE (React + Tailwind CSS)
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │  Document Management Sidebar    │        Chat & Reasoning Pane        │  Source Accordion  │
  │  - Drag & Drop PDF Ingestion    │  - Multi-turn Conversational Memory │  - Cosine Rank     │
  │  - Active Source Filtering      │  - Interactive Citation Badges      │  - Page Citations  │
  │  - Embedded Sample Library      │  - Live Latency & Grounding Status  │  - Chunk Inspector │
  └─────────────────────────────────┴──────────────────┬──────────────────┴────────────────────┘
                                                       │
                                              REST API Requests (/api/*)
                                                       │
                                                       ▼
                                         BACKEND SERVER (Node.js / Express)
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │ 1. PDF Parser (Page extraction, unicode cleaning, layout boundary normalization)            │
  │ 2. Recursive Semantic Chunker (1000 char target, 150 char overlap, sentence preserving)     │
  │ 3. Embeddings Engine (gemini-embedding-2-preview, 768-dim normalized vectors)               │
  │ 4. Vector Store (Atomic disk-persisted JSON index, document filtering, cosine similarity)   │
  │ 5. Contextual Query Rewriter (Resolves multi-turn pronouns into standalone search queries)   │
  │ 6. Grounded Generator (Prompt construction, model fallback chain, citation parsing)         │
  │ 7. Automated Evaluation Benchmark (Known answer, cross-page, refusal, multi-doc, rewriting) │
  └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Features

- **End-to-End PDF Ingestion & Extraction**: Extracts text page-by-page from user-uploaded PDFs or pre-loaded industry samples, stripping control characters and normalizing whitespace.
- **Recursive Semantic Chunking**: Splits content at paragraph breaks (`\n\n`), line breaks (`\n`), and sentence boundaries (`. `) targeting ~1,000 characters with a 150-character sliding window overlap.
- **Dense Vector Search & Persistence**: Uses `gemini-embedding-2-preview` to generate 768-dimensional normalized embeddings stored in a local, atomic-persisted JSON vector store.
- **Multi-Turn Conversational Memory & Rewriter**: In multi-turn dialogues, ambiguous follow-up queries (e.g., *"What were its limitations?"*) are rewritten into explicit semantic queries before vector search.
- **Strict Grounding & Zero-Hallucination Guardrails**: Prompts enforce evidence-only answers and require refusal responses when confidence is low or relevant evidence is missing.
- **Interactive Citation Linkage**: Every claim is cited with `[Doc: filename, Page: X]` markers, rendered on the client as clickable badges that highlight source snippets in real time.
- **Automated RAG Evaluation Suite**: Built-in automated testing across 5 RAG failure modes (Known Answer, Cross-Page Synthesis, No-Evidence Refusal, Multi-Doc Query, and Query Rewriting).

---

## Project Structure

```
├── data/                       # Disk-persisted vector store & sample storage
│   └── vector_store.json
├── server/                     # Backend RAG pipeline modules
│   ├── chunking.ts             # Recursive character and sentence chunking logic
│   ├── config.ts               # Pipeline hyper-parameters and model declarations
│   ├── embeddings.ts           # Batch vector generation & cosine similarity calculations
│   ├── evaluation.ts           # Automated 5-category evaluation test runner
│   ├── ingestion.ts            # PDF parsing, sanitization, and sample bootstrap
│   ├── llm.ts                  # Prompt generation, model fallback chain, citation extractor
│   ├── memory.ts               # Multi-turn conversational session storage
│   ├── prompt.ts               # Grounded system instructions & context builder
│   ├── rag.ts                  # RAG orchestrator coordinating retrieval, prompt, & generation
│   ├── retriever.ts            # Query rewriting and top-K vector search
│   ├── samples.ts              # Pre-configured technical documents & test data
│   ├── types.ts                # Shared TypeScript definitions for RAG artifacts
│   └── vectorStore.ts          # Persistent vector index with atomic file writes
├── src/                        # Frontend React Application
│   ├── components/             # Modular UI components
│   │   ├── ChatInput.tsx       # Prompt submission and parameter controls
│   │   ├── ChatWindow.tsx      # Grounded chat stream and interactive citation badges
│   │   ├── ChunkViewerModal.tsx# Deep inspector for raw chunk boundaries and metadata
│   │   ├── DocumentList.tsx    # Upload manager, sample loader, and source filters
│   │   ├── EvaluationSuite.tsx # Benchmark test suite runner and metrics dashboard
│   │   ├── Navbar.tsx          # App header, model indicators, and system metrics
│   │   ├── SourceAccordionViewer.tsx # Side-by-side retrieved chunk inspector
│   │   ├── SourceCitationModal.tsx   # Detailed citation viewer
│   │   └── VectorInspectorModal.tsx  # Vector space similarity inspector
│   ├── services/
│   │   └── api.ts              # Typed client-side REST API client
│   ├── App.tsx                 # Root layout and state coordination
│   ├── main.tsx                # Client entry point
│   ├── index.css               # Tailwind CSS declarations
│   └── types.ts                # Client-side state and UI type definitions
├── package.json
├── server.ts                   # Express server entry point & API routes
└── tsconfig.json
```

---

### Installation & Setup

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

4. **Production Build:**
   ```bash
   npm run build
   npm start
   ```

---

## 👨‍💻 Author
**Pranav Patil**

- GitHub: https://github.com/pranavpatil278
- LinkedIn: https://www.linkedin.com/in/pranav-patil-5a3a793aa

## ⭐ Support
If you like this project, consider giving it a ⭐ on GitHub. Your support is appreciated!
