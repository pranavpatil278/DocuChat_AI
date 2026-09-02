import React from 'react';
import {
  FileText,
  Database,
  CheckCircle2,
  Cpu,
  BarChart3,
  Search,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';
import { VectorStoreStats } from '../types';

interface NavbarProps {
  stats: VectorStoreStats | null;
  activeTab: 'chat' | 'evaluation' | 'vector_inspector';
  onTabChange: (tab: 'chat' | 'evaluation' | 'vector_inspector') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-indigo-500/20 shadow-lg ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight">DocuChat AI</h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  RAG Vector DB
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                Grounded PDF Intelligence with Source Citations & Vector Search
              </p>
            </div>
          </div>

          {/* Center Tabs Navigation */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 shadow-inner">
            <button
              id="tab-chat"
              onClick={() => onTabChange('chat')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>RAG Chatbot</span>
            </button>

            <button
              id="tab-evaluation"
              onClick={() => onTabChange('evaluation')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'evaluation'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Evaluation Suite</span>
            </button>

            <button
              id="tab-vector-inspector"
              onClick={() => onTabChange('vector_inspector')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'vector_inspector'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vector Store & Chunks</span>
            </button>
          </div>

          {/* Right System Metrics Badge */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-3 text-xs bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  <strong className="text-white">{stats?.documentCount ?? 0}</strong> docs /{' '}
                  <strong className="text-white">{stats?.chunkCount ?? 0}</strong> chunks
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-300">Gemini 3.7 + 768d Vector</span>
              </div>
            </div>

            <button
              id="btn-refresh-stats"
              onClick={onRefresh}
              title="Refresh Vector Store Status"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
