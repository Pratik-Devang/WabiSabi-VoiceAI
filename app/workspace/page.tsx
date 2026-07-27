"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState
} from "react";
import {
  AudioLines,
  FileText,
  LogOut,
  Menu,
  MessageSquare,
  Mic2,
  PanelLeftClose,
  Plus,
  Send,
  Sparkles,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import SessionActions from "@/components/SessionActions";
import {
  appendSessionTranscript,
  createConversation,
  getSessions,
  renameSession,
  resumeSession,
  type TranscriptEntry,
  type VoiceSession
} from "@/lib/session-store";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const suggestions = [
  "How do I safely maintain the Alfa Laval lobe pump?",
  "Help me troubleshoot the Markem SDX40 printer",
  "Explain the FRL maintenance procedure"
];

type Account = { name: string; email: string };

export default function WorkspacePage() {
  const router = useRouter();
  const feedEndRef = useRef<HTMLDivElement>(null);
  const [account, setAccount] = useState<Account>({
    name: "Alex Morgan",
    email: "admin@gmail.com"
  });
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [selected, setSelected] = useState<VoiceSession | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceStarting, setVoiceStarting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.transcript.length, loading]);

  function reloadSessions(nextSelected?: VoiceSession | null) {
    setSessions(getSessions(account.email));
    if (nextSelected !== undefined) setSelected(nextSelected);
  }

  function openSession(session: VoiceSession) {
    setSelected(session);
    setError("");
    setSidebarOpen(false);
  }

  function newChat() {
    setSelected(null);
    setMessage("");
    setError("");
    setSidebarOpen(false);
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const clean = message.trim();
    if (!clean || loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    const previousTranscript = selected?.transcript ?? [];
    let target = selected ?? createConversation(account.email);
    if (target.title === "New conversation" || target.title === "Text conversation") {
      target = renameSession(account.email, target.id, clean.slice(0, 48)) ?? target;
    }

    const userEntry: TranscriptEntry = {
      speaker: "You",
      text: clean,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    };
    target =
      appendSessionTranscript(account.email, target.id, [userEntry]) ?? target;
    reloadSessions(target);

    try {
      const response = await fetch(`${apiUrl}/chat/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: clean,
          transcript: previousTranscript.map(({ speaker, text }) => ({
            speaker,
            text
          }))
        })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(body.detail || "Vox could not answer right now.");
      }

      const data = (await response.json()) as { answer: string };
      const answer: TranscriptEntry = {
        speaker: "Vox AI",
        text: data.answer,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      };
      const updated =
        appendSessionTranscript(account.email, target.id, [answer]) ?? target;
      reloadSessions(updated);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Vox could not answer right now."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function startVoice() {
    if (voiceStarting) return;
    setVoiceStarting(true);
    setError("");

    try {
      const target = selected ?? createConversation(account.email);
      let contextToken: string | undefined;

      if (target.transcript.length) {
        const response = await fetch(`${apiUrl}/voice/context`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: target.transcript.map(({ speaker, text }) => ({
              speaker,
              text
            }))
          })
        });
        if (!response.ok) {
          throw new Error("Unable to prepare the voice conversation.");
        }
        const data = (await response.json()) as { context_token: string };
        contextToken = data.context_token;
      }

      const active = resumeSession(account.email, target.id, contextToken);
      if (!active) throw new Error("Unable to open this conversation.");
      router.push("/voice");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to prepare the voice conversation."
      );
      setVoiceStarting(false);
    }
  }

  function signOut() {
    window.localStorage.removeItem("vox_account");
    router.push("/");
  }

  const initials = account.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="assistant-shell">
      {sidebarOpen && (
        <button
          className="assistant-sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`assistant-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="assistant-sidebar-head">
          <div className="assistant-brand">
            <span><AudioLines size={17} /></span>
            <div><strong>Vox</strong><small>Voice AI workspace</small></div>
          </div>
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>

        <button className="assistant-new-chat" onClick={newChat}>
          <MessageSquare size={16} /> New chat
        </button>

        <nav className="assistant-primary-nav" aria-label="Workspace">
          <button onClick={() => router.push("/workspace/transcripts")}>
            <FileText size={16} /> Library
          </button>
        </nav>

        <section className="assistant-history">
          <header>
            <span>Recent chats</span>
            <button
              onClick={() => router.push("/workspace/transcripts")}
              aria-label="View all transcripts"
            >
              View all
            </button>
          </header>
          <div>
            {sessions.slice(0, 4).map((session) => (
              <article
                className={selected?.id === session.id ? "active" : ""}
                key={session.id}
              >
                <button onClick={() => openSession(session)}>
                  <MessageSquare size={14} />
                  <span>{session.title}</span>
                </button>
                <SessionActions
                  accountEmail={account.email}
                  session={session}
                  onRenamed={(updated) => {
                    setSessions((items) =>
                      items.map((item) => item.id === updated.id ? updated : item)
                    );
                    if (selected?.id === updated.id) setSelected(updated);
                  }}
                  onDeleted={(sessionId) => {
                    setSessions((items) =>
                      items.filter((item) => item.id !== sessionId)
                    );
                    if (selected?.id === sessionId) setSelected(null);
                  }}
                />
              </article>
            ))}
            {sessions.length === 0 && (
              <p>Your saved conversations will appear here.</p>
            )}
          </div>
        </section>

        <div className="assistant-account">
          <span className="account-avatar">{initials || "VX"}</span>
          <div>
            <strong>{account.name}</strong>
            <small>{account.email}</small>
          </div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <section className={`assistant-main ${selected ? "has-chat" : "is-empty"}`}>
        <header className="assistant-mobile-header">
          <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
            <Menu size={19} />
          </button>
          <div className="assistant-mobile-brand">
            <AudioLines size={16} /><strong>Vox</strong>
          </div>
          {selected ? (
            <SessionActions
              accountEmail={account.email}
              session={selected}
              onRenamed={(updated) => {
                setSelected(updated);
                setSessions((items) =>
                  items.map((item) => item.id === updated.id ? updated : item)
                );
              }}
              onDeleted={(sessionId) => {
                setSessions((items) =>
                  items.filter((item) => item.id !== sessionId)
                );
                setSelected(null);
              }}
            />
          ) : <span />}
        </header>

        <div className="assistant-content">
          {selected ? (
            <div className="assistant-chat-feed">
              <header>
                <p>Saved conversation</p>
                <h1>{selected.title}</h1>
              </header>
              {selected.transcript.map((line, index) => (
                <article
                  className={line.speaker === "You" ? "from-user" : "from-vox"}
                  key={`${line.time}-${index}`}
                >
                  {line.speaker === "Vox AI" && (
                    <span className="assistant-message-icon">
                      <Sparkles size={15} />
                    </span>
                  )}
                  <div>
                    {line.speaker === "Vox AI" && <strong>Vox AI</strong>}
                    <p>{line.text}</p>
                  </div>
                </article>
              ))}
              {loading && (
                <article className="from-vox">
                  <span className="assistant-message-icon">
                    <Sparkles size={15} />
                  </span>
                  <div><strong>Vox AI</strong><p className="assistant-thinking">Thinking...</p></div>
                </article>
              )}
              <div ref={feedEndRef} />
            </div>
          ) : (
            <div className="assistant-empty-state">
              <span><Sparkles size={23} /></span>
              <h1>Where should we begin?</h1>
              <p>Ask Vox about any machine, procedure, or manual in your knowledge base.</p>
            </div>
          )}

          <div className="assistant-composer-zone">
            {error && (
              <div className="assistant-composer-error">
                {error}
                <button onClick={() => setError("")} aria-label="Dismiss error">
                  <X size={13} />
                </button>
              </div>
            )}
            <form className="assistant-composer" onSubmit={sendMessage}>
              <button
                type="button"
                className="assistant-add-button"
                aria-label="Start a new chat"
                title="New chat"
                onClick={newChat}
              >
                <Plus size={19} />
              </button>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleComposerKey}
                placeholder="Ask Vox"
                rows={1}
                maxLength={2000}
                aria-label="Message Vox"
              />
              <button
                type="button"
                className="assistant-voice-button"
                onClick={startVoice}
                disabled={voiceStarting}
                aria-label="Start voice conversation"
                title="Start voice conversation"
              >
                <Mic2 size={19} />
              </button>
              <button
                type="submit"
                className="assistant-send-button"
                disabled={!message.trim() || loading}
                aria-label="Send message"
              >
                <Send size={17} />
              </button>
            </form>

            {!selected && (
              <div className="assistant-suggestions">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} onClick={() => setMessage(suggestion)}>
                    <Sparkles size={14} /> {suggestion}
                  </button>
                ))}
              </div>
            )}
            <small>Vox answers from your indexed manuals. Verify safety-critical steps.</small>
          </div>
        </div>
      </section>
    </main>
  );
}
