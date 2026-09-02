import { DocumentChunk } from './types';
import { CONFIG } from './config';

export interface PageText {
  pageNumber: number;
  text: string;
}

/**
 * Splits extracted pages into chunks while strictly preserving page-aware metadata.
 */
export function chunkDocumentPages(
  documentId: string,
  filename: string,
  pages: PageText[],
  chunkSize = CONFIG.CHUNK_SIZE,
  chunkOverlap = CONFIG.CHUNK_OVERLAP
): DocumentChunk[] {
  const allChunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text.trim();
    if (!pageText) continue;

    // Split page text into chunks
    const pageChunks = splitTextRecursively(pageText, chunkSize, chunkOverlap);

    for (const chunkText of pageChunks) {
      if (chunkText.trim().length < 20) continue; // Ignore trivial whitespace/punctuation chunks

      allChunks.push({
        id: `${documentId}_p${page.pageNumber}_c${chunkIndex}`,
        documentId,
        filename,
        pageNumber: page.pageNumber,
        chunkIndex,
        totalChunksInDoc: 0, // will be updated below
        text: chunkText.trim(),
        charCount: chunkText.trim().length,
      });

      chunkIndex++;
    }
  }

  // Update totalChunksInDoc
  const total = allChunks.length;
  for (const chunk of allChunks) {
    chunk.totalChunksInDoc = total;
  }

  return allChunks;
}

/**
 * Recursive character text splitter algorithm.
 * Splits on paragraphs -> sentences -> words -> characters with overlap.
 */
function splitTextRecursively(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const separators = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '];
  
  function split(textToSplit: string, sepIndex: number): string[] {
    if (textToSplit.length <= chunkSize) {
      return [textToSplit];
    }

    if (sepIndex >= separators.length) {
      // Hard chunking fallback if no separator fits
      const chunks: string[] = [];
      let i = 0;
      while (i < textToSplit.length) {
        const end = Math.min(i + chunkSize, textToSplit.length);
        chunks.push(textToSplit.slice(i, end));
        i += chunkSize - chunkOverlap;
      }
      return chunks;
    }

    const separator = separators[sepIndex];
    const splits = textToSplit.split(separator);
    const result: string[] = [];
    let currentChunk = '';

    for (let i = 0; i < splits.length; i++) {
      const piece = splits[i];
      const pieceWithSep = (currentChunk ? separator : '') + piece;

      if ((currentChunk + pieceWithSep).length <= chunkSize) {
        currentChunk += pieceWithSep;
      } else {
        if (currentChunk.trim()) {
          result.push(currentChunk.trim());
        }

        // If a single piece is larger than chunkSize, recursively split with next separator
        if (piece.length > chunkSize) {
          const subChunks = split(piece, sepIndex + 1);
          result.push(...subChunks);
          currentChunk = '';
        } else {
          // Carry over overlap from previous chunk if possible
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
          const overlapText = currentChunk.slice(overlapStart);
          currentChunk = overlapText + (overlapText ? separator : '') + piece;
          if (currentChunk.length > chunkSize) {
            currentChunk = piece;
          }
        }
      }
    }

    if (currentChunk.trim()) {
      result.push(currentChunk.trim());
    }

    return result;
  }

  return split(text, 0);
}
