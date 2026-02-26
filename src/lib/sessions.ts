import type { InterviewSession } from "../types/interview";

const KEY = "mimid_sessions";

export function listSessions(): InterviewSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const sessions: InterviewSession[] = JSON.parse(raw);
    return sessions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

export function getSession(id: string): InterviewSession | null {
  try {
    return listSessions().find((s) => s.id === id) ?? null;
  } catch {
    return null;
  }
}

export function saveSession(session: InterviewSession): boolean {
  try {
    const sessions = listSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem(KEY, JSON.stringify(sessions));
    return true;
  } catch {
    return false;
  }
}

export function deleteSession(id: string): void {
  try {
    const sessions = listSessions().filter((s) => s.id !== id);
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}
