import { useState } from "react";
import { Check, Plus, RotateCcw, X } from "lucide-react";
import { PRESETS, Preset, THEME_TABS, Theme, ThemeColorKey, presetById } from "../../lib/theme";
import { isValidHex, normalizeHex } from "../../lib/color";
import { useClock } from "../../hooks/useClock";
import { ColorWheel } from "./ColorWheel";

/** Scaled-down mirror of the real Clock, including its alpha tiers. */
function ClockPreview() {
  const { formatted, dateLine, tzName } = useClock();
  const [time, period] = formatted.split(" ");

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Live preview</p>
      <div className="flex items-end gap-2">
        <span
          className="font-thin tracking-tighter text-4xl leading-none"
          style={{ color: "var(--cal-time)" }}
        >
          {time}
        </span>
        <span
          className="font-light text-base"
          style={{ color: "color-mix(in srgb, var(--cal-time) 80%, transparent)" }}
        >
          {period}
        </span>
        <span
          className="font-light text-sm"
          style={{ color: "color-mix(in srgb, var(--cal-time) 60%, transparent)" }}
        >
          {tzName}
        </span>
      </div>
      <div className="text-white/70 font-light text-[11px] tracking-wide mt-1">{dateLine}</div>
    </div>
  );
}

interface ThemeDrawerProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  swatches: string[];
  onChange: (key: ThemeColorKey, hex: string) => void;
  onReset: (key: ThemeColorKey) => void;
  onApplyPreset: (preset: Preset) => void;
  onSaveSwatch: (hex: string) => void;
  onRemoveSwatch: (hex: string) => void;
}

export function ThemeDrawer({
  open,
  onClose,
  theme,
  swatches,
  onChange,
  onReset,
  onApplyPreset,
  onSaveSwatch,
  onRemoveSwatch,
}: ThemeDrawerProps) {
  const [activeTab, setActiveTab] = useState<ThemeColorKey>("background");
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  const active = THEME_TABS.find((t) => t.key === activeTab) ?? THEME_TABS[0];
  const current = theme.colors[activeTab];
  const presetValue = presetById(theme.presetId).colors[activeTab];
  const isDefault = current === presetValue;
  const alreadySaved = swatches.includes(current);

  function handleHexInput(raw: string) {
    setHexDraft(raw);
    if (isValidHex(raw)) {
      const valid = normalizeHex(raw);
      if (valid) onChange(activeTab, valid);
    }
  }

  return (
    <div
      // Occupies exactly the left panel's width so the calendar stays visible
      // and repaints live as colors change.
      className={`fixed inset-y-0 left-0 z-40 w-1/3 bg-gray-950/95 backdrop-blur-xl
        border-r border-white/10 shadow-2xl flex flex-col
        transition-transform duration-300 ease-out
        ${open ? "translate-x-0" : "-translate-x-full pointer-events-none"}
      `}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h2 className="text-white font-semibold text-lg">Theme</h2>
          <p className="text-white/40 text-xs">Changes preview live on the calendar</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close theme editor"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl
            text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-6 py-4 border-b border-white/10 flex flex-col gap-2">
        <span className="text-white/50 text-[11px] uppercase tracking-wider">Presets</span>
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain touch-pan-x pb-1">
          {PRESETS.map((preset) => {
            const isActive = preset.id === theme.presetId;
            return (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                title={preset.provisional ? `${preset.label} — placeholder palette` : preset.label}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium
                  transition-all active:scale-95
                  ${isActive
                    ? "border-white/70 bg-white/15 text-white"
                    : "border-white/15 bg-white/5 text-white/65 hover:text-white hover:border-white/35"
                  }
                `}
              >
                <span aria-hidden="true">{preset.emoji}</span>
                <span className="whitespace-nowrap">{preset.label}</span>
                {preset.provisional && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70" title="Placeholder palette" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex border-b border-white/10 overflow-x-auto overscroll-x-contain touch-pan-x">
        {THEME_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setHexDraft(null);
            }}
            className={`flex-shrink-0 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2
              ${activeTab === tab.key
                ? "text-white border-white"
                : "text-white/45 border-transparent hover:text-white/80"
              }
            `}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/30"
                style={{ backgroundColor: theme.colors[tab.key] }}
              />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-5">
        <p className="text-white/40 text-xs leading-relaxed">{active.hint}</p>

        {/* The other three tabs preview live on the calendar, but this drawer
            sits on top of the clock — so mirror it here instead. */}
        {open && activeTab === "timeColor" && <ClockPreview />}

        <ColorWheel value={current} onChange={(hex) => onChange(activeTab, hex)} />

        <div className="flex items-center gap-2">
          <span
            className="w-10 h-10 rounded-xl border border-white/20 flex-shrink-0"
            style={{ backgroundColor: current }}
          />
          <input
            value={hexDraft ?? current}
            onChange={(e) => handleHexInput(e.target.value)}
            onBlur={() => setHexDraft(null)}
            spellCheck={false}
            aria-label="Hex color"
            className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-xl px-3 py-2.5
              text-white text-sm font-mono tracking-wide uppercase
              focus:outline-none focus:border-white/40"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-[11px] uppercase tracking-wider">Saved colors</span>
            <button
              onClick={() => onSaveSwatch(current)}
              disabled={alreadySaved}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg
                text-white/70 hover:text-white hover:bg-white/10
                disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed
                transition-colors"
            >
              {alreadySaved ? <Check size={12} /> : <Plus size={12} />}
              {alreadySaved ? "Saved" : "Save"}
            </button>
          </div>

          {swatches.length === 0 ? (
            <p className="text-white/25 text-xs py-2">
              No saved colors yet. Save one to reuse it on any tab.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {swatches.map((hex) => (
                <div key={hex} className="relative group">
                  <button
                    onClick={() => onChange(activeTab, hex)}
                    title={hex}
                    aria-label={`Apply ${hex}`}
                    className={`w-11 h-11 rounded-xl border-2 transition-all active:scale-95
                      ${hex === current ? "border-white" : "border-white/20 hover:border-white/50"}
                    `}
                    style={{ backgroundColor: hex }}
                  />
                  <button
                    onClick={() => onRemoveSwatch(hex)}
                    aria-label={`Remove ${hex}`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full
                      bg-gray-900 border border-white/25 text-white/60
                      flex items-center justify-center
                      hover:bg-red-600/80 hover:text-white transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-white/10">
        <button
          onClick={() => {
            onReset(activeTab);
            setHexDraft(null);
          }}
          disabled={isDefault}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            border border-white/15 text-white/70 text-sm font-medium
            hover:bg-white/10 hover:text-white active:scale-[0.98]
            disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed
            transition-all"
        >
          <RotateCcw size={15} />
          {isDefault
            ? `${active.label} matches ${presetById(theme.presetId).label}`
            : `Reset ${active.label} to ${presetById(theme.presetId).label}`}
        </button>
      </div>
    </div>
  );
}
