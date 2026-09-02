import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Plus,
  Loader2,
  FileCheck,
  CheckSquare,
  Square,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import { DocumentMetadata, SampleDocInfo } from '../types';

interface DocumentListProps {
  documents: DocumentMetadata[];
  sampleDocs: SampleDocInfo[];
  selectedDocFilter: string | undefined;
  onSelectDocFilter: (docId: string | undefined) => void;
  activeDocIds: Set<string>;
  onToggleDocId: (docId: string) => void;
  onToggleAllDocs: (enableAll: boolean) => void;
  onUploadFile: (file: File) => Promise<void>;
  onLoadSample: (sampleId: string) => Promise<void>;
  onDeleteDoc: (docId: string) => Promise<void>;
  onInspectDocChunks: (doc: DocumentMetadata) => void;
  isUploading: boolean;
  uploadError: string | null;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  sampleDocs,
  selectedDocFilter,
  onSelectDocFilter,
  activeDocIds,
  onToggleDocId,
  onToggleAllDocs,
  onUploadFile,
  onLoadSample,
  onDeleteDoc,
  onInspectDocChunks,
  isUploading,
  uploadError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Only PDF documents are supported for RAG parsing.');
      return;
    }
    setErrorMessage(null);
    try {
      await onUploadFile(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload PDF.');
    }
  };

  const handleSampleClick = async (sampleId: string) => {
    setLoadingSampleId(sampleId);
    setErrorMessage(null);
    try {
      await onLoadSample(sampleId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample document.');
    } finally {
      setLoadingSampleId(null);
    }
  };

  const handleDeleteRequest = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setConfirmDeleteDocId(docId);
  };

  const handleConfirmDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setDeletingDocId(docId);
    setErrorMessage(null);
    try {
      await onDeleteDoc(docId);
      setConfirmDeleteDocId(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete document.');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteDocId(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allActive = documents.length > 0 && documents.every((d) => activeDocIds.has(d.id));
  const activeCount = documents.filter((d) => activeDocIds.has(d.id)).length;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Document Hub</h2>
            <p className="text-[11px] text-slate-400">PDF Ingestion & Source Toggles</p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
        </span>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">
        {/* PDF Upload Dropzone */}
        <div
          id="pdf-dropzone-sidebar"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-950/40 shadow-inner'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-850/50 hover:bg-slate-850'
          } ${isUploading ? 'opacity-75 cursor-wait' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload-input"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center py-2 space-y-2">
              <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              <div className="text-xs font-semibold text-slate-200">
                Chunking & Embedding PDF...
              </div>
              <p className="text-[10px] text-slate-400">Generating 768d vector embeddings</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-1 space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-200">Click or drag PDF here</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Page-by-page chunking & 768d vector indexing
                </p>
              </div>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start justify-between space-x-2">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200 text-xs font-semibold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Preloaded Sample Documents Section */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Preloaded Sample PDFs</span>
            </span>
          </div>
          <div className="space-y-1.5">
            {sampleDocs.map((sample) => {
              const isAlreadyIndexed = documents.some((d) => d.id === sample.id);
              const isLoading = loadingSampleId === sample.id;

              return (
                <button
                  key={sample.id}
                  id={`btn-load-sample-${sample.id}`}
                  onClick={() => handleSampleClick(sample.id)}
                  disabled={isLoading || isAlreadyIndexed}
                  className={`w-full text-left p-2.5 rounded-lg text-xs border transition-all flex items-center justify-between ${
                    isAlreadyIndexed
                      ? 'bg-slate-800/30 border-slate-800 text-slate-400 cursor-default'
                      : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <FileText
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isAlreadyIndexed ? 'text-emerald-400' : 'text-indigo-400'
                      }`}
                    />
                    <div className="truncate">
                      <div className="font-medium text-slate-200 truncate">{sample.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {sample.pageCount} pages · {formatFileSize(sample.fileSize)}
                      </div>
                    </div>
                  </div>

                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                  ) : isAlreadyIndexed ? (
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded flex items-center space-x-1 flex-shrink-0 border border-emerald-800/50">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Indexed</span>
                    </span>
                  ) : (
                    <span className="text-[10px] bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded flex items-center space-x-1 flex-shrink-0 hover:bg-indigo-800">
                      <Plus className="w-3 h-3" />
                      <span>Load</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Source Files Management & Toggles */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Sources in Context ({activeCount}/{documents.length})
              </span>
            </div>

            {documents.length > 0 && (
              <button
                id="btn-toggle-all-sources"
                onClick={() => onToggleAllDocs(!allActive)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                {allActive ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-6 px-3 bg-slate-850/40 rounded-xl border border-slate-800 text-slate-400">
              <FileCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-300">No documents indexed yet</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload a PDF or click a sample document above to start querying.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const isActive = activeDocIds.has(doc.id);
                const isDeleting = deletingDocId === doc.id;
                const isConfirming = confirmDeleteDocId === doc.id;

                return (
                  <div
                    key={doc.id}
                    id={`doc-card-${doc.id}`}
                    className={`p-3 rounded-xl border transition-all text-xs relative group ${
                      isActive
                        ? 'bg-slate-800/80 border-slate-700/80 shadow-xs'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      {/* Active toggle button and details */}
                      <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                        <button
                          id={`btn-toggle-doc-${doc.id}`}
                          onClick={() => onToggleDocId(doc.id)}
                          title={isActive ? 'Source active in RAG query context' : 'Source disabled (click to enable)'}
                          className="mt-0.5 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                        >
                          {isActive ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onToggleDocId(doc.id)}>
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <h3
                              className={`font-semibold truncate text-xs ${
                                isActive ? 'text-slate-100' : 'text-slate-400 line-through'
                              }`}
                              title={doc.filename}
                            >
                              {doc.filename}
                            </h3>
                          </div>

                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                            <span className="bg-slate-750 px-1.5 py-0.2 rounded text-slate-300">
                              {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                            </span>
                            <span className="bg-indigo-950/80 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-800/40">
                              {doc.chunkCount} chunks
                            </span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          id={`btn-inspect-chunks-${doc.id}`}
                          onClick={() => onInspectDocChunks(doc)}
                          title="Inspect chunks & embeddings"
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/80 rounded-md transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-doc-${doc.id}`}
                          onClick={(e) =>
                            isConfirming
                              ? handleConfirmDelete(e, doc.id)
                              : handleDeleteRequest(e, doc.id)
                          }
                          disabled={isDeleting}
                          title={isConfirming ? 'Confirm Delete' : 'Delete document'}
                          className={`p-1.5 rounded-md transition-colors ${
                            isConfirming
                              ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                              : 'text-slate-400 hover:text-red-300 hover:bg-red-950/80'
                          }`}
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Status indicator tag */}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-750 pt-1.5">
                      <span className="flex items-center space-x-1 text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready & Indexed</span>
                      </span>
                      <span className="text-slate-500 font-mono">
                        {new Date(doc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Inline Delete Confirmation Prompt */}
                    {isConfirming && (
                      <div className="mt-2.5 p-2 bg-red-950/80 border border-red-800/80 rounded-lg text-slate-200 text-xs flex items-center justify-between animate-fadeIn">
                        <span className="text-[11px] text-red-200 font-medium">
                          Delete doc & chunk vectors?
                        </span>
                        <div className="flex items-center space-x-1.5 ml-2">
                          <button
                            id={`btn-confirm-delete-action-${doc.id}`}
                            onClick={(e) => handleConfirmDelete(e, doc.id)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center space-x-1"
                          >
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Delete</span>}
                          </button>
                          <button
                            id={`btn-cancel-delete-action-${doc.id}`}
                            onClick={handleCancelDelete}
                            disabled={isDeleting}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center space-x-1 text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          <span>Local Vector DB</span>
        </span>
        <span className="text-slate-400 font-mono">
          {activeCount} active in context
        </span>
      </div>
    </div>
  );
};
