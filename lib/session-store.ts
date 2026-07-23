export type TranscriptEntry = {
  speaker: "You" | "Vox AI";
  time: string;
  text: string;
};

export type VoiceSession = {
  id: string;
  accountEmail: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  transcript: TranscriptEntry[];
};

const SESSIONS_KEY = "vox_voice_sessions";
const ACTIVE_SESSION_KEY = "vox_active_session";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getSessions(accountEmail: string): VoiceSession[] {
  return readJson<VoiceSession[]>(SESSIONS_KEY, [])
    .filter((session) => session.accountEmail === accountEmail)
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
}

export function getSession(
  accountEmail: string,
  sessionId: string
): VoiceSession | null {
  return (
    getSessions(accountEmail).find((session) => session.id === sessionId) ?? null
  );
}

export function appendSessionTranscript(
  accountEmail: string,
  sessionId: string,
  entries: TranscriptEntry[]
): VoiceSession | null {
  const sessions = readJson<VoiceSession[]>(SESSIONS_KEY, []);
  const index = sessions.findIndex(
    (session) =>
      session.id === sessionId && session.accountEmail === accountEmail
  );
  if (index < 0) return null;
  const updated = {
    ...sessions[index],
    transcript: [...sessions[index].transcript, ...entries]
  };
  sessions[index] = updated;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  return updated;
}

export function renameSession(
  accountEmail: string,
  sessionId: string,
  title: string
): VoiceSession | null {
  const cleanTitle = title.trim().slice(0, 80);
  if (!cleanTitle) return null;
  const sessions = readJson<VoiceSession[]>(SESSIONS_KEY, []);
  const index = sessions.findIndex(
    (session) =>
      session.id === sessionId && session.accountEmail === accountEmail
  );
  if (index < 0) return null;
  const updated = { ...sessions[index], title: cleanTitle };
  sessions[index] = updated;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  return updated;
}

export function deleteSession(
  accountEmail: string,
  sessionId: string
): boolean {
  const sessions = readJson<VoiceSession[]>(SESSIONS_KEY, []);
  const remaining = sessions.filter(
    (session) =>
      !(session.id === sessionId && session.accountEmail === accountEmail)
  );
  if (remaining.length === sessions.length) return false;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(remaining));
  return true;
}

export function beginSession(accountEmail: string): VoiceSession {
  const existing = readJson<VoiceSession | null>(ACTIVE_SESSION_KEY, null);
  if (existing?.accountEmail === accountEmail) return existing;

  const session: VoiceSession = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    accountEmail,
    title: "Voice conversation",
    startedAt: new Date().toISOString(),
    durationSeconds: 0,
    transcript: []
  };
  window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getActiveSession(): VoiceSession | null {
  return readJson<VoiceSession | null>(ACTIVE_SESSION_KEY, null);
}

export function updateActiveTranscript(transcript: TranscriptEntry[]) {
  const active = getActiveSession();
  if (!active) return;
  window.localStorage.setItem(
    ACTIVE_SESSION_KEY,
    JSON.stringify({ ...active, transcript })
  );
}

export function finishSession(transcript: TranscriptEntry[]): VoiceSession | null {
  const active = getActiveSession();
  if (!active) return null;

  const endedAt = new Date();
  const completed: VoiceSession = {
    ...active,
    title:
      transcript.find((entry) => entry.speaker === "You")?.text.slice(0, 48) ||
      "Voice conversation",
    endedAt: endedAt.toISOString(),
    durationSeconds: Math.max(
      1,
      Math.round((endedAt.getTime() - new Date(active.startedAt).getTime()) / 1000)
    ),
    transcript
  };
  const sessions = readJson<VoiceSession[]>(SESSIONS_KEY, []);
  const withoutDuplicate = sessions.filter((session) => session.id !== completed.id);
  window.localStorage.setItem(
    SESSIONS_KEY,
    JSON.stringify([completed, ...withoutDuplicate])
  );
  window.localStorage.removeItem(ACTIVE_SESSION_KEY);
  return completed;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes} min`;
}

export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}
