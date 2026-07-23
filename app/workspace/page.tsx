"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Clock3,
  FileText,
  Headphones,
  LogOut,
  Mic2,
  MoreHorizontal,
  Plus,
  Radio,
  Settings,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  beginSession,
  formatDuration,
  getSessions,
  type VoiceSession
} from "@/lib/session-store";

type Account = { name: string; email: string };

export default function WorkspacePage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account>({
    name: "Alex Morgan",
    email: "admin@gmail.com"
  });
  const [sessions, setSessions] = useState<VoiceSession[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("vox_account");
    if (!stored) {
      router.replace("/");
      return;
    }

    try {
      const savedAccount = JSON.parse(stored) as Account;
      setAccount(savedAccount);
      setSessions(getSessions(savedAccount.email));
    } catch {
      window.localStorage.removeItem("vox_account");
      router.replace("/");
    }
  }, [router]);

  function signOut() {
    window.localStorage.removeItem("vox_account");
    router.push("/");
  }

  function startCall() {
    beginSession(account.email);
    router.push("/voice");
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weeklySessions = sessions.filter(
    (session) => new Date(session.startedAt) >= weekStart
  );
  const weeklySeconds = weeklySessions.reduce(
    (total, session) => total + session.durationSeconds,
    0
  );
  const transcriptLines = sessions.reduce(
    (total, session) => total + session.transcript.length,
    0
  );

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <div className="session-brand">
          <span><AudioLines size={18} /></span>
          <div><strong>Vox</strong><small>Voice AI workspace</small></div>
        </div>

        <nav aria-label="Workspace navigation">
          <button className="active"><Sparkles size={15} /> Overview</button>
          <button><FileText size={15} /> Transcripts</button>
          <button><Settings size={15} /> Settings</button>
        </nav>

        <div className="account-menu">
          <div className="account-avatar">AM</div>
          <div><strong>{account.name}</strong><span>{account.email}</span></div>
          <button type="button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="workspace-wrap">
        <section className="workspace-heading">
          <div>
            <p><span /> Voice assistant ready</p>
            <h1>Good morning, {account.name.split(" ")[0]}.</h1>
            <span>Start a new conversation or continue from a recent session.</span>
          </div>
          <button className="start-call-button" onClick={startCall}>
            <Mic2 size={18} /> Start voice session <ArrowRight size={16} />
          </button>
        </section>

        <div className="workspace-grid">
          <section className="start-session-card">
            <div className="workspace-grid-pattern" />
            <div className="start-card-top">
              <span><Radio size={14} /> Voice node online</span>
              <Headphones size={20} />
            </div>
            <div className="start-card-copy">
              <div className="start-orb"><Mic2 size={30} /></div>
              <p>New conversation</p>
              <h2>Ready when you are.</h2>
              <span>Start a private voice session with live transcription.</span>
              <button onClick={startCall}>
                <Plus size={17} /> Start a call
              </button>
            </div>
          </section>

          <section className="workspace-card recent-card">
            <header>
              <div><p>History</p><h2>Recent sessions</h2></div>
              <button>View all <ArrowRight size={14} /></button>
            </header>
            <div className="recent-list">
              {sessions.slice(0, 3).map((session, index) => (
                <article key={session.id}>
                  <div className={`recent-icon tone-${index}`}><AudioLines size={17} /></div>
                  <div>
                    <h3>{session.title}</h3>
                    <p>
                      {new Date(session.startedAt).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short"
                      })}
                    </p>
                  </div>
                  <div className="recent-meta">
                    <span>{formatDuration(session.durationSeconds)}</span>
                    <span>{session.transcript.length} lines</span>
                  </div>
                  <button aria-label={`More options for ${session.title}`}><MoreHorizontal size={17} /></button>
                </article>
              ))}
              {sessions.length === 0 && (
                <div className="empty-sessions">
                  <AudioLines size={22} />
                  <strong>No saved sessions yet</strong>
                  <span>Your completed calls and transcripts will appear here.</span>
                </div>
              )}
            </div>
          </section>

          <section className="workspace-card account-stat">
            <span className="stat-icon coral"><Clock3 size={19} /></span>
            <div>
              <p>This week</p>
              <strong>{formatDuration(weeklySeconds)}</strong>
              <span>
                Across {weeklySessions.length} voice {weeklySessions.length === 1 ? "session" : "sessions"}
              </span>
            </div>
          </section>

          <section className="workspace-card account-stat">
            <span className="stat-icon teal"><FileText size={19} /></span>
            <div>
              <p>Transcripts</p>
              <strong>{transcriptLines} lines</strong>
              <span>Captured automatically</span>
            </div>
          </section>

          <section className="workspace-tip">
            <Sparkles size={17} />
            <div><p>Vox tip</p><strong>Your transcripts stay attached to your account, so ending a call never signs you out.</strong></div>
          </section>
        </div>
      </div>
    </main>
  );
}
