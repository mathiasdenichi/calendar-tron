import { useEffect, useRef } from "react";
import { radarService, drawRadarFrame } from "../../lib/radarService";

const COLS = 3;
const ROWS = 4;

interface RadarBoxProps {
  onDoubleClick: () => void;
  width: number;
  height: number;
}

export function RadarBox({ onDoubleClick, width, height }: RadarBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pendingRef = useRef<{ frames: typeof radarService.frames; index: number } | null>(null);

  useEffect(() => {
    radarService.init();

    const tileW = Math.ceil(width / COLS);
    const tileH = Math.ceil(height / ROWS);

    async function doDraw(frames: typeof radarService.frames, index: number) {
      const frame = frames[index];
      if (!frame) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawingRef.current = true;
      try {
        await drawRadarFrame(ctx, frame, COLS, ROWS, tileW, tileH, 4);
      } finally {
        drawingRef.current = false;
        if (pendingRef.current) {
          const next = pendingRef.current;
          pendingRef.current = null;
          doDraw(next.frames, next.index);
        }
      }
    }

    const unsubscribe = radarService.subscribe((frames, index) => {
      if (drawingRef.current) {
        pendingRef.current = { frames, index };
      } else {
        doDraw(frames, index);
      }
    });

    return unsubscribe;
  }, [width, height]);

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-white/20 cursor-pointer flex-shrink-0"
      style={{ width, height }}
      onDoubleClick={onDoubleClick}
      title="Double-tap for full radar"
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block opacity-60"
      />
      <div className="absolute bottom-1 left-1 text-white/70 text-[8px] font-bold leading-none bg-black/50 px-1 py-0.5 rounded tracking-widest">
        RADAR
      </div>
    </div>
  );
}
