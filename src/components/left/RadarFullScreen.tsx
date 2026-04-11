import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { radarService, drawRadarFrame, RadarFrame, DOT_X, DOT_Y } from "../../lib/radarService";

interface RadarFullScreenProps {
  onClose: () => void;
}

const COLS = 7;
const ROWS = 5;
const TILE_SIZE = 256;
const CANVAS_W = TILE_SIZE * COLS;
const CANVAS_H = TILE_SIZE * ROWS;
const CENTER_OFF_X = Math.floor(COLS / 2);
const CENTER_OFF_Y = Math.floor(ROWS / 2);
const MARKER_X = DOT_X + CENTER_OFF_X * TILE_SIZE;
const MARKER_Y = DOT_Y + CENTER_OFF_Y * TILE_SIZE;

export function RadarFullScreen({ onClose }: RadarFullScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const framesRef = useRef<RadarFrame[]>([]);
  const frameIndexRef = useRef(0);
  const playingRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drawingRef = useRef(false);
  const pendingDrawRef = useRef<{ frames: RadarFrame[]; index: number } | null>(null);

  async function drawFullFrame(frames: RadarFrame[], index: number) {
    const frame = frames[index];
    if (!frame) return;
    if (drawingRef.current) {
      pendingDrawRef.current = { frames, index };
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawingRef.current = true;
    try {
      await drawRadarFrame(ctx, frame, COLS, ROWS, TILE_SIZE, TILE_SIZE, 10, 4);

      const d = new Date(frame.time * 1000);
      const label = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(CANVAS_W - 160, CANVAS_H - 44, 154, 36);
      ctx.fillStyle = "white";
      ctx.textAlign = "right";
      ctx.fillText(label, CANVAS_W - 14, CANVAS_H - 16);
    } finally {
      drawingRef.current = false;
      if (pendingDrawRef.current) {
        const next = pendingDrawRef.current;
        pendingDrawRef.current = null;
        drawFullFrame(next.frames, next.index);
      }
    }
  }

  function startLoop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (framesRef.current.length < 2) return;
    intervalRef.current = setInterval(() => {
      if (!playingRef.current) return;
      frameIndexRef.current = (frameIndexRef.current + 1) % framesRef.current.length;
      setCurrentIndex(frameIndexRef.current);
      drawFullFrame(framesRef.current, frameIndexRef.current);
    }, 500);
  }

  useEffect(() => {
    radarService.init();

    let initialized = false;
    const unsubscribe = radarService.subscribe((frames, _index) => {
      if (frames.length === 0) return;
      framesRef.current = frames;
      setFrameCount(frames.length);
      if (!initialized) {
        initialized = true;
        frameIndexRef.current = 0;
        setCurrentIndex(0);
        setLoaded(true);
        drawFullFrame(frames, 0);
        startLoop();
      }
    });

    return () => {
      unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleTogglePlay() {
    const next = !playingRef.current;
    playingRef.current = next;
    setIsPlaying(next);
  }

  function handleSelectFrame(i: number) {
    playingRef.current = false;
    setIsPlaying(false);
    frameIndexRef.current = i;
    setCurrentIndex(i);
    drawFullFrame(framesRef.current, i);
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col w-full h-full">
      <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-gray-900">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="max-w-full max-h-full object-contain"
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-sky-500/40 border-t-sky-400 rounded-full animate-spin" />
              <span className="text-white/60 text-lg font-light">Loading radar...</span>
            </div>
          </div>
        )}
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
            <span className="text-white font-semibold text-lg tracking-wide">Precipitation Radar</span>
            <span className="text-white/50 text-sm ml-3">Sarasota, FL</span>
          </div>
        </div>
        {frameCount > 0 && (
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button
              onClick={handleTogglePlay}
              className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2 text-white/80 hover:text-white hover:bg-black/70 transition-all text-sm font-medium"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2">
              {Array.from({ length: frameCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectFrame(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentIndex ? "bg-sky-400 scale-125" : "bg-white/30 hover:bg-white/60"}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="h-16 bg-gray-950 border-t border-white/10 flex items-center px-8">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
        >
          <div className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
            <ChevronLeft size={20} />
          </div>
          <span className="text-sm font-medium">Back to Calendar</span>
        </button>
        <div className="ml-auto flex items-center gap-6 text-white/40 text-xs">
          <span>Map data OpenStreetMap</span>
          <span>Radar RainViewer</span>
        </div>
      </div>
    </div>
  );
}
