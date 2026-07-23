"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  AudioLines,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  Send,
  Sparkles
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import SessionActions from "@/components/SessionActions";
import {
  appendSessionTranscript,
  formatDuration,
  getSession,
  type TranscriptEntry,
  type VoiceSession
} from "@/lib/session-store";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [accountEmail, setAccountEmail] = useState("");
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    const accountValue = window.localStorage.getItem("vox_account");
    if (!accountValue) {
      router.replace("/");
      return;
    }
    try {
      const account = JSON.parse(accountValue) as { email: string };
      setAccountEmail(account.email);
      setSession(getSession(account.email, params.id));
    } catch {
      router.replace("/workspace");
    }
  }, [params.id, router]);

  async function askFollowUp(event: FormEvent) {
    event.preventDefault();
    const clean = question.trim();
    if (!clean || !session || loading) return;
    setLoading(true);
    setError("");
    setSources([]);

    try {
      const response = await fetch(`${apiUrl}/chat/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: clean,
          transcript: session.transcript.map(({ speaker, text }) => ({
            speaker,
            text
          }))
        })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(body.detail || "Unable to answer this follow-up.");
      }

      const data = (await response.json()) as {
        answer: string;
        sources: string[];
      };
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      const entries: TranscriptEntry[] = [
        { speaker: "You", text: clean, time },
        { speaker: "Vox AI", text: data.answer, time }
      ];
      const updated = appendSessionTranscript(
        accountEmail,
        session.id,
        entries
      );
      if (updated) setSession(updated);
      setSources(data.sources);
      setQuestion("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to answer this follow-up."
      );
    } finally {
      setLoading(false);
    }
  }

  function exportTranscript() {
    if (!session) return;
    const content = session.transcript
      .map((line) => `[${line.time}] ${line.speaker}: ${line.text}`)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vox-session-${session.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!session) {
    return (
      <main className="session-detail-page">
        <div className="session-not-found">
          <FileText size={26} />
          <h1>Conversation not found</h1>
          <button onClick={() => router.push("/workspace")}>Return to workspace</button>
        </div>
      </main>
    );
  }

  return (
    <main className="session-detail-page">
      <header className="session-detail-header">
        <button onClick={() => router.push("/workspace")}>
          <ArrowLeft size={16} /> Back to workspace
        </button>
        <div className="session-brand">
          <span><AudioLines size={18} /></span>
          <div><strong>Vox</strong><small>Saved conversation</small></div>
        </div>
        <div className="detail-header-actions">
          <button onClick={exportTranscript}>
            <Download size={15} /> Export
          </button>
          <SessionActions
            accountEmail={accountEmail}
            session={session}
            onRenamed={setSession}
            onDeleted={() => router.push("/workspace")}
          />
        </div>
      </header>

      <div className="session-detail-wrap">
        <section className="detail-heading">
          <p><span /> Saved conversation</p>
          <h1>{session.title}</h1>
          <div>
            <span><CalendarDays size={13} /> {new Date(session.startedAt).toLocaleString()}</span>
            <span><Clock3 size={13} /> {formatDuration(session.durationSeconds)}</span>
            <span><FileText size={13} /> {session.transcript.length} lines</span>
          </div>
        </section>

        <div className="session-detail-grid">
          <section className="detail-transcript session-card">
            <header>
              <div><p>Conversation history</p><h2>Transcript</h2></div>
              <span>{session.transcript.length} messages</span>
            </header>
            <div className="detail-transcript-feed">
              {session.transcript.map((line, index) => (
                <article className={line.speaker === "Vox AI" ? "ai-line" : ""} key={`${line.time}-${index}`}>
                  <div className="speaker-avatar">
                    {line.speaker === "Vox AI" ? <Sparkles size={15} /> : "Y"}
                  </div>
                  <div>
                    <header><strong>{line.speaker}</strong><time>{line.time}</time></header>
                    <p>{line.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="followup-panel">
            <section className="followup-card session-card">
              <div className="followup-icon"><Sparkles size={20} /></div>
              <p>Continue this conversation</p>
              <h2>Ask a follow-up.</h2>
              <span>Vox will use this saved transcript and the insurance knowledge base as context.</span>
              <form onSubmit={askFollowUp}>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about something from this conversation..."
                  maxLength={2000}
                  rows={5}
                />
                <button type="submit" disabled={!question.trim() || loading}>
                  {loading ? "Thinking..." : "Ask Vox"} <Send size={15} />
                </button>
              </form>
              {error && <div className="followup-error">{error}</div>}
            </section>

            {sources.length > 0 && (
              <section className="source-card">
                <p>Knowledge used</p>
                <div>{sources.map((source) => <span key={source}>{source}</span>)}</div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
