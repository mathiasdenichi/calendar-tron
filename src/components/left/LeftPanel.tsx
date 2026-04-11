import { Clock } from "./Clock";
import { WeatherPanel } from "./WeatherPanel";
import { PhotoSlideshow } from "./PhotoSlideshow";

export function LeftPanel() {
  return (
    <div className="relative w-1/2 h-full overflow-hidden">
      <PhotoSlideshow />

      <div className="relative z-10 h-full flex flex-col justify-between p-8">
        <div className="pt-2">
          <Clock />
        </div>

        <div className="pb-2">
          <WeatherPanel />
        </div>
      </div>
    </div>
  );
}
