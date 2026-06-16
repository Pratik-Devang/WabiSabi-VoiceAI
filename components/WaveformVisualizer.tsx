type WaveformVisualizerProps = {
  isActive: boolean;
};

const heights = [2, 4, 7, 5, 9, 6, 11, 8, 4, 10, 7, 3, 8, 5, 2];
const durations = [0.5, 1.35, 0.72, 1.58, 0.94, 1.18, 0.62, 1.46, 0.82, 1.6, 1.04, 0.56, 1.28, 0.76, 1.5];

export default function WaveformVisualizer({ isActive }: WaveformVisualizerProps) {
  return (
    <div
      className="flex h-16 items-center justify-center gap-1.5"
      aria-label={isActive ? "Active voice waveform" : "Inactive voice waveform"}
    >
      {heights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="w-1.5 origin-center rounded-full transition-[background-color,opacity,height] duration-300 sm:w-2"
          style={{
            height: isActive ? `${height * 4}px` : "2px",
            opacity: isActive ? 0.5 + (index % 5) * 0.1 : 0.15,
            backgroundColor: isActive
              ? "rgba(91,79,232,0.75)"
              : "rgba(91,79,232,0.35)",
            animation: isActive
              ? `waveBar ${durations[index]}s linear ${index * 0.04}s infinite`
              : "none"
          }}
        />
      ))}
    </div>
  );
}
