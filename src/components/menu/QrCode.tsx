import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  value: string;
  size?: number;
}

/**
 * Scannable code for the kiosk address, so a phone can reach it by camera
 * rather than by typing a MagicDNS hostname.
 *
 * Deliberately rendered dark-on-white regardless of theme: scanners need the
 * quiet zone and the contrast polarity, and a themed QR is a broken QR.
 */
export function QrCode({ value, size = 152 }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    let cancelled = false;
    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0b1020ff", light: "#ffffffff" },
    })
      .then(() => {
        if (!cancelled) setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (failed) return null;

  return (
    <div className="self-center rounded-xl bg-white p-1.5 shadow-lg">
      <canvas ref={canvasRef} width={size} height={size} className="block rounded-md" />
    </div>
  );
}
