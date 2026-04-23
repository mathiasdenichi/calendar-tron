const LAT = 27.2117;
const LON = -82.4717;
const ZOOM = 6;

export interface RadarFrame {
  time: number;
  path: string;
}

function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

function tileToPixel(lat: number, lon: number, zoom: number, tileX: number, tileY: number) {
  const n = Math.pow(2, zoom);
  const px = (((lon + 180) / 360) * n - tileX) * 256;
  const latRad = (lat * Math.PI) / 180;
  const py = (((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n - tileY) * 256;
  return { px, py };
}

export const TILE_X: number = latLonToTile(LAT, LON, ZOOM).x;
export const TILE_Y: number = latLonToTile(LAT, LON, ZOOM).y;
export const DOT_X: number = tileToPixel(LAT, LON, ZOOM, TILE_X, TILE_Y).px;
export const DOT_Y: number = tileToPixel(LAT, LON, ZOOM, TILE_X, TILE_Y).py;

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

export async function drawRadarFrame(
  ctx: CanvasRenderingContext2D,
  frame: RadarFrame,
  cols: number,
  rows: number,
  tileW: number,
  tileH: number,
  markerRadius: number,
  colorScheme: number = 2
) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const centerOffX = Math.floor(cols / 2);
  const centerOffY = Math.floor(rows / 2);
  const mx = DOT_X * (tileW / 256) + centerOffX * tileW;
  const my = DOT_Y * (tileH / 256) + centerOffY * tileH;

  const tiles: { tx: number; ty: number; dx: number; dy: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        tx: TILE_X - centerOffX + c,
        ty: TILE_Y - centerOffY + r,
        dx: c * tileW,
        dy: r * tileH,
      });
    }
  }

  // Load all images fully before touching the canvas — prevents blank flash
  const loaded = await Promise.all(
    tiles.map(async ({ tx, ty, dx, dy }) => {
      const osmUrl = `https://tile.openstreetmap.org/${ZOOM}/${tx}/${ty}.png`;
      const radarUrl = `https://tilecache.rainviewer.com${frame.path}/256/${ZOOM}/${tx}/${ty}/${colorScheme}/1_1.png`;
      const [osmImg, radarImg] = await Promise.all([
        loadImage(osmUrl).catch(() => null),
        loadImage(radarUrl).catch(() => null),
      ]);
      return { dx, dy, osmImg, radarImg };
    })
  );

  // Draw to offscreen canvas first, then blit atomically — no visible clear flash
  const offscreen = document.createElement("canvas");
  offscreen.width = cw;
  offscreen.height = ch;
  const off = offscreen.getContext("2d")!;

  for (const { dx, dy, osmImg } of loaded) {
    if (osmImg) off.drawImage(osmImg, dx, dy, tileW, tileH);
  }
  for (const { dx, dy, radarImg } of loaded) {
    if (radarImg) {
      off.globalAlpha = 0.8;
      off.drawImage(radarImg, dx, dy, tileW, tileH);
      off.globalAlpha = 1;
    }
  }

  off.beginPath();
  off.arc(mx, my, markerRadius, 0, Math.PI * 2);
  off.fillStyle = "#ef4444";
  off.fill();
  off.strokeStyle = "white";
  off.lineWidth = Math.max(1.5, markerRadius / 3);
  off.stroke();

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(offscreen, 0, 0);
}

class RadarService {
  frames: RadarFrame[] = [];
  frameIndex = 0;
  loaded = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private subscribers = new Set<(frames: RadarFrame[], index: number) => void>();
  private fetchStarted = false;

  init() {
    if (this.fetchStarted) return;
    this.fetchStarted = true;

    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((data) => {
        const past: RadarFrame[] = data.radar?.past || [];
        this.frames = past.slice(-8);
        this.frameIndex = this.frames.length - 1;
        this.loaded = true;
        this.notify();
        this.startLoop();
      })
      .catch(() => { this.loaded = true; });
  }

  private startLoop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.frames.length < 2) return;

    const schedule = () => {
      const isLast = this.frameIndex === this.frames.length - 1;
      // Hold the last frame 2s, all others 700ms
      this.intervalId = setTimeout(() => {
        this.frameIndex = (this.frameIndex + 1) % this.frames.length;
        this.notify();
        schedule();
      }, isLast ? 2000 : 700);
    };

    schedule();
  }

  stopLoop() {
    if (this.intervalId) { clearTimeout(this.intervalId); this.intervalId = null; }
  }

  private notify() {
    this.subscribers.forEach((cb) => cb(this.frames, this.frameIndex));
  }

  subscribe(cb: (frames: RadarFrame[], index: number) => void) {
    this.subscribers.add(cb);
    if (this.loaded) cb(this.frames, this.frameIndex);
    return () => this.subscribers.delete(cb);
  }

  setFrameIndex(i: number) {
    this.frameIndex = i;
    this.notify();
  }

  setPlaying(playing: boolean) {
    if (playing) {
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }
}

export const radarService = new RadarService();
