import { Mic, MicOff, Pause, PhoneOff, Play, Volume2, VolumeX } from "lucide-react";

type ControlBarProps = {
  muted: boolean;
  paused: boolean;
  speakerOn: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
};

export default function ControlBar({
  muted,
  paused,
  speakerOn,
  onToggleMute,
  onTogglePause,
  onToggleSpeaker,
  onEndCall
}: ControlBarProps) {
  return (
    <div className="session-controls">
      <ControlButton
        label={muted ? "Unmute" : "Mute"}
        active={muted}
        onClick={onToggleMute}
        icon={muted ? <MicOff size={19} /> : <Mic size={19} />}
      />

      <ControlButton
        label={paused ? "Resume voice input" : "Pause voice input"}
        active={paused}
        onClick={onTogglePause}
        icon={paused ? <Play size={19} /> : <Pause size={19} />}
      />

      <button className="end-control" type="button" onClick={onEndCall} aria-label="End session">
        <span><PhoneOff size={22} /></span>
        <small>End</small>
      </button>

      <ControlButton
        label={speakerOn ? "Speaker" : "Speaker off"}
        active={!speakerOn}
        onClick={onToggleSpeaker}
        icon={speakerOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
      />
    </div>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  icon
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`round-control ${active ? "active" : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}
