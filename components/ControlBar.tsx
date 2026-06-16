import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";

type ControlBarProps = {
  muted: boolean;
  speakerOn: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
};

export default function ControlBar({
  muted,
  speakerOn,
  onToggleMute,
  onToggleSpeaker,
  onEndCall
}: ControlBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-5 z-20 flex justify-center px-4 sm:bottom-8">
      <div className="flex items-end gap-5 rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-4 sm:gap-7 sm:px-7">
        <ControlButton
          label={muted ? "Muted" : "Mic"}
          isAlert={muted}
          onClick={onToggleMute}
          className="h-[52px] w-[52px]"
          icon={
            muted ? (
              <MicOff className="h-5 w-5 text-red-300" aria-hidden="true" />
            ) : (
              <Mic className="h-5 w-5 text-white" aria-hidden="true" />
            )
          }
        />

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onEndCall}
            aria-label="End call"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <PhoneOff className="h-6 w-6" aria-hidden="true" />
          </button>
          <span className="h-4 text-xs font-medium text-[#8E8EA0]">End</span>
        </div>

        <ControlButton
          label={speakerOn ? "Speaker" : "Off"}
          isAlert={!speakerOn}
          onClick={onToggleSpeaker}
          className="h-[52px] w-[52px]"
          icon={
            speakerOn ? (
              <Volume2 className="h-5 w-5 text-white" aria-hidden="true" />
            ) : (
              <VolumeX className="h-5 w-5 text-red-300" aria-hidden="true" />
            )
          }
        />
      </div>
    </div>
  );
}

function ControlButton({
  label,
  isAlert,
  onClick,
  icon,
  className
}: {
  label: string;
  isAlert: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div className="pb-6">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`${className} flex items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 ${
          isAlert
            ? "border-red-400/45 bg-red-500/15 focus:ring-red-300"
            : "border-white/[0.22] bg-white/[0.04] hover:bg-white/[0.08] focus:ring-white/60"
        }`}
      >
        {icon}
      </button>
    </div>
  );
}
