"use client";

import { useEffect, useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import ControlBar from "@/components/ControlBar";
import VoiceStage from "@/components/VoiceStage";

const statuses = ["Listening...", "Processing...", "Speaking..."];

export default function VoicePage() {
  const router = useRouter();
  const [statusIdx, setStatusIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusIdx((current) => (current + 1) % statuses.length);
    }, 2500);

    return () => window.clearInterval(timer);
  }, []);

  const status = statuses[statusIdx];
  const isSpeaking = status === "Speaking...";

  return (
    <main className="flex min-h-screen flex-col overflow-hidden bg-[#0A0A0C] text-white">
      <header className="z-10 flex h-16 shrink-0 items-center justify-between bg-transparent px-4 sm:h-20 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5B4FE8]">
            <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-normal">Vox</span>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-xs font-medium uppercase tracking-[0.08em] text-[#6B6B7B]">
          VOICE SESSION
        </div>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 text-sm font-medium text-red-300 transition hover:bg-red-500/15 focus:outline-none focus:ring-2 focus:ring-red-400/70"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Leave</span>
        </button>
      </header>

      <section className="flex flex-1 items-center justify-center px-4 pb-36 pt-8 sm:pb-40">
        <VoiceStage status={status} isSpeaking={isSpeaking} />
      </section>

      <ControlBar
        muted={muted}
        speakerOn={speakerOn}
        onToggleMute={() => setMuted((current) => !current)}
        onToggleSpeaker={() => setSpeakerOn((current) => !current)}
        onEndCall={() => router.push("/")}
      />
    </main>
  );
}
