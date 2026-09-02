import { DocumentMetadata } from './types';
import { PageText, chunkDocumentPages } from './chunking';
import { vectorStore } from './vectorStore';

export interface SampleDocDef {
  id: string;
  filename: string;
  originalName: string;
  title: string;
  description: string;
  fileSize: number;
  pages: PageText[];
}

export const SAMPLE_DOCUMENTS: SampleDocDef[] = [
  {
    id: 'doc_transformer_paper',
    filename: 'Attention_Is_All_You_Need.pdf',
    originalName: 'Attention Is All You Need (Vaswani et al.)',
    title: 'Attention Is All You Need (Transformer Architecture)',
    description: 'Foundational paper introducing Transformer architecture, Multi-Head Self-Attention, and Positional Encodings.',
    fileSize: 412000,
    pages: [
      {
        pageNumber: 1,
        text: `Attention Is All You Need
Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin

Abstract:
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs.

1. Introduction
Recurrent neural networks, long short-term memory (LSTM) and gated recurrent neural networks (GRUs) in particular, have been firmly established as state of the art approaches in sequence modeling. Recurrent models typically factor computation along the symbol positions of the input and output sequences. This inherent sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples. Attention mechanisms have become an integral part of compelling sequence modeling and transduction models in various tasks, allowing modeling of dependencies without regard to their distance in the input or output sequences.`,
      },
      {
        pageNumber: 2,
        text: `3. Model Architecture
Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations (x1, ..., xn) to a sequence of continuous representations z = (z1, ..., zn). Given z, the decoder then generates an output sequence (y1, ..., ym) of symbols one element at a time. At each step the model is auto-regressive, consuming the previously generated symbols as additional input when generating the next.

The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder.

Encoder: The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network. We employ a residual connection around each of the two sub-layers, followed by layer normalization. That is, the output of each sub-layer is LayerNorm(x + Sublayer(x)), where Sublayer(x) is the function implemented by the sub-layer itself. To facilitate these residual connections, all sub-layers in the model, as well as the embedding layers, produce outputs of dimension d_model = 512.

Decoder: The decoder is also composed of a stack of N = 6 identical layers. In addition to the two sub-layers in each encoder layer, the decoder inserts a third sub-layer, which performs multi-head attention over the output of the encoder stack. Similar to the encoder, we employ residual connections around each of the sub-layers, followed by layer normalization. We also modify the self-attention sub-layer in the decoder stack to prevent positions from attending to subsequent positions. This masking, combined with fact that the output embeddings are offset by one position, ensures that the predictions for position i can depend only on the known outputs at positions less than i.`,
      },
      {
        pageNumber: 3,
        text: `3.2 Attention Mechanisms
An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.

3.2.1 Scaled Dot-Product Attention
We call our particular attention "Scaled Dot-Product Attention". The input consists of queries and keys of dimension d_k, and values of dimension d_v. We compute the dot products of the query with all keys, divide each by sqrt(d_k), and apply a softmax function to obtain the weights on the values.
In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix Q. The keys and values are also packed into matrices K and V. We compute the matrix of outputs as:
Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V

We compute scaled dot-product attention because for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(d_k).

3.2.2 Multi-Head Attention
Instead of performing a single attention function with d_model-dimensional keys, values and queries, we found it beneficial to linearly project the queries, keys and values h times with different, learned linear projections to d_k, d_k and d_v dimensions, respectively. On each of these projected versions of queries, keys and values we then perform the attention function in parallel, yielding d_v-dimensional output values. In this work we employ h = 8 parallel attention heads. For each of these we use d_k = d_v = d_model / h = 64.`,
      },
      {
        pageNumber: 4,
        text: `3.5 Positional Encoding
Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence. To this end, we add "positional encodings" to the input embeddings at the bottoms of the encoder and decoder stacks. The positional encodings have the same dimension d_model as the embeddings, so that the two can be summed. There are many choices of positional encodings, learned and fixed.

In this work, we use sine and cosine functions of different frequencies:
PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
where pos is the position and i is the dimension. That is, each dimension of the positional encoding corresponds to a sinusoid. The wavelengths form a geometric progression from 2*pi to 10000 * 2*pi. We chose this function because we hypothesized it would allow the model to easily learn to attend by relative positions, since for any fixed offset k, PE(pos+k) can be represented as a linear function of PE(pos).

4. Why Self-Attention
In Table 1, we compare various aspects of self-attention layers to the recurrent and convolutional layers commonly used for mapping one variable-length sequence of symbol representations to another. Three desiderata motivate our choice:
1. Total computational complexity per layer.
2. The amount of computation that can be parallelized, measured by the minimum number of sequential operations required.
3. Path length between long-range dependencies in the network. Self-attention layers connect all positions with a constant number O(1) of sequentially executed operations.`,
      },
      {
        pageNumber: 5,
        text: `5. Training and Results
5.1 Training Data and Batching
We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs. Sentences were encoded using byte-pair encoding, which has a shared source-target vocabulary of about 37,000 tokens. For English-French, we used the significantly larger WMT 2014 English-French dataset consisting of 36 million sentences and split tokens into a 32,000 word-piece vocabulary. Sentence pairs were batched together by approximate sequence length. Each training batch contained a set of sentence pairs containing approximately 25,000 source tokens and 25,000 target tokens.

5.2 Hardware and Schedule
We trained our models on one machine with 8 NVIDIA P100 GPUs. For our base models using the hyperparameters described throughout the paper, each training step took about 0.4 seconds. We trained the base models for a total of 100,000 steps or 12 hours. For our big models, step time was 1.0 second. The big models were trained for 300,000 steps (3.5 days).

5.3 Optimizer
We used the Adam optimizer with beta1 = 0.9, beta2 = 0.98 and epsilon = 10^-9. We varied the learning rate over the course of training according to the formula:
lrate = d_model^(-0.5) * min(step_num^(-0.5), step_num * warmup_steps^(-1.5))
This corresponds to increasing the learning rate linearly for the first warmup_steps = 4000 training steps, and decreasing it thereafter proportionally to the inverse square root of the step number.

6. Conclusion
In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-head self-attention. For translation tasks, the Transformer can be trained significantly faster than architectures based on recurrent or convolutional layers.`,
      },
    ],
  },
  {
    id: 'doc_rag_system_spec',
    filename: 'DocuChat_System_Architecture_Spec.pdf',
    originalName: 'DocuChat AI System Architecture & RAG Specification',
    title: 'DocuChat RAG Architecture & Benchmarking Spec',
    description: 'Complete specification for FastAPI backend, ChromaDB vector store, citations pipeline, and evaluation metrics.',
    fileSize: 284000,
    pages: [
      {
        pageNumber: 1,
        text: `DocuChat AI: Production RAG Architectural Specification
Document Version: 2.4 | Status: Approved Production Standard

1. System Purpose & Core Invariants
DocuChat AI is designed to provide high-throughput, factual retrieval-augmented generation over uploaded PDF documents. The core architectural invariant is zero-hallucination tolerance: all output must be strictly supported by retrieved context with verifiable page citations.

2. Document Ingestion Subsystem
The ingestion pipeline accepts PDF files through the /upload endpoint. File sizes are capped at 20MB per file. During ingestion, the server performs page-by-page text parsing using an isolated memory buffer. The metadata extractor assigns each document a unique UUID, tracks total pages, records upload timestamps, and preserves the original filename. Empty extracted text triggers a specific warning alerting the user that the file may be a scanned image requiring optical character recognition (OCR).`,
      },
      {
        pageNumber: 2,
        text: `3. Chunking & Embeddings Engine
Chunks are generated using a recursive character splitting algorithm with a target chunk size of 900 characters and an overlap window of 150 characters. Each chunk maintains a deterministic composite ID formatted as: {document_id}_p{page_number}_c{chunk_index}.

Embedding Generation:
The server integrates with the Gemini Embeddings API (gemini-embedding-2-preview) producing 768-dimensional normalized dense vectors. Chunks are embedded in batches of 10 to balance throughput and API rate limits. All vectors are cached in memory to accelerate repeated queries.

Vector Storage & Indexing:
Embeddings and chunk texts are serialized directly to disk in JSON format within the persistent storage directory data/vector_store/index.json. The PersistentVectorStore client supports atomic writes via temporary file renaming to prevent database corruption during concurrent ingestion operations.`,
      },
      {
        pageNumber: 3,
        text: `4. Retrieval & Grounded Prompt Orchestration
When a user submits a query via POST /chat, the system executes the following steps:
1. Query Analysis & Contextual Expansion: If active session memory exists, the query rewriter expands ambiguous pronouns or follow-up references into a standalone search query.
2. Vector Similarity Search: The rewritten query is embedded and compared against all indexed chunk vectors using cosine similarity. The top-k most similar chunks (default k=5) exceeding the minimum score threshold of 0.25 are selected.
3. Prompt Assembly: The system prompt instructs Gemini 3.7 Flash to act as a strict document assistant, grounding every claim with [Doc: <filename>, Page: <page_number>] citations and explicitly refusing if information is missing.
4. Latency Tracking: Each stage records its execution time (retrievalTimeMs, embeddingTimeMs, generationTimeMs, totalTimeMs) returned in the response envelope.`,
      },
    ],
  },
  {
    id: 'doc_solar_tech_spec',
    filename: 'SolarFlow_Battery_Storage_Technical_Guide.pdf',
    originalName: 'SolarFlow Smart Battery Storage System Manual',
    title: 'SolarFlow Commercial Battery Storage Guide',
    description: 'Technical specifications, operating temperatures, thermal safety, warranty terms, and maintenance protocols.',
    fileSize: 320000,
    pages: [
      {
        pageNumber: 1,
        text: `SolarFlow Pro Commercial Energy Storage System
Technical Manual & Installation Guide | Model SF-8000-X

1. Product Overview & Electrical Specifications
The SolarFlow Pro SF-8000-X is an integrated lithium iron phosphate (LiFePO4) energy storage system engineered for commercial microgrids and residential peak-shaving applications.
- Nominal Storage Capacity: 14.4 kWh (expandable up to 57.6 kWh with 4 modular units in parallel)
- Nominal System Voltage: 51.2 V DC
- Maximum Continuous Charge Current: 150 A (7.68 kW max power)
- Maximum Continuous Discharge Current: 200 A (10.24 kW surge power for 10 seconds)
- Round-Trip Energy Efficiency: 96.5% at 0.5C rate at 25 degrees Celsius
- Cycle Life: 6,000 cycles at 80% Depth of Discharge (DoD) before retaining 70% of initial capacity.`,
      },
      {
        pageNumber: 2,
        text: `2. Thermal Management & Safety Features
Operating Environment:
- Operating Temperature Range (Discharge): -20 deg C to +55 deg C (-4 deg F to 131 deg F)
- Operating Temperature Range (Charging): 0 deg C to +45 deg C (32 deg F to 113 deg F). The built-in intelligent internal thermal heater activates automatically below 5 deg C to prevent lithium plating during cold-weather charging.
- IP Rating: IP65 weather-resistant enclosure for indoor or shaded outdoor installations.
- Cooling Mechanism: Natural convection with integrated aluminum heatsink; zero external cooling fans required, ensuring silent 0 dB operation.

Safety Protections:
The system incorporates a dual-core Battery Management System (BMS) with hardware-level overvoltage, undervoltage, short-circuit, and cell imbalance protection. In the event of a thermal runaway trigger (>75 deg C), the aerosol fire suppression canister discharges within 2.5 seconds to extinguish internal flames.`,
      },
      {
        pageNumber: 3,
        text: `3. Warranty & Routine Maintenance
Warranty Coverage:
SolarFlow Energy Technologies warrants the SF-8000-X system against defects in materials and workmanship for a period of 10 years or a cumulative energy throughput of 48 MWh per 14.4 kWh module, whichever occurs first. The warranty guarantees a minimum of 70% usable capacity retention at the end of the 10-year term.

Routine Maintenance Schedule:
- Monthly: Inspect external terminal connections and verify LED status ring indicators (Solid Green = Normal Operation; Pulsing Amber = Charging/Balancing; Blinking Red = Fault code).
- Bi-annually: Perform a torque check on high-voltage DC terminal lugs (recommended torque: 9.5 N*m). Clean ventilation fins using compressed air.
- Annually: Execute a full calibration cycle (discharge to 10% DoD, followed by continuous charge to 100% at 0.2C rate) to recalibrate the BMS state-of-charge estimator.`,
      },
    ],
  },
];

