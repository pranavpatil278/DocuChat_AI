import React, { useState, useEffect } from 'react';
import { X, FileText, Layers, Copy, Check, Sparkles, Loader2 } from 'lucide-react';
import { DocumentChunk, DocumentMetadata } from '../types';
import { api } from '../services/api';

interface ChunkViewerModalProps {
  document: DocumentMetadata | null;
  onClose: () => void;
}

export const ChunkViewerModal: React.FC<ChunkViewerModalProps> = ({
  document,
  onClose,
}) => {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      loadChunks(document.id);
    }
  }, [document]);

  const loadChunks = async (docId: string) => {
    try {
      setLoading(true);
      const data = await api.getDocumentChunks(docId);
      setChunks(data.chunks);
    } catch (err) {
      console.error('Failed to load document chunks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div
        id="chunk-viewer-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight truncate max-w-md">
                {document.filename}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {document.pageCount} pages · {document.chunkCount} vector chunks indexed
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Loading document chunks...</span>
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No chunks found for this document.</div>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk, i) => (
                <div
                  key={chunk.id}
                  className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-semibold text-indigo-300">
                        Chunk #{i + 1}
                      </span>
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                        Page {chunk.pageNumber}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {chunk.charCount} chars · 768d vector
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(chunk.id, chunk.text)}
                      className="flex items-center space-x-1 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded transition-colors text-[11px]"
                    >
                      {copiedId === chunk.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-200 bg-slate-900/50 p-3 rounded-lg border border-slate-850 whitespace-pre-wrap">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
