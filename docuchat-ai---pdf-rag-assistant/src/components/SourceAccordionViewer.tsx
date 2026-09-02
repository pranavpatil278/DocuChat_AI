import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
  Sparkles,
  Search,
  Layers,
  Info,
  CheckCircle2,
  X,
  ChevronsUpDown,
} from 'lucide-react';
import { Citation, DocumentMetadata } from '../types';

interface SourceAccordionViewerProps {
  citations: Citation[];
  activeCitationId: string | null;
  onSelectCitation: (citation: Citation) => void;
  onInspectDocument?: (filename: string) => void;
  activeDocuments: DocumentMetadata[];
  isOpen: boolean;
  onToggleOpen: () => void;
  lastQuery?: string;
}

export const SourceAccordionViewer: React.FC<SourceAccordionViewerProps> = ({
  citations,
  activeCitationId,
  onSelectCitation,
  onInspectDocument,
  activeDocuments,
  isOpen,
  onToggleOpen,
  lastQuery,
}) => {
  // Set of expanded chunk IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  // Expand all by default when new citations arrive or auto-expand active citation
  useEffect(() => {
    if (citations.length > 0) {
      // Default: Expand top 2 or all if fewer
      const initial = new Set<string>();
      citations.forEach((c, idx) => {
        if (idx < 2 || c.chunkId === activeCitationId) {
          initial.add(c.chunkId);
        }
      });
      setExpandedIds(initial);
    }
  }, [citations]);

  // When activeCitationId changes (e.g. clicked an inline badge in chat), ensure it's expanded and scrolled to
  useEffect(() => {
    if (activeCitationId) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(activeCitationId);
        return next;
      });

      // Scroll into view
      setTimeout(() => {
        const el = document.getElementById(`source-accordion-card-${activeCitationId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [activeCitationId]);

  const toggleExpand = (chunkId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedIds(new Set(citations.map((c) => c.chunkId)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleCopySnippet = (chunkId: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(chunkId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter citations by search query if user filters
  const filteredCitations = citations.filter((c) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      c.filename.toLowerCase().includes(q) ||
      c.textSnippet.toLowerCase().includes(q) ||
      `page ${c.pageNumber}`.includes(q) ||
      `p. ${c.pageNumber}`.includes(q)
    );
  });

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400 bg-emerald-950/80 border-emerald-700/60';
    if (score >= 0.6) return 'text-cyan-400 bg-cyan-950/80 border-cyan-700/60';
    if (score >= 0.4) return 'text-amber-400 bg-amber-950/80 border-amber-700/60';
    return 'text-slate-400 bg-slate-800 border-slate-700';
  };

  if (!isOpen) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-start p-2 border-l border-slate-800 bg-slate-900/70 w-12 flex-shrink-0">
        <button
          id="btn-open-sources-sidebar"
          onClick={onToggleOpen}
          title="Open Sources & Citations Viewer"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all shadow-md group mt-2"
        >
          <BookOpen className="w-4 h-4" />
        </button>
        {citations.length > 0 && (
          <span className="mt-2 text-[10px] font-mono bg-indigo-900/90 text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-700/50">
            {citations.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <aside
      id="right-sources-accordion-pane"
      className="w-80 sm:w-96 lg:w-[410px] flex-shrink-0 border-l border-slate-800 bg-slate-900/95 flex flex-col h-full overflow-hidden z-10 transition-all shadow-xl"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <span>Source Verification</span>
              {citations.length > 0 && (
                <span className="text-[10px] font-mono bg-indigo-900/80 text-indigo-200 px-1.5 py-0.2 rounded-full border border-indigo-700/50">
                  {citations.length}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">Side-by-side evidence inspection</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {citations.length > 0 && (
            <>
              <button
                id="btn-expand-all-sources"
                onClick={expandedIds.size === citations.length ? handleCollapseAll : handleExpandAll}
                title={expandedIds.size === citations.length ? 'Collapse all' : 'Expand all'}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs transition-colors flex items-center space-x-1"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">
                  {expandedIds.size === citations.length ? 'Collapse' : 'Expand'}
                </span>
              </button>
            </>
          )}

          <button
            id="btn-close-sources-sidebar"
            onClick={onToggleOpen}
            title="Collapse sources panel"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter / Search within citations */}
      {citations.length > 2 && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter retrieved snippets or page..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Accordion List Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
        {citations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              No Sources Retrieved Yet
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              When you ask a question, the vector engine fetches matching PDF pages and displays the exact evidence snippets here in real time.
            </p>
          </div>
        ) : filteredCitations.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No source snippets match "{filterText}".
          </div>
        ) : (
          filteredCitations.map((citation, index) => {
            const isExpanded = expandedIds.has(citation.chunkId);
            const isTargeted = activeCitationId === citation.chunkId;

            return (
              <div
                key={citation.chunkId || index}
                id={`source-accordion-card-${citation.chunkId}`}
                className={`rounded-xl border transition-all duration-200 ${
                  isTargeted
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-850/90'
                }`}
              >
                {/* Accordion Card Header */}
                <div
                  id={`btn-toggle-source-${citation.chunkId}`}
                  onClick={() => {
                    toggleExpand(citation.chunkId);
                    onSelectCitation(citation);
                  }}
                  className="p-3 cursor-pointer select-none flex items-start justify-between space-x-2"
                >
                  <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-slate-200 truncate">
                          {citation.filename}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-800/50">
                          Page {citation.pageNumber}
                        </span>

                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getScoreColor(
                            citation.score
                          )}`}
                        >
                          {(citation.score * 100).toFixed(0)}% Match
                        </span>

                        {isTargeted && (
                          <span className="text-[10px] text-amber-300 font-semibold flex items-center space-x-1 animate-pulse">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Active Badge</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                    <button
                      id={`btn-copy-snippet-${citation.chunkId}`}
                      onClick={(e) => handleCopySnippet(citation.chunkId, citation.textSnippet, e)}
                      title="Copy snippet"
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-750 rounded transition-colors"
                    >
                      {copiedId === citation.chunkId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div className="p-1 text-slate-400 hover:text-slate-200">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion Card Body */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 animate-in fade-in duration-150">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar whitespace-pre-wrap selection:bg-indigo-900 selection:text-indigo-200">
                      {citation.textSnippet}
                    </div>

                    {/* Metadata footer */}
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Chunk ID: {citation.chunkId}</span>
                      {onInspectDocument && (
                        <button
                          id={`btn-inspect-from-source-${citation.chunkId}`}
                          onClick={() => onInspectDocument(citation.filename)}
                          className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Inspect Doc Chunks</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer Info */}
      {citations.length > 0 && (
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{citations.length} verified context chunks</span>
          <span className="text-indigo-400">Cosine Similarity Ranked</span>
        </div>
      )}
    </aside>
  );
};