/**
 * Seeds pre-built sample documents into vector storage if empty
 */
export async function seedSampleDocumentsIfEmpty(): Promise<void> {
  const existingDocs = vectorStore.getDocuments();
  if (existingDocs.length > 0) {
    console.log(`[Samples] Vector store already contains ${existingDocs.length} documents.`);
    return;
  }

  console.log('[Samples] Seeding initial sample documents into persistent vector store...');
  for (const sample of SAMPLE_DOCUMENTS) {
    await loadSampleDocument(sample.id);
  }
}

/**
 * Loads a specific sample document and indexes its chunks
 */
export async function loadSampleDocument(sampleId: string): Promise<DocumentMetadata> {
  const sample = SAMPLE_DOCUMENTS.find((s) => s.id === sampleId);
  if (!sample) {
    throw new Error(`Sample document '${sampleId}' not found.`);
  }

  const docMetadata: DocumentMetadata = {
    id: sample.id,
    filename: sample.filename,
    originalName: sample.originalName,
    fileSize: sample.fileSize,
    pageCount: sample.pages.length,
    chunkCount: 0,
    uploadedAt: new Date().toISOString(),
    sourceType: 'sample',
    status: 'processing',
    summary: sample.description,
  };

  const chunks = chunkDocumentPages(sample.id, sample.filename, sample.pages);
  await vectorStore.addDocument(docMetadata, chunks);

  console.log(`[Samples] Indexed sample document '${sample.filename}' with ${chunks.length} chunks.`);
  return vectorStore.getDocument(sample.id)!;
}
