import { Bot } from "lucide-react";
import WaveformVisualizer from "@/components/WaveformVisualizer";

type VoiceStageProps = {
  status: string;
  isSpeaking: boolean;
};

export default function VoiceStage({ status, isSpeaking }: VoiceStageProps) {
  return (
    <div className="flex flex-col items-center gap-8 text-center sm:gap-10">
      <div className="relative flex h-[96px] w-[96px] items-center justify-center sm:h-[110px] sm:w-[110px]">
        {isSpeaking && (
          <>
            <svg className="absolute inset-[-10px]" viewBox="0 0 130 130" aria-hidden="true">
              <circle
                cx="65"
                cy="65"
                r="46"
                fill="none"
                stroke="rgba(139,92,246,0.35)"
                strokeDasharray="4 6"
                strokeWidth="1.5"
                className="origin-center [animation:ringExpand_1.8s_ease-out_infinite]"
              />
            </svg>
            <svg className="absolute inset-[-10px]" viewBox="0 0 130 130" aria-hidden="true">
              <circle
                cx="65"
                cy="65"
                r="46"
                fill="none"
                stroke="rgba(139,92,246,0.35)"
                strokeDasharray="4 6"
                strokeWidth="1.5"
                className="origin-center [animation:ringExpand_1.8s_ease-out_0.45s_infinite]"
              />
            </svg>
          </>
        )}
        <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-[#5B4FE8]">
          <Bot className="h-11 w-11 text-white sm:h-12 sm:w-12" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
          Vox AI
        </h1>
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#8E8EA0]">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 [animation:blink_1.2s_linear_infinite]" />
          <span>{status}</span>
        </div>
      </div>

      <WaveformVisualizer isActive={isSpeaking} />
    </div>
  );
}
