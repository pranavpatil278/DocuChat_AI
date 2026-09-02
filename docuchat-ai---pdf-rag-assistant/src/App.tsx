import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentList } from './components/DocumentList';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { SourceAccordionViewer } from './components/SourceAccordionViewer';
import { SourceCitationModal } from './components/SourceCitationModal';
import { ChunkViewerModal } from './components/ChunkViewerModal';
import { EvaluationSuite } from './components/EvaluationSuite';
import { VectorInspectorModal } from './components/VectorInspectorModal';
import {
  DocumentMetadata,
  SampleDocInfo,
  ChatMessage,
  Citation,
  VectorStoreStats,
} from './types';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'evaluation' | 'vector_inspector'>('chat');
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [sampleDocs, setSampleDocs] = useState<SampleDocInfo[]>([]);
  const [selectedDocFilter, setSelectedDocFilter] = useState<string | undefined>(undefined);
  const [activeDocIds, setActiveDocIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<VectorStoreStats | null>(null);

  // Chat State
  const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Split-pane Right Panel (Source Accordion Viewer)
  const [isSourceViewerOpen, setIsSourceViewerOpen] = useState<boolean>(true);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [selectedCitationModal, setSelectedCitationModal] = useState<Citation | null>(null);
  const [inspectingDoc, setInspectingDoc] = useState<DocumentMetadata | null>(null);

  // Get active citations from the latest assistant message or active selection
  const currentCitations = useMemo(() => {
    // Find the latest assistant message with citations
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].citations && messages[i].citations!.length > 0) {
        return messages[i].citations!;
      }
    }
    return [];
  }, [messages]);

  const loadInitialData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [docsData, samplesData, statsData] = await Promise.all([
        api.getDocuments(),
        api.getSampleDocuments(),
        api.getVectorStats(),
      ]);

      setDocuments(docsData);
      setSampleDocs(samplesData);
      setStats(statsData);

      // Initialize activeDocIds with all docs if empty
      setActiveDocIds((prev) => {
        const next = new Set(prev);
        docsData.forEach((d) => next.add(d.id));
        return next;
      });
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Toggle specific source file on/off
  const handleToggleDocId = (docId: string) => {
    setActiveDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Toggle all source files
  const handleToggleAllDocs = (enableAll: boolean) => {
    if (enableAll) {
      setActiveDocIds(new Set(documents.map((d) => d.id)));
    } else {
      setActiveDocIds(new Set());
    }
  };

  // Handle File Upload
  const handleUploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadError(null);
      const result = await api.uploadPdf(file);
      await loadInitialData();
      if (result.document) {
        setActiveDocIds((prev) => new Set(prev).add(result.document.id));
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload and indexing failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Loading Sample Document
  const handleLoadSample = async (sampleId: string) => {
    try {
      setUploadError(null);
      const result = await api.loadSampleDocument(sampleId);
      await loadInitialData();
      if (result.document) {
        setActiveDocIds((prev) => new Set(prev).add(result.document.id));
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to load sample document.');
    }
  };

  // Handle Delete Document
  const handleDeleteDoc = async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      setActiveDocIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      if (selectedDocFilter === docId) {
        setSelectedDocFilter(undefined);
      }
      await loadInitialData();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      throw err;
    }
  };

  // Handle Send Chat Message
  const handleSendMessage = async (text: string, topK = 5) => {
    if (!text.trim() || isLoading) return;

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      // If specific active sources are toggled, pass them
      const activeIdsList = Array.from(activeDocIds);
      const filterToPass = selectedDocFilter
        ? selectedDocFilter
        : activeIdsList.length > 0 && activeIdsList.length < documents.length
        ? activeIdsList
        : undefined;

      const response = await api.sendChat(text, sessionId, topK, filterToPass);

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        metrics: response.metrics,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setSessionId(response.sessionId);

      // Auto-open right-side source viewer if citations are returned
      if (response.citations && response.citations.length > 0) {
        setIsSourceViewerOpen(true);
        setActiveCitationId(response.citations[0].chunkId);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Failed to retrieve and generate answer: ${err.message || 'Unknown network error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // When an inline citation badge is clicked in chat:
  const handleSelectCitation = (citation: Citation) => {
    setActiveCitationId(citation.chunkId);
    setIsSourceViewerOpen(true);
  };

  // Inspect document chunks from citation viewer
  const handleInspectDocumentByName = (filename: string) => {
    const doc = documents.find((d) => d.filename.toLowerCase() === filename.toLowerCase());
    if (doc) {
      setInspectingDoc(doc);
    }
  };

  // Clear Chat Session
  const handleClearChat = async () => {
    try {
      if (sessionId) {
        await api.clearChatHistory(sessionId);
      }
    } catch (err) {
      console.warn('Failed to clear remote session:', err);
    }
    setMessages([]);
    setActiveCitationId(null);
    setSessionId(`session_${Date.now()}`);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Navigation */}
      <Navbar
        stats={stats}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={loadInitialData}
        isRefreshing={isRefreshing}
      />

      {/* Main Split-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chat' && (
          <div className="flex-1 flex w-full h-full overflow-hidden">
            {/* 1. Left Panel: Document Management Sidebar */}
            <aside
              id="left-document-management-sidebar"
              className="w-72 sm:w-80 lg:w-84 flex-shrink-0 hidden md:flex flex-col border-r border-slate-800 bg-slate-900 z-10"
            >
              <DocumentList
                documents={documents}
                sampleDocs={sampleDocs}
                selectedDocFilter={selectedDocFilter}
                onSelectDocFilter={setSelectedDocFilter}
                activeDocIds={activeDocIds}
                onToggleDocId={handleToggleDocId}
                onToggleAllDocs={handleToggleAllDocs}
                onUploadFile={handleUploadFile}
                onLoadSample={handleLoadSample}
                onDeleteDoc={handleDeleteDoc}
                onInspectDocChunks={(doc) => setInspectingDoc(doc)}
                isUploading={isUploading}
                uploadError={uploadError}
              />
            </aside>

            {/* 2. Center Panel: Single-Column Chat Interface */}
            <main
              id="center-chat-main-pane"
              className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-950"
            >
              <ChatWindow
                messages={messages}
                isLoading={isLoading}
                activeDocuments={documents}
                onOpenCitation={handleSelectCitation}
                onSelectPrompt={(p) => handleSendMessage(p)}
                onClearChat={handleClearChat}
                isSourceViewerOpen={isSourceViewerOpen}
                onToggleSourceViewer={() => setIsSourceViewerOpen(!isSourceViewerOpen)}
                activeCitationsCount={currentCitations.length}
                selectedDocFilter={selectedDocFilter}
                selectedDocIds={activeDocIds}
              />

              {/* Persistent Bottom Input with Attachment Icon */}
              <ChatInput
                onSendMessage={handleSendMessage}
                onUploadFile={handleUploadFile}
                isLoading={isLoading}
                isUploading={isUploading}
                disabled={documents.length === 0}
                activeFilterCount={activeDocIds.size}
                totalDocumentCount={documents.length}
              />
            </main>

            {/* 3. Right Panel: Accordion-Style Source Card Viewer */}
            <SourceAccordionViewer
              citations={currentCitations}
              activeCitationId={activeCitationId}
              onSelectCitation={handleSelectCitation}
              onInspectDocument={handleInspectDocumentByName}
              activeDocuments={documents}
              isOpen={isSourceViewerOpen}
              onToggleOpen={() => setIsSourceViewerOpen(!isSourceViewerOpen)}
            />
          </div>
        )}

        {activeTab === 'evaluation' && (
          <main className="flex-1 overflow-y-auto bg-slate-950 custom-scrollbar">
            <EvaluationSuite />
          </main>
        )}

        {activeTab === 'vector_inspector' && (
          <main className="flex-1 overflow-y-auto bg-slate-950 custom-scrollbar">
            <VectorInspectorModal
              stats={stats}
              onRefresh={loadInitialData}
            />
          </main>
        )}
      </div>

      {/* Document Chunk Inspector Modal */}
      {inspectingDoc && (
        <ChunkViewerModal
          document={inspectingDoc}
          onClose={() => setInspectingDoc(null)}
        />
      )}

      {/* Citation Detail Full Modal (if triggered directly) */}
      {selectedCitationModal && (
        <SourceCitationModal
          citation={selectedCitationModal}
          onClose={() => setSelectedCitationModal(null)}
        />
      )}
    </div>
  );
}
