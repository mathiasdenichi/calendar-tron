import { useEffect, useRef, useState } from "react";
import { Menu, Palette, RefreshCw } from "lucide-react";

interface HamburgerMenuProps {
  syncing: boolean;
  /** Photo sync only exists on the kiosk, so the item is hidden elsewhere. */
  canRefreshPhotos: boolean;
  onRefreshPhotos: () => void;
  onOpenTheme: () => void;
}

export function HamburgerMenu({ syncing, canRefreshPhotos, onRefreshPhotos, onOpenTheme }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    // Capture phase so a tap anywhere closes the menu before that tap is
    // interpreted by the calendar underneath.
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex flex-col items-end gap-1.5 mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className={`w-9 h-9 rounded-full flex items-center justify-center
          border backdrop-blur-sm transition-all duration-200
          ${open
            ? "bg-white/25 border-white/40 text-white"
            : "bg-white/10 border-white/20 text-white/80 hover:text-white hover:bg-white/20"
          }
        `}
      >
        <Menu size={16} />
      </button>

      <div className="w-9 h-0.5 rounded-full bg-white/15 overflow-hidden relative">
        {syncing && (
          <div className="absolute inset-y-0 w-[60%] rounded-full bg-white/70 animate-progress-indeterminate" />
        )}
      </div>

      {open && (
        <div
          className="absolute top-11 right-0 z-30 w-52 rounded-2xl overflow-hidden
            bg-gray-900/95 backdrop-blur-xl border border-white/15 shadow-2xl"
        >
          <MenuItem
            icon={<Palette size={16} />}
            label="Theme"
            onClick={() => {
              setOpen(false);
              onOpenTheme();
            }}
          />
          {canRefreshPhotos && (
            <>
              <div className="h-px bg-white/10" />
              <MenuItem
                icon={<RefreshCw size={16} className={syncing ? "animate-spin" : ""} />}
                label={syncing ? "Refreshing…" : "Refresh photos"}
                disabled={syncing}
                onClick={() => {
                  setOpen(false);
                  onRefreshPhotos();
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

function MenuItem({ icon, label, disabled, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left
        text-white/85 text-sm font-medium
        hover:bg-white/10 active:bg-white/15
        disabled:opacity-45 disabled:hover:bg-transparent disabled:cursor-not-allowed
        transition-colors"
    >
      <span className="text-white/60">{icon}</span>
      {label}
    </button>
  );
}
