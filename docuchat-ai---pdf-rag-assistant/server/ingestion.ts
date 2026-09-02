import fs from 'fs';
import path from 'path';
import * as pdfParseModule from 'pdf-parse';
import { PageText } from './chunking';
import { DocumentMetadata } from './types';

/**
 * Extracts text from a PDF file page by page to ensure accurate page-level citations.
 */
export async function extractTextByPage(filePath: string): Promise<PageText[]> {
  const dataBuffer = fs.readFileSync(filePath);
  const pages: PageText[] = [];

  try {
    // 1. Try PDFParse class (pdf-parse v2+)
    const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;
    if (PDFParseClass && typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: dataBuffer });
      const textResult = await parser.getText();

      if (textResult && Array.isArray(textResult.pages) && textResult.pages.length > 0) {
        for (const page of textResult.pages) {
          const pageNum = page.num || (pages.length + 1);
          const pageStr = typeof page.text === 'string' ? page.text.trim() : '';
          if (pageStr) {
            pages.push({
              pageNumber: pageNum,
              text: pageStr,
            });
          }
        }
      } else if (textResult && typeof textResult.text === 'string' && textResult.text.trim()) {
        // Single text string, split by page markers or form feed
        const splitPages = textResult.text.split(/\f|\x0C/);
        splitPages.forEach((txt: string, idx: number) => {
          if (txt.trim()) {
            pages.push({
              pageNumber: idx + 1,
              text: txt.trim(),
            });
          }
        });
      }

      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }

      if (pages.length > 0) {
        return pages;
      }
    }

    // 2. Try legacy function style (pdf-parse v1)
    const pdfParseFunc = typeof (pdfParseModule as any).default === 'function'
      ? (pdfParseModule as any).default
      : typeof (pdfParseModule as any) === 'function'
        ? (pdfParseModule as any)
        : null;

    if (pdfParseFunc) {
      const parsed = await pdfParseFunc(dataBuffer);
      if (parsed && parsed.text) {
        const rawPages = parsed.text.split(/\f|\x0C/);
        rawPages.forEach((text: string, idx: number) => {
          if (text.trim()) {
            pages.push({
              pageNumber: idx + 1,
              text: text.trim(),
            });
          }
        });
        if (pages.length > 0) return pages;
      }
    }

    // 3. Fallback: Parse text stream chunks from raw PDF structure
    const rawText = extractRawTextFromPdfBuffer(dataBuffer);
    if (rawText.trim()) {
      const charLimit = 1800;
      const total = rawText.length;
      let start = 0;
      let pNum = 1;
      while (start < total) {
        const end = Math.min(start + charLimit, total);
        const segment = rawText.slice(start, end).trim();
        if (segment) {
          pages.push({
            pageNumber: pNum++,
            text: segment,
          });
        }
        start = end;
      }
      return pages;
    }

    throw new Error('No readable text content found in PDF.');
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    // Last resort fallback
    const rawText = extractRawTextFromPdfBuffer(dataBuffer);
    if (rawText.trim()) {
      return [{
        pageNumber: 1,
        text: rawText.trim(),
      }];
    }
    throw new Error(`Failed to parse PDF: ${error.message || 'Unknown parsing error'}`);
  }
}

/**
 * Fallback parser to extract text tokens directly from PDF streams
 */
function extractRawTextFromPdfBuffer(buffer: Buffer): string {
  const content = buffer.toString('latin1');
  const textChunks: string[] = [];

  // Match text objects between BT (Begin Text) and ET (End Text)
  const btEtRegex = /BT[\s\S]*?ET/g;
  const matches = content.match(btEtRegex);

  if (matches) {
    for (const block of matches) {
      // Find strings in parentheses like (Hello world)
      const strRegex = /\(([^)]+)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(block)) !== null) {
        const decoded = strMatch[1]
          .replace(/\\([()\\])/g, '$1')
          .replace(/\\r/g, ' ')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, ' ');
        if (decoded.trim().length > 1) {
          textChunks.push(decoded);
        }
      }
    }
  }

  // Also catch Tj or TJ array strings
  if (textChunks.length === 0) {
    const tjRegex = /\[(.*?)\]\s*TJ/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(content)) !== null) {
      const inner = tjMatch[1];
      const strRegex = /\(([^)]+)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(inner)) !== null) {
        textChunks.push(strMatch[1]);
      }
    }
  }

  return textChunks.join(' ').replace(/\s+/g, ' ');
}

/**
 * Validates and sanitizes file names to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 100);
}

