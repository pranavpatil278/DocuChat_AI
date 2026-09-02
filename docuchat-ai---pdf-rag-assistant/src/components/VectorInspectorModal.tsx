import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Database,
  FileText,
  Sparkles,
  HardDrive,
  Clock,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { DocumentChunk, VectorStoreStats } from '../types';
import { api } from '../services/api';

interface VectorInspectorModalProps {
  stats: VectorStoreStats | null;
  onRefresh: () => void;
}

export const VectorInspectorModal: React.FC<VectorInspectorModalProps> = ({
  stats,
  onRefresh,
}) => {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [previewResults, setPreviewResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMeta, setSearchMeta] = useState<any>(null);

  useEffect(() => {
    loadChunks();
  }, []);

  const loadChunks = async () => {
    try {
      setLoading(true);
      const data = await api.getAllChunks();
      setChunks(data);
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    try {
      setIsSearching(true);
      const result = await api.searchVectorPreview(testQuery.trim(), 5);
      setPreviewResults(result.chunks);
      setSearchMeta({
        retrievalTimeMs: result.retrievalTimeMs,
        embeddingTimeMs: result.embeddingTimeMs,
        topScore: result.topScore,
        rewrittenQuery: result.rewrittenQuery,
      });
    } catch (err) {
      console.error('Search preview failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Indexed Documents</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.documentCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Stored in persistent JSON database</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Total Vector Chunks</span>
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {stats?.chunkCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Segmented with ~150 char overlap</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Vector Dimensions</span>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            768 dims
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">gemini-embedding-2-preview</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>Persistent Disk Size</span>
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {formatBytes(stats?.storageSizeBytes ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">{stats?.storagePath || 'data/vector_store'}</div>
        </div>
      </div>

      {/* Real-time Vector Similarity Tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Live Vector Similarity Search Tester
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Tests pure embedding cosine similarity without invoking the LLM generator
          </span>
        </div>

        <form onSubmit={handleTestSearch} className="flex items-center space-x-2">
          <input
            type="text"
            id="input-vector-test-query"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type a test query to measure cosine similarity (e.g., 'Multi-head attention', 'Thermal limits', 'BLEU score')..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            id="btn-run-vector-test"
            disabled={!testQuery.trim() || isSearching}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Search Vectors</span>
          </button>
        </form>

        {/* Search Results Preview */}
        {previewResults.length > 0 && (
          <div className="mt-4 space-y-3 animate-in fade-in">
            {searchMeta && (
              <div className="flex items-center space-x-3 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span>⚡ Embedding: <strong>{searchMeta.embeddingTimeMs}ms</strong></span>
                <span>•</span>
                <span>Vector Search: <strong>{searchMeta.retrievalTimeMs}ms</strong></span>
                <span>•</span>
                <span>Top Match: <strong className="text-emerald-400">{(searchMeta.topScore * 100).toFixed(1)}%</strong></span>
              </div>
            )}

            <div className="space-y-2">
              {previewResults.map((res, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">{res.filename}</span>
                      <span className="text-slate-400">· Page {res.pageNumber}</span>
                      <span className="text-[10px] font-mono text-slate-500">[{res.chunkId}]</span>
                    </div>

                    <span className="font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50">
                      {(res.score * 100).toFixed(1)}% Match
                    </span>
                  </div>

                  <p className="text-slate-300 line-clamp-3 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    {res.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Raw Chunks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Stored Chunks & Embeddings Catalog ({chunks.length})
            </h3>
          </div>
          <button
            onClick={() => {
              loadChunks();
              onRefresh();
            }}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto border border-slate-800 rounded-xl custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-3">Chunk ID</th>
                <th className="p-3">Document</th>
                <th className="p-3">Page</th>
                <th className="p-3">Chars</th>
                <th className="p-3">Embedding Status</th>
                <th className="p-3">Preview Text</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50 font-sans">
              {chunks.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/60 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-indigo-300 truncate max-w-[140px]">{c.id}</td>
                  <td className="p-3 truncate max-w-[160px] text-slate-200">{c.filename || c.documentId}</td>
                  <td className="p-3 font-mono">{c.pageNumber}</td>
                  <td className="p-3 font-mono">{c.charCount}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{c.embeddingDimension || 768} dims</span>
                    </span>
                  </td>
                  <td className="p-3 truncate max-w-xs text-slate-400">{c.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
