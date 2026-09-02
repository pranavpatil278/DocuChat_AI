import { RetrievedChunk } from './types';

export interface GroundedPromptPayload {
  systemInstruction: string;
  userPrompt: string;
  contextText: string;
}

export function buildGroundedPrompt(
  question: string,
  retrievedChunks: RetrievedChunk[]
): GroundedPromptPayload {
  const systemInstruction = `You are DocuChat AI, an enterprise-grade document intelligence assistant.
Your absolute directive is to answer the user's question STRICTLY and ONLY using the provided retrieved document context.

CRITICAL RULES:
1. Grounded Answers: Every single factual statement, number, or claim must be directly supported by the context snippets below.
2. In-text Citations: Whenever you state a fact from the text, append an inline citation chip tag format: [Doc: <filename>, Page: <page_number>].
   Example: "The Transformer model uses an encoder-decoder architecture with 6 layers [Doc: attention.pdf, Page: 3]."
3. Explicit Refusal: If the provided document context DOES NOT contain the answer or does not provide enough evidence, you MUST explicitly state: "The uploaded documents do not contain sufficient information to answer this question." Do NOT hallucinate, guess, or use external knowledge.
4. Accuracy & Formatting: Be structured, clear, and concise. Use Markdown headings, bullet points, and bold text where helpful for readability.
5. Do NOT cite pages or files that are not present in the retrieved context.`;

  if (retrievedChunks.length === 0) {
    return {
      systemInstruction,
      userPrompt: `User Question: ${question}\n\nRetrieved Context: No relevant document chunks were found.`,
      contextText: '',
    };
  }

  const contextText = retrievedChunks
    .map((item, index) => {
      const { chunk, score } = item;
      return `--- CONTEXT CHUNK ${index + 1} ---
Document: ${chunk.filename}
Page: ${chunk.pageNumber}
Chunk ID: ${chunk.id}
Relevance Score: ${(score * 100).toFixed(1)}%
Content:
${chunk.text}
`;
    })
    .join('\n\n');

  const userPrompt = `Retrieved Document Context:
${contextText}

----------------------------------------
User Question: ${question}

Please answer the question thoroughly based ONLY on the retrieved document context above, citing every source with [Doc: filename, Page: X]. If not found, explicitly refuse.`;

  return {
    systemInstruction,
    userPrompt,
    contextText,
  };
}
