import React, { useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage, Citation, DocumentMetadata } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  activeDocuments: DocumentMetadata[];
  onOpenCitation: (citation: Citation) => void;
  onSelectPrompt: (promptText: string) => void;
  onClearChat: () => void;
  isSourceViewerOpen?: boolean;
  onToggleSourceViewer?: () => void;
  activeCitationsCount?: number;
  selectedDocFilter?: string;
  selectedDocIds?: Set<string>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  activeDocuments,
  onOpenCitation,
  onSelectPrompt,
  onClearChat,
  isSourceViewerOpen,
  onToggleSourceViewer,
  activeCitationsCount = 0,
  selectedDocFilter,
  selectedDocIds,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Example prompts based on active documents
  const samplePrompts = [
    {
      title: 'Transformer Architecture',
      query: 'What is the structure of the Transformer encoder and decoder layers, and why is self-attention used?',
    },
    {
      title: 'Multi-Head Attention Specs',
      query: 'How is Scaled Dot-Product Attention calculated and what are the dimensions of d_k, d_v, and h heads?',
    },
    {
      title: 'Solar Battery Safety Limits',
      query: 'What are the charging and discharging operating temperatures for the SolarFlow battery storage system?',
    },
    {
      title: 'RAG Ingestion Specifications',
      query: 'What chunk sizes, overlap parameters, and embedding dimensions are specified in the architecture blueprint?',
    },
  ];

  const findMatchingCitation = (
    badgeText: string,
    citations?: Citation[]
  ): Citation | undefined => {
    if (!citations || citations.length === 0) return undefined;

    // Check for page number in badge text: e.g. "p. 4" or "Page 4"
    const pageMatch = badgeText.match(/(?:page|p\.?)\s*(\d+)/i);
    const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : null;

    // Check for document filename or index
    for (const citation of citations) {
      if (pageNum && citation.pageNumber === pageNum) {
        return citation;
      }
      if (citation.filename && badgeText.toLowerCase().includes(citation.filename.toLowerCase())) {
        return citation;
      }
    }

    // Match by Doc number, e.g. [Doc 1, p. 2] -> index 0
    const docIdxMatch = badgeText.match(/Doc\s*(\d+)/i);
    if (docIdxMatch) {
      const idx = parseInt(docIdxMatch[1], 10) - 1;
      if (citations[idx]) return citations[idx];
    }

    return citations[0];
  };

  const renderFormattedContent = (content: string, citations?: Citation[]) => {
    // Split into paragraphs / lines
    const lines = content.split('\n');

    return (
      <div className="space-y-2 text-slate-100 leading-relaxed text-sm">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />;

          // Check if line is a header
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-indigo-300 text-sm mt-3 mb-1">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={idx} className="font-bold text-white text-base mt-4 mb-1.5 border-b border-slate-700/60 pb-1">
                {line.replace('## ', '')}
              </h3>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h2 key={idx} className="font-bold text-white text-lg mt-4 mb-2">
                {line.replace('# ', '')}
              </h2>
            );
          }

          // Bullet points
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="text-indigo-400 text-base leading-none mt-0.5">•</span>
                <span className="flex-1">{renderInlineHighlights(line.substring(2), citations)}</span>
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="font-mono text-xs text-indigo-400 font-semibold mt-0.5">
                  {numMatch[1]}.
                </span>
                <span className="flex-1">{renderInlineHighlights(numMatch[2], citations)}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInlineHighlights(line, citations)}</p>;
        })}
      </div>
    );
  };

  const renderInlineHighlights = (text: string, citations?: Citation[]) => {
    // Regex to match bold **text**, inline code `code`, and all forms of citation badges:
    // [Doc: filename, Page: X], [Doc 1, p. 4], [Doc 1, Page 4], [Doc: filename], [Source 1, p. 2], [Page 4], etc.
    const regex = /(\*\*.*?\*\*|`.*?`|\[(?:Doc:?[^\]]+|Doc\s*\d+[^\]]*|Source\s*\d+[^\]]*|Page\s*\d+|p\.\s*\d+)\])/gi;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (!part) return null;

      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-700">
            {part.slice(1, -1)}
          </code>
        );
      }

      // Inline Source Badge (e.g. [Doc 1, p. 4] or [Doc: filename.pdf, Page: 2])
      if (
        part.startsWith('[') &&
        part.endsWith(']') &&
        /(Doc|Source|Page|p\.)/i.test(part)
      ) {
        const matched = findMatchingCitation(part, citations);
        const cleanLabel = part.slice(1, -1).trim();

        return (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (matched) {
                onOpenCitation(matched);
              }
            }}
            title={
              matched
                ? `Verify source: ${matched.filename} (p. ${matched.pageNumber}) - ${(matched.score * 100).toFixed(0)}% match`
                : 'View retrieved document evidence'
            }
            className="inline-flex items-center space-x-1 mx-1 px-2 py-0.5 bg-indigo-950/90 hover:bg-indigo-900 active:bg-indigo-800 text-indigo-300 hover:text-white rounded-md text-xs font-mono border border-indigo-700/60 hover:border-indigo-500 cursor-pointer shadow-xs transition-all select-none group align-baseline"
          >
            <FileText className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="font-medium">{cleanLabel}</span>
            {matched && (
              <span className="text-[10px] text-emerald-400 font-mono ml-0.5 opacity-80 group-hover:opacity-100">
                {(matched.score * 100).toFixed(0)}%
              </span>
            )}
          </button>
        );
      }

      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Top chat bar */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-xs font-medium text-slate-300 truncate">
            Grounded Retrieval Active · Strict Citation Protocol
          </span>

          {selectedDocFilter && (
            <span className="hidden sm:inline-flex text-[11px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60 truncate max-w-xs">
              Filter: {selectedDocFilter}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {onToggleSourceViewer && (
            <button
              id="btn-header-toggle-sources"
              onClick={onToggleSourceViewer}
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                isSourceViewerOpen
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-700/80'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Sources Pane</span>
              {activeCitationsCount > 0 && (
                <span className="font-mono text-[10px] bg-indigo-900 text-indigo-200 px-1.5 py-0.2 rounded-full">
                  {activeCitationsCount}
                </span>
              )}
            </button>
          )}

          {messages.length > 0 && (
            <button
              id="btn-clear-chat"
              onClick={onClearChat}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Main message feed */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-blue-500/20 border border-indigo-500/40 flex items-center justify-center shadow-lg mb-4">
              <BookOpen className="w-7 h-7 text-indigo-400" />
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">
              DocuChat AI Vector Assistant
            </h3>
            <p className="text-slate-400 text-sm mt-2 max-w-md">
              Ask questions grounded directly in your uploaded PDF documents. Every factual claim is
              backed by precise page citations and persistent vector embeddings.
            </p>

            {/* Quick Prompts */}
            <div className="mt-8 w-full text-left">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Suggested Grounded Queries</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    id={`btn-sample-prompt-${i}`}
                    onClick={() => onSelectPrompt(p.query)}
                    className="p-3 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                      <span>{p.title}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-indigo-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.query}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <div
                key={message.id}
                id={`chat-msg-${message.id}`}
                className={`flex items-start space-x-3.5 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-3xl rounded-2xl p-4.5 transition-all ${
                    isUser
                      ? 'bg-indigo-600 text-white shadow-md rounded-tr-xs'
                      : 'bg-slate-900 border border-slate-800 shadow-md text-slate-200 rounded-tl-xs'
                  }`}
                >
                  {/* Assistant response header metadata */}
                  {!isUser && message.metrics && (
                    <div className="flex flex-wrap items-center gap-2 mb-3 pb-2.5 border-b border-slate-800 text-xs">
                      {/* Groundedness status badge */}
                      {message.metrics.grounded ? (
                        <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50 text-[11px] font-medium">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Grounded Source Evidence</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/50 text-[11px] font-medium">
                          <AlertCircle className="w-3 h-3" />
                          <span>Refusal: Out of Context</span>
                        </span>
                      )}

                      {/* Performance latency badge */}
                      <span className="flex items-center space-x-1 text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-full border border-slate-700/50 text-[11px]">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>
                          {message.metrics.chunksRetrieved} chunks in {message.metrics.retrievalTimeMs}ms · Total {message.metrics.totalTimeMs}ms
                        </span>
                      </span>

                      {/* Rewritten query info */}
                      {message.metrics.rewrittenQuery && (
                        <span className="text-[11px] text-indigo-300 italic">
                          (Contextual query: "{message.metrics.rewrittenQuery}")
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message content */}
                  {isUser ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                  ) : (
                    renderFormattedContent(message.content, message.citations)
                  )}

                  {/* Source Citations Section */}
                  {!isUser && message.citations && message.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/90">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-300 mb-2">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Verified Source Citations ({message.citations.length})</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {message.citations.map((citation, cIdx) => (
                          <button
                            key={cIdx}
                            id={`btn-citation-${citation.chunkId}`}
                            onClick={() => onOpenCitation(citation)}
                            className="flex items-center space-x-2 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/60 px-2.5 py-1.5 rounded-lg text-xs transition-all group text-left"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                            <div className="text-slate-300">
                              <span className="font-medium text-white">{citation.filename}</span>
                              <span className="text-slate-400 ml-1">· Page {citation.pageNumber}</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/40">
                              {(citation.score * 100).toFixed(0)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message action footer */}
                  {!isUser && (
                    <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        id={`btn-copy-msg-${message.id}`}
                        onClick={() => handleCopy(message.id, message.content)}
                        className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading typing bubble */}
        {isLoading && (
          <div className="flex items-start space-x-3.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md flex-shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl rounded-tl-xs shadow-md text-slate-300 text-xs flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-slate-400 font-medium">
                Searching vector index & grounding with Gemini 3.7 Flash...
              </span>
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
};
