import { sessions, type Session, type InsertSession } from "../schema";

export interface IStorage {
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  updateSessionResponse(id: number, aiResponse: string): Promise<Session>;
}

export class MemStorage implements IStorage {
  private sessions: Map<number, Session>;
  private currentId: number;

  constructor() {
    this.sessions = new Map();
    this.currentId = 1;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.currentId++;
    const session: Session = {
      ...insertSession,
      id,
      active: true,
      aiResponse: null,
      transcriptionData: null,
      isLiveArgument: insertSession.isLiveArgument ?? null,
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async updateSessionResponse(id: number, aiResponse: string): Promise<Session> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error("Session not found");
    }
    const updatedSession = { ...session, aiResponse };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }
}

export const storage = new MemStorage();
