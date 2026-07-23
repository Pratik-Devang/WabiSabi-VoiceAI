"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AudioLines,
  FileText,
  LayoutGrid,
  LogOut,
  Search,
  Settings
} from "lucide-react";
import { useRouter } from "next/navigation";
import SessionActions from "@/components/SessionActions";
import {
  formatDuration,
  getSessions,
  type VoiceSession
} from "@/lib/session-store";

type Account = { name: string; email: string };

export default function TranscriptsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account>({
    name: "Alex Morgan",
    email: "admin@gmail.com"
  });
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const accountValue = window.localStorage.getItem("vox_account");
    if (!accountValue) {
      router.replace("/");
      return;
    }
    try {
      const saved = JSON.parse(accountValue) as Account;
      setAccount(saved);
      setSessions(getSessions(saved.email));
    } catch {
      router.replace("/");
    }
  }, [router]);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return sessions;
    return sessions.filter(
      (session) =>
        session.title.toLowerCase().includes(clean) ||
        session.transcript.some((line) =>
          line.text.toLowerCase().includes(clean)
        )
    );
  }, [query, sessions]);

  function signOut() {
    window.localStorage.removeItem("vox_account");
    router.push("/");
  }

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <div className="session-brand">
          <span><AudioLines size={18} /></span>
          <div><strong>Vox</strong><small>Voice AI workspace</small></div>
        </div>

        <nav aria-label="Workspace navigation">
          <button onClick={() => router.push("/workspace")}>
            <LayoutGrid size={15} /> Overview
          </button>
          <button className="active"><FileText size={15} /> Transcripts</button>
          <button><Settings size={15} /> Settings</button>
        </nav>

        <div className="account-menu">
          <div className="account-avatar">AM</div>
          <div><strong>{account.name}</strong><span>{account.email}</span></div>
          <button type="button" onClick={signOut} aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="transcripts-wrap">
        <section className="transcripts-heading">
          <div>
            <p><span /> Conversation archive</p>
            <h1>All transcripts.</h1>
            <span>{sessions.length} saved {sessions.length === 1 ? "conversation" : "conversations"}, newest first.</span>
          </div>
          <label className="transcript-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations..."
            />
          </label>
        </section>

        <section className="transcript-library session-card">
          <header>
            <div><p>History</p><h2>Saved conversations</h2></div>
            <span>{filtered.length} results</span>
          </header>

          <div className="transcript-library-list">
            {filtered.map((session, index) => (
              <article
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/workspace/session/${session.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    router.push(`/workspace/session/${session.id}`);
                  }
                }}
              >
                <div className={`recent-icon tone-${index % 3}`}><AudioLines size={17} /></div>
                <div className="library-title">
                  <h3>{session.title}</h3>
                  <p>
                    {new Date(session.startedAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                  </p>
                </div>
                <div className="library-preview">
                  {session.transcript.at(-1)?.text || "No transcript captured"}
                </div>
                <div className="recent-meta">
                  <span>{formatDuration(session.durationSeconds)}</span>
                  <span>{session.transcript.length} lines</span>
                </div>
                <SessionActions
                  accountEmail={account.email}
                  session={session}
                  onRenamed={(updated) =>
                    setSessions((items) =>
                      items.map((item) => item.id === updated.id ? updated : item)
                    )
                  }
                  onDeleted={(sessionId) =>
                    setSessions((items) =>
                      items.filter((item) => item.id !== sessionId)
                    )
                  }
                />
              </article>
            ))}

            {filtered.length === 0 && (
              <div className="library-empty">
                <FileText size={25} />
                <strong>{query ? "No matching transcripts" : "No transcripts yet"}</strong>
                <span>{query ? "Try another search term." : "Complete a voice session to create your first transcript."}</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
