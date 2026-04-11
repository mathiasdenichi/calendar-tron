import { useState } from "react";
import { LeftPanel } from "./components/left/LeftPanel";
import { RightPanel } from "./components/right/RightPanel";
import { RadarFullScreen } from "./components/left/RadarFullScreen";

export default function App() {
  const [radarOpen, setRadarOpen] = useState(false);

  return (
    <div className="flex flex-col portrait:flex-col landscape:flex-row w-full h-full overflow-hidden bg-gray-950">
      <div className="portrait:h-1/3 portrait:w-full landscape:w-1/3 landscape:h-full flex-shrink-0">
        <LeftPanel onOpenRadar={() => setRadarOpen(true)} />
      </div>
      <div className="portrait:h-2/3 portrait:w-full landscape:w-2/3 landscape:h-full">
        <RightPanel />
      </div>
      {radarOpen && <RadarFullScreen onClose={() => setRadarOpen(false)} />}
    </div>
  );
}
