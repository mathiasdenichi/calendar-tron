import { Clock } from "./Clock";
import { WeatherPanel } from "./WeatherPanel";
import { PhotoSlideshow } from "./PhotoSlideshow";
import { PhotoStrip } from "./PhotoStrip";
import { PhotoProgressBar } from "./PhotoProgressBar";
import { HamburgerMenu } from "../menu/HamburgerMenu";
import { useICloudPhotos } from "../../hooks/useICloudPhotos";

interface LeftPanelProps {
  onOpenRadar: () => void;
  onOpenTheme: () => void;
}

export function LeftPanel({ onOpenRadar, onOpenTheme }: LeftPanelProps) {
  const { photos, currentPhoto, currentIndex, history, upcomingIndex, loading, syncing, syncNow, setCurrentIndex } =
    useICloudPhotos();

  return (
    <div className="relative w-full h-full overflow-hidden">
      <PhotoSlideshow currentPhoto={currentPhoto} loading={loading} />

      <div className="relative z-10 h-full flex flex-col p-8">
        <div className="pt-2 flex items-start justify-between">
          <Clock />
          <HamburgerMenu syncing={syncing} onRefreshPhotos={syncNow} onOpenTheme={onOpenTheme} />
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
