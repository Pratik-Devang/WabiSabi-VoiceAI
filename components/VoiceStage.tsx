import { Bot } from "lucide-react";
import WaveformVisualizer from "@/components/WaveformVisualizer";

type VoiceStageProps = {
  status: string;
  isSpeaking: boolean;
};

export default function VoiceStage({ status, isSpeaking }: VoiceStageProps) {
  return (
    <div className="themed-voice-stage">
      <div className={`bot-orb ${isSpeaking ? "speaking" : ""}`}>
        <span className="orb-ring" />
        <span className="orb-ring delay" />
        <div><Bot size={43} /></div>
      </div>

      <div>
        <h2>Vox AI</h2>
        <p className={status === "Paused" ? "paused-status" : ""}><i /> {status}</p>
      </div>

      <WaveformVisualizer isActive={isSpeaking} />
    </div>
  );
}
