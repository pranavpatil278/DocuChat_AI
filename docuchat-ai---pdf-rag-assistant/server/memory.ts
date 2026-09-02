import { ChatMessage, ChatSession } from './types';
import { v4 as uuidv4 } from 'uuid';

export class SessionMemory {
  private sessions: Map<string, ChatSession> = new Map();
  private maxHistoryPerSession = 12; // Bounded conversation history

  public getOrCreateSession(sessionId?: string): ChatSession {
    const id = sessionId || uuidv4();
    if (!this.sessions.has(id)) {
      const newSession: ChatSession = {
        id,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.sessions.set(id, newSession);
    }
    return this.sessions.get(id)!;
  }

  public addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const session = this.getOrCreateSession(sessionId);
    const fullMessage: ChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    session.messages.push(fullMessage);
    if (session.messages.length > this.maxHistoryPerSession) {
      session.messages = session.messages.slice(-this.maxHistoryPerSession);
    }

    // Auto-update session title based on first user query
    if (session.title === 'New Conversation' && message.role === 'user') {
      session.title = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '');
    }

    session.updatedAt = new Date().toISOString();
    return fullMessage;
  }

  public getRecentMessages(sessionId: string, count = 6): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.messages.slice(-count);
  }

  public clearSession(sessionId: string) {
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.messages = [];
      session.updatedAt = new Date().toISOString();
    }
  }

  public listSessions(): { id: string; title: string; messageCount: number; updatedAt: string }[] {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      title: s.title,
      messageCount: s.messages.length,
      updatedAt: s.updatedAt,
    })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

export const sessionMemory = new SessionMemory();
