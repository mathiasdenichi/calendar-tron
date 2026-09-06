import { useEffect, useRef, useState } from "react";
import { Check, Copy, Menu, Palette, RefreshCw } from "lucide-react";
import { KioskInfo, fetchKioskInfo } from "../../lib/runtime";

interface HamburgerMenuProps {
  syncing: boolean;
  /** Photo sync only exists on the kiosk, so the item is hidden elsewhere. */
  canRefreshPhotos: boolean;
  onRefreshPhotos: () => void;
  onOpenTheme: () => void;
}

export function HamburgerMenu({ syncing, canRefreshPhotos, onRefreshPhotos, onOpenTheme }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<KioskInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  // Resolved lazily, and re-checked each time the menu opens so a newly
  // configured `tailscale serve` shows up without restarting the kiosk.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchKioskInfo().then((next) => {
      if (!cancelled) setInfo(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleCopy() {
    if (!info?.url) return;

    const confirm = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    };

    // The async clipboard API needs a secure context and a focused document,
    // so it fails on a plain-http LAN origin. execCommand still works off a
    // selection, and selecting the text is a usable last resort either way.
    try {
      await navigator.clipboard.writeText(info.url);
      confirm();
      return;
    } catch {
      // fall through
    }

    urlRef.current?.select();
    try {
      if (document.execCommand("copy")) confirm();
    } catch {
      // leave it selected for a manual copy
    }
  }

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
          className="absolute top-11 right-0 z-30 w-72 rounded-2xl overflow-hidden
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

          <div className="h-px bg-white/10" />
          <div className="px-4 py-3 flex flex-col gap-2">
            <span className="text-white/45 text-[10px] uppercase tracking-wider">
              Open on your phone
            </span>

            {info === null ? (
              <span className="text-white/30 text-xs">Checking...</span>
            ) : info.url ? (
              <>
                <div className="flex items-center gap-1.5">
                  <input
                    ref={urlRef}
                    value={info.url}
                    readOnly
                    spellCheck={false}
                    aria-label="Kiosk address"
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-lg
                      px-2 py-1.5 text-white/85 text-[11px] font-mono
                      focus:outline-none focus:border-white/40"
                  />
                  <button
                    onClick={handleCopy}
                    aria-label="Copy address"
                    title="Copy address"
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                      bg-white/5 border border-white/15 text-white/70
                      hover:text-white hover:bg-white/15 active:scale-95 transition-all"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
                {!info.serving && (
                  <span className="text-amber-400/80 text-[10px] leading-snug">
                    tailscale serve is not proxying this port yet
                  </span>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-white/30 text-xs leading-snug">
                  Tailscale address unavailable
                </span>
                {info.detail && (
                  <span className="text-white/25 text-[10px] leading-snug break-words">
                    {info.detail}
                  </span>
                )}
              </div>
            )}
          </div>
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
