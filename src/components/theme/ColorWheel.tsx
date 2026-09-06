import { useCallback, useEffect, useRef, useState } from "react";
import { Hsv, clamp, hexToHsv, hsvToHex } from "../../lib/color";

interface ColorWheelProps {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
}

const DEFAULT_SIZE = 190;

export function ColorWheel({ value, onChange, size = DEFAULT_SIZE }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 0, s: 0, v: 1 });

  // Follow external changes (tab switch, saved swatch, reset) without clobbering
  // the hue/saturation the user is currently dragging: only resync when the
  // incoming colour is genuinely different from what we'd emit.
  useEffect(() => {
    if (hsvToHex(hsv) === value) return;
    const next = hexToHsv(value);
    if (next) setHsv(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Painted at full brightness and never repainted: baking `value` into the
  // pixels turns the whole wheel black at v=0 (which a black background theme
  // hits immediately) and it reads as broken. Brightness lives on the slider,
  // and the marker still shows the true colour.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = ctx.createImageData(size, size);
    const radius = size / 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const i = (y * size + x) * 4;

        if (dist > radius) {
          img.data[i + 3] = 0;
          continue;
        }

        let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (angle < 0) angle += 360;

        const { r, g, b } = hsvToRgbLocal(angle, Math.min(dist / radius, 1), 1);
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        // Feather the last pixel so the rim isn't visibly stair-stepped.
        img.data[i + 3] = dist > radius - 1 ? Math.round(clamp(radius - dist, 0, 1) * 255) : 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }, [size]);

  const pickFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const radius = rect.width / 2;
      const dx = clientX - rect.left - radius;
      const dy = clientY - rect.top - radius;

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;

      const next: Hsv = {
        h: angle,
        s: clamp(Math.sqrt(dx * dx + dy * dy) / radius, 0, 1),
        v: hsv.v,
      };
      setHsv(next);
      onChange(hsvToHex(next));
    },
    [hsv.v, onChange]
  );

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pickFromPointer(e.clientX, e.clientY);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    pickFromPointer(e.clientX, e.clientY);
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next: Hsv = { ...hsv, v: Number(e.target.value) / 100 };
    setHsv(next);
    onChange(hsvToHex(next));
  }

  const markerRadius = (size / 2) * hsv.s;
  const markerAngle = (hsv.h * Math.PI) / 180;
  const markerX = size / 2 + Math.cos(markerAngle) * markerRadius;
  const markerY = size / 2 + Math.sin(markerAngle) * markerRadius;

  const fullBright = hsvToHex({ h: hsv.h, s: hsv.s, v: 1 });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          // touch-none stops the drawer from panning while dragging the wheel.
          className="rounded-full cursor-crosshair touch-none block"
          // A floor of 0.35 keeps the wheel readable even at zero brightness.
          style={{ width: size, height: size, opacity: 0.35 + 0.65 * hsv.v }}
        />
        <div
          className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none"
          style={{
            left: markerX - 10,
            top: markerY - 10,
            backgroundColor: value,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.5)",
          }}
        />
      </div>

      <div className="w-full flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-[11px] uppercase tracking-wider">Brightness</span>
          <span className="text-white/40 text-[11px] tabular-nums">{Math.round(hsv.v * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(hsv.v * 100)}
          onChange={handleValueChange}
          aria-label="Brightness"
          className="w-full h-3 appearance-none rounded-full cursor-pointer touch-none accent-white"
          style={{ background: `linear-gradient(to right, #000000, ${fullBright})` }}
        />
      </div>
    </div>
  );
}

/** Inlined to avoid an object allocation per pixel while painting the wheel. */
function hsvToRgbLocal(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}
