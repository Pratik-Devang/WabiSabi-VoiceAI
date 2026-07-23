"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Clock3,
  Headphones,
  LockKeyhole,
  LogOut,
  Radio,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import ControlBar from "@/components/ControlBar";
import VoiceStage from "@/components/VoiceStage";
import {
  beginSession,
  finishSession,
  formatClock,
  getActiveSession,
  updateActiveTranscript
} from "@/lib/session-store";
import { useVoiceSession } from "@/lib/use-voice-session";

export default function VoicePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAtRef = useRef("");
  const savedRef = useRef(false);
  const {
    status,
    transcript,
    error,
    ragQuery,
    connected
  } = useVoiceSession({ userId, muted, paused, speakerOn });

  useEffect(() => {
    const accountValue = window.localStorage.getItem("vox_account");
    if (!accountValue) {
      router.replace("/");
      return;
    }

    try {
      const account = JSON.parse(accountValue) as { email: string };
      setUserId(account.email);
      const active = getActiveSession() ?? beginSession(account.email);
      startedAtRef.current = active.startedAt;

      const updateDuration = () => {
        setElapsedSeconds(
          Math.max(
            0,
            Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)
          )
        );
      };
      updateDuration();
      const durationTimer = window.setInterval(updateDuration, 1000);
      return () => window.clearInterval(durationTimer);
    } catch {
      window.localStorage.removeItem("vox_account");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    updateActiveTranscript(transcript);
  }, [transcript]);

  function endSession() {
    if (!savedRef.current) {
      finishSession(transcript);
      savedRef.current = true;
    }
    router.push("/workspace");
  }

  function exportTranscript() {
    const content = transcript
      .map((item) => `[${item.time}] ${item.speaker}: ${item.text}`)
      .join("\n\n");
    const blob = new Blob([content || "No transcript was captured."], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vox-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const isSpeaking = status === "Speaking...";

  return (
    <main className="session-page">
      <header className="session-header">
        <div className="session-brand">
          <span><AudioLines size={18} /></span>
          <div><strong>Vox</strong><small>Voice AI workspace</small></div>
        </div>

        <div className="session-label"><i /> Live voice session</div>

        <button className="leave-button" type="button" onClick={endSession}>
          <LogOut size={15} /> Leave
        </button>
      </header>

      <div className="session-wrap">
        <div className="session-heading">
          <div>
            <p><span /> Session active</p>
            <h1>Your conversation space.</h1>
            <span>Speak naturally. Vox will listen, respond, and capture the conversation as it happens.</span>
          </div>
          <div className="secure-session"><LockKeyhole size={14} /> Private session</div>
        </div>

        <div className="session-grid">
          <section className="voice-card session-card">
            <div className="card-topline">
              <div><p>Voice channel</p><h2>Vox AI</h2></div>
              <span className={`connection-badge ${connected ? "" : "offline"}`}>
                <Radio size={13} /> {connected ? "Connected" : "Connecting"}
              </span>
            </div>

            <div className="voice-stage-wrap">
              <div className="voice-grid-pattern" />
              <VoiceStage status={status} isSpeaking={isSpeaking} />
            </div>

            <ControlBar
              muted={muted}
              paused={paused}
              speakerOn={speakerOn}
              onToggleMute={() => setMuted((current) => !current)}
              onTogglePause={() => setPaused((current) => !current)}
              onToggleSpeaker={() => setSpeakerOn((current) => !current)}
              onEndCall={endSession}
            />
          </section>

          <section className="transcript-card session-card">
            <div className="card-topline">
              <div><p>Conversation</p><h2>Live transcript</h2></div>
              <span className={`live-badge ${paused || !connected ? "paused" : ""}`}>
                <i /> {paused ? "Paused" : connected ? "Live" : "Offline"}
              </span>
            </div>

            <div className="transcript-feed" aria-live="polite">
              {transcript.map((item) => (
                <article className={item.speaker === "Vox AI" ? "ai-line" : ""} key={`${item.time}-${item.text}`}>
                  <div className="speaker-avatar">
                    {item.speaker === "Vox AI" ? <Sparkles size={15} /> : "Y"}
                  </div>
                  <div>
                    <header><strong>{item.speaker}</strong><time>{item.time}</time></header>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}

              {transcript.length === 0 && !error && (
                <div className="transcript-empty">
                  <AudioLines size={22} />
                  <strong>{ragQuery ? "Searching the knowledge base" : "Waiting for your voice"}</strong>
                  <span>
                    {ragQuery
                      ? ragQuery
                      : "Your live conversation will appear here as you speak."}
                  </span>
                </div>
              )}

              <article className="interim-line">
                <div className="speaker-avatar">Y</div>
                <div>
                  <header>
                    <strong>You</strong>
                    <span>{paused ? "Input paused" : connected ? "Listening now" : "Not connected"}</span>
                  </header>
                  <p>
                    {paused
                      ? "Voice input is paused. Resume when you're ready."
                      : error
                        ? error
                        : ragQuery
                          ? `Looking up: ${ragQuery}`
                          : status === "Listening..."
                            ? "Go ahead, I'm listening..."
                            : status}
                  </p>
                </div>
              </article>
            </div>

            <footer className="transcript-footer">
              <span><AudioLines size={14} /> Transcript updates automatically</span>
              <button type="button" onClick={exportTranscript}>Export</button>
            </footer>
          </section>

          <section className="mini-card session-card">
            <span className="mini-icon coral"><Clock3 size={18} /></span>
            <div>
              <p>Session time</p>
              <strong>{formatClock(elapsedSeconds)}</strong>
              <span>
                Started at {startedAtRef.current
                  ? new Date(startedAtRef.current).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "now"}
              </span>
            </div>
          </section>

          <section className="mini-card session-card">
            <span className="mini-icon teal"><Headphones size={18} /></span>
            <div>
              <p>Audio quality</p>
              <strong>{connected ? "Live" : "Offline"}</strong>
              <span>{connected ? "16 kHz input · 24 kHz response" : "Start the backend on port 8000"}</span>
            </div>
          </section>

          <section className="tip-card">
            <div><Sparkles size={16} /> RAG enabled</div>
            <p>Vox searches the indexed insurance knowledge base when a question needs plan, rider, eligibility, or claims details.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
