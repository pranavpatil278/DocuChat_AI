import React from 'react';
import {
  X,
  FileText,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Citation } from '../types';

interface SourceCitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export const SourceCitationModal: React.FC<SourceCitationModalProps> = ({
  citation,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!citation) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(citation.textSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const percentage = Math.round(citation.score * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="citation-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-sm tracking-tight truncate max-w-sm">
                  {citation.filename}
                </h3>
                <span className="bg-indigo-950 text-indigo-300 font-mono text-xs px-2 py-0.5 rounded border border-indigo-800/60">
                  Page {citation.pageNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Chunk ID: {citation.chunkId}
              </p>
            </div>
          </div>

          <button
            id="btn-close-citation-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs text-slate-300 flex-1">
          {/* Similarity & Vector Match Card */}
          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Vector Cosine Similarity Score</span>
              </span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                {percentage}% Match ({(citation.score).toFixed(4)})
              </span>
            </div>

            {/* Score progress bar */}
            <div className="w-full bg-slate-700/80 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Extracted Text Snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Retrieved Chunk Content (Raw Evidence)</span>
              </span>

              <button
                id="btn-copy-citation-text"
                onClick={handleCopy}
                className="flex items-center space-x-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-md transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 font-sans text-xs leading-relaxed whitespace-pre-wrap selection:bg-indigo-900 selection:text-white">
              {citation.textSnippet}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Source grounded directly via 768d vector retrieval
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
