import React, { useState, useRef, useEffect } from 'react';
import { Send, SlidersHorizontal, Loader2, Paperclip, UploadCloud, FileText, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string, topK: number) => void;
  onUploadFile?: (file: File) => Promise<void>;
  isLoading: boolean;
  isUploading?: boolean;
  disabled?: boolean;
  activeFilterCount?: number;
  totalDocumentCount?: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onUploadFile,
  isLoading,
  isUploading = false,
  disabled = false,
  activeFilterCount,
  totalDocumentCount = 0,
}) => {
  const [input, setInput] = useState('');
  const [topK, setTopK] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    onSendMessage(input.trim(), topK);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUploadFile) {
      await onUploadFile(files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
    if (files && files.length > 0 && onUploadFile) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        await onUploadFile(file);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-slate-900/95 border-t border-slate-800 p-3 sm:p-4 relative transition-colors ${
        isDragOver ? 'bg-indigo-950/40 border-indigo-500/80' : ''
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
        id="chat-attachment-file-input"
      />

      <div className="max-w-4xl mx-auto space-y-2">
        {/* Settings Bar */}
        {showSettings && (
          <div className="p-3 bg-slate-850 rounded-xl border border-slate-700/80 mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 animate-in fade-in">
            <div className="flex items-center space-x-3">
              <span className="font-medium text-slate-200">Retrieval Top-K Chunks:</span>
              <div className="flex items-center space-x-2">
                {[3, 4, 5, 6, 8].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTopK(k)}
                    className={`px-2 py-0.5 rounded font-mono text-xs transition-colors ${
                      topK === k
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    k={k}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-slate-400">
              Cosine Similarity Threshold: <strong>0.25</strong> · Strict Grounding
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-end space-x-2">
          {/* Attachment Button */}
          <button
            type="button"
            id="btn-chat-attachment"
            onClick={handleAttachmentClick}
            disabled={isUploading}
            title="Upload PDF source document"
            className={`p-3 rounded-2xl border flex items-center justify-center transition-all ${
              isUploading
                ? 'bg-indigo-950 border-indigo-700 text-indigo-400 cursor-wait'
                : 'bg-slate-950 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-400 shadow-sm'
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          <div className="relative flex-1 bg-slate-950 border border-slate-800 focus-within:border-indigo-500 rounded-2xl p-2 transition-all shadow-inner">
            <textarea
              ref={textareaRef}
              id="input-chat-query"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={
                disabled
                  ? 'Please upload or index a document to start querying...'
                  : isUploading
                  ? 'Indexing attached PDF document into vector storage...'
                  : 'Ask anything grounded in your PDF documents (e.g. findings, equations, architecture)...'
              }
              disabled={disabled || isLoading || isUploading}
              rows={1}
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none px-2 py-1 max-h-32 custom-scrollbar"
            />

            <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-900 text-[11px] text-slate-400">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  id="btn-toggle-topk-settings"
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center space-x-1 hover:text-indigo-300 transition-colors"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Retrieval: top-k = {topK}</span>
                </button>

                {activeFilterCount !== undefined && totalDocumentCount > 0 && (
                  <span className="hidden sm:inline text-slate-500">
                    Active Sources: <strong>{activeFilterCount}</strong> of {totalDocumentCount}
                  </span>
                )}
              </div>

              <span className="hidden md:inline text-slate-500">
                Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for newline
              </span>
            </div>
          </div>

          <button
            type="submit"
            id="btn-send-message"
            disabled={!input.trim() || isLoading || disabled || isUploading}
            className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
              !input.trim() || isLoading || disabled || isUploading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 shadow-md scale-100 active:scale-95'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
