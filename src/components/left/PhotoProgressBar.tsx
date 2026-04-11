import { useEffect, useState } from "react";

const DURATION_MS = 60 * 1000;

interface PhotoProgressBarProps {
  currentIndex: number;
  paused?: boolean;
}

export function PhotoProgressBar({ currentIndex, paused }: PhotoProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const start = performance.now();

    const tick = (now: number) => {
      if (paused) return;
      const elapsed = now - start;
      const pct = Math.min((elapsed / DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      }
    };

    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [currentIndex, paused]);

  return (
    <div className="w-full h-0.5 rounded-full bg-white/15 overflow-hidden">
      <div
        className="h-full rounded-full bg-white/60"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : "width 100ms linear",
        }}
      />
    </div>
  );
}
