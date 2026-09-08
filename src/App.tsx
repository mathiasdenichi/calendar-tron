import { useState } from "react";
import { LeftPanel } from "./components/left/LeftPanel";
import { RightPanel } from "./components/right/RightPanel";
import { RadarFullScreen } from "./components/left/RadarFullScreen";
import { ThemeDrawer } from "./components/theme/ThemeDrawer";
import { HamburgerMenu } from "./components/menu/HamburgerMenu";
import { useTheme } from "./hooks/useTheme";
import { useIsPortrait } from "./hooks/useOrientation";
import { isKiosk } from "./lib/runtime";

export default function App() {
  const [radarOpen, setRadarOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme, swatches, setColor, resetColor, applyPreset, saveSwatch, removeSwatch } = useTheme();

  const portrait = useIsPortrait();

  // The kiosk always shows both panels. A phone only earns the photo/weather
  // panel in landscape; held upright there isn't room for it and the calendar
  // is what you opened the page for.
  const showLeftPanel = isKiosk() || !portrait;

  const drawer = (
    <ThemeDrawer
      open={themeOpen}
      onClose={() => setThemeOpen(false)}
      theme={theme}
      swatches={swatches}
      onChange={setColor}
      onReset={resetColor}
      onApplyPreset={applyPreset}
      onSaveSwatch={saveSwatch}
      onRemoveSwatch={removeSwatch}
    />
  );

  if (!showLeftPanel) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-[var(--cal-bg)]">
        {/* The menu normally lives in the left panel, so it is slotted into the
            calendar header here - otherwise theme and the QR are unreachable on
            a phone, and floating it would cover the next-month chevron. */}
        <RightPanel
          headerAccessory={
            <HamburgerMenu
              syncing={false}
              canRefreshPhotos={false}
              onRefreshPhotos={() => undefined}
              onOpenTheme={() => setThemeOpen(true)}
            />
          }
        />
        {drawer}
      </div>
    );
  }

  return (
    <div className="flex flex-col portrait:flex-col landscape:flex-row w-full h-full overflow-hidden bg-[var(--cal-bg)]">
      <div className="portrait:h-1/3 portrait:w-full landscape:w-1/3 landscape:h-full flex-shrink-0">
        <LeftPanel onOpenRadar={() => setRadarOpen(true)} onOpenTheme={() => setThemeOpen(true)} />
      </div>
      <div className="portrait:h-2/3 portrait:w-full landscape:w-2/3 landscape:h-full">
        <RightPanel />
      </div>

      {drawer}

      {radarOpen && <RadarFullScreen onClose={() => setRadarOpen(false)} />}
    </div>
  );
}
