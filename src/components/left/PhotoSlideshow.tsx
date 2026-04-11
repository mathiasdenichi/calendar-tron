import { useState, useEffect } from "react";
import { SlideshowPhoto } from "../../hooks/useICloudPhotos";

const FALLBACK_URL =
  "https://images.pexels.com/photos/1591382/pexels-photo-1591382.jpeg?auto=compress&cs=tinysrgb&w=1920";

interface PhotoSlideshowProps {
  currentPhoto: SlideshowPhoto | null;
  loading: boolean;
  syncing: boolean;
  syncNow: () => void;
  onSyncReady: (syncing: boolean, syncNow: () => void) => void;
}

export function PhotoSlideshow({ currentPhoto, loading, syncing, syncNow, onSyncReady }: PhotoSlideshowProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    onSyncReady(syncing, syncNow);
  }, [syncing, syncNow, onSyncReady]);

  const targetUrl = currentPhoto?.url || (!loading ? FALLBACK_URL : null);

  useEffect(() => {
    if (!targetUrl) return;

    if (!displayUrl) {
      setDisplayUrl(targetUrl);
      return;
    }

    if (targetUrl === displayUrl) return;

    setNextUrl(targetUrl);
    setTransitioning(false);

    const t1 = setTimeout(() => setTransitioning(true), 50);
    const t2 = setTimeout(() => {
      setDisplayUrl(targetUrl);
      setNextUrl(null);
      setTransitioning(false);
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [targetUrl]);

  if (loading && !displayUrl) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="absolute inset-0 animate-pulse bg-white/5" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {displayUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${displayUrl})` }}
        />
      )}

      {nextUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1400ms] ease-in-out"
          style={{
            backgroundImage: `url(${nextUrl})`,
            opacity: transitioning ? 1 : 0,
          }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
    </div>
  );
}
