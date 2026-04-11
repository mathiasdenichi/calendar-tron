import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Clock } from "./Clock";
import { WeatherPanel } from "./WeatherPanel";
import { PhotoSlideshow } from "./PhotoSlideshow";
import { PhotoStrip } from "./PhotoStrip";
import { PhotoProgressBar } from "./PhotoProgressBar";
import { useICloudPhotos } from "../../hooks/useICloudPhotos";

interface LeftPanelProps {
  onOpenRadar: () => void;
}

export function LeftPanel({ onOpenRadar }: LeftPanelProps) {
  const { photos, currentPhoto, currentIndex, history, upcomingIndex, loading, syncing, syncNow, setCurrentIndex } =
    useICloudPhotos();

  const [syncingUI, setSyncingUI] = useState(false);
  const [syncFn, setSyncFn] = useState<(() => void) | null>(null);

  const handleSyncReady = useCallback((isSyncing: boolean, fn: () => void) => {
    setSyncingUI(isSyncing);
    setSyncFn(() => fn);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <PhotoSlideshow
        currentPhoto={currentPhoto}
        loading={loading}
        syncing={syncing}
        syncNow={syncNow}
        onSyncReady={handleSyncReady}
      />

      <div className="relative z-10 h-full flex flex-col p-8">
        <div className="pt-2 flex items-start justify-between">
          <Clock />

          <div className="flex flex-col items-end gap-1.5 mt-1">
            <button
              onClick={() => syncFn?.()}
              disabled={syncingUI}
              title="Sync photos from iCloud"
              className={`
                w-9 h-9 rounded-full flex items-center justify-center
                bg-white/10 border border-white/20 backdrop-blur-sm
                text-white/80 hover:text-white hover:bg-white/20
                transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60
              `}
            >
              <RefreshCw
                size={15}
                className={syncingUI ? "animate-spin" : ""}
              />
            </button>

            <div className="w-9 h-0.5 rounded-full bg-white/15 overflow-hidden relative">
              {syncingUI && (
                <div className="absolute inset-y-0 w-[60%] rounded-full bg-white/70 animate-progress-indeterminate" />
              )}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="pb-2 flex flex-col gap-3">
          <WeatherPanel onOpenRadar={onOpenRadar} />
          {photos.length > 1 && (
            <PhotoProgressBar currentIndex={currentIndex} paused={loading} />
          )}
          <PhotoStrip
            photos={photos}
            currentIndex={currentIndex}
            history={history}
            upcomingIndex={upcomingIndex}
            onSelect={setCurrentIndex}
          />
          <p className="text-white/30 text-xs text-center tracking-wide select-none">
            {`Created by Mathias Denise ${new Date(Date.now()).getFullYear()}`}
          </p>
        </div>
      </div>
    </div>
  );
}
