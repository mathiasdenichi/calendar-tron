import { useState } from "react";
import { LeftPanel } from "./components/left/LeftPanel";
import { RightPanel } from "./components/right/RightPanel";
import { RadarFullScreen } from "./components/left/RadarFullScreen";
import { ThemeDrawer } from "./components/theme/ThemeDrawer";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const [radarOpen, setRadarOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme, swatches, setColor, resetColor, saveSwatch, removeSwatch } = useTheme();

  return (
    <div className="flex flex-col portrait:flex-col landscape:flex-row w-full h-full overflow-hidden bg-[var(--cal-bg)]">
      <div className="portrait:h-1/3 portrait:w-full landscape:w-1/3 landscape:h-full flex-shrink-0">
        <LeftPanel onOpenRadar={() => setRadarOpen(true)} onOpenTheme={() => setThemeOpen(true)} />
      </div>
      <div className="portrait:h-2/3 portrait:w-full landscape:w-2/3 landscape:h-full">
        <RightPanel />
      </div>

      <ThemeDrawer
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        theme={theme}
        swatches={swatches}
        onChange={setColor}
        onReset={resetColor}
        onSaveSwatch={saveSwatch}
        onRemoveSwatch={removeSwatch}
      />

      {radarOpen && <RadarFullScreen onClose={() => setRadarOpen(false)} />}
    </div>
  );
}
