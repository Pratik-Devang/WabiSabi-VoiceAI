import { Mic } from "lucide-react";

const bars = [2, 4, 7, 5, 9, 6, 11, 8, 4, 10, 7, 3, 8, 5, 2];
const durations = [0.5, 1.35, 0.72, 1.58, 0.94, 1.18, 0.62, 1.46, 0.82, 1.6, 1.04, 0.56, 1.28, 0.76, 1.5];

export default function AuthVisual() {
  return (
    <aside className="relative hidden min-h-[580px] overflow-hidden bg-[linear-gradient(145deg,#1A1035_0%,#0D0D1A_60%,#1A0A2E_100%)] md:block md:rounded-r-[24px]">
      <div className="relative z-10 flex h-full min-h-[580px] flex-col items-center justify-center px-10">
        <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#5B21B6]">
          <Mic className="h-9 w-9 text-[#EDE9FE]" strokeWidth={1.8} aria-hidden="true" />
        </div>

        <svg
          viewBox="0 0 720 180"
          className="mt-10 h-[180px] w-full overflow-visible"
          aria-hidden="true"
        >
          <g className="[animation:waveFlow_4s_linear_infinite]">
            <path
              d="M-360 94 C-300 18 -248 170 -188 94 S-76 18 -16 94 S96 170 156 94 S268 18 328 94 S440 170 500 94 S612 18 672 94 S784 170 844 94 S956 18 1016 94"
              fill="none"
              stroke="#7C3AED"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.2"
            />
            <path
              d="M-360 94 C-304 52 -244 136 -188 94 S-72 52 -16 94 S100 136 156 94 S272 52 328 94 S444 136 500 94 S616 52 672 94 S788 136 844 94 S960 52 1016 94"
              fill="none"
              stroke="#A78BFA"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.6"
            />
          </g>
        </svg>

        <div className="mt-2 flex h-16 items-end justify-center gap-2">
          {bars.map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="w-1.5 origin-bottom rounded-full bg-[linear-gradient(180deg,#C4B5FD_0%,#7C3AED_100%)]"
              style={{
                height: `${height * 4}px`,
                opacity: index % 2 === 0 ? 0.4 : 0.8,
                animation: `waveBar ${durations[index]}s linear ${index * 0.07}s infinite`
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        <p className="absolute bottom-12 left-0 right-0 text-center text-[15px] font-light tracking-[0.05em] text-white/[0.45] opacity-0 [animation:fadeIn_0.8s_ease_1s_forwards]">
          Your voice, your conversation.
        </p>
      </div>
    </aside>
  );
}
