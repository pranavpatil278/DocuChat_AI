import path from 'path';
import fs from 'fs';

export const CONFIG = {
  PORT: 3000,
  DATA_DIR: path.join(process.cwd(), 'data'),
  UPLOADS_DIR: path.join(process.cwd(), 'data', 'uploads'),
  VECTOR_STORE_DIR: path.join(process.cwd(), 'data', 'vector_store'),
  VECTOR_STORE_FILE: path.join(process.cwd(), 'data', 'vector_store', 'index.json'),
  
  // Chunking parameters based on blueprint
  CHUNK_SIZE: 900, // characters (~200 tokens)
  CHUNK_OVERLAP: 150, // characters (~35 tokens)
  
  // Retrieval parameters
  DEFAULT_TOP_K: 5,
  MIN_SIMILARITY_SCORE: 0.25, // Cosine threshold
  
  // Models
  EMBEDDING_MODEL: 'gemini-embedding-2-preview',
  LLM_MODEL: 'gemini-3.1-flash-lite',
  
  // Max upload size (20MB)
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,
};

// Ensure all persistent storage directories exist
export function initDirectories() {
  if (!fs.existsSync(CONFIG.DATA_DIR)) {
    fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
    fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.VECTOR_STORE_DIR)) {
    fs.mkdirSync(CONFIG.VECTOR_STORE_DIR, { recursive: true });
  }
}
