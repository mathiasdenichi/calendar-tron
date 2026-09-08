import { useEffect, useRef } from "react";
import { SlideshowPhoto } from "../../hooks/useICloudPhotos";
import { buildStripItems } from "../../lib/photoStrip";

interface PhotoStripProps {
  photos: SlideshowPhoto[];
  currentIndex: number;
  history: number[];
  upcomingIndex: number | null;
  onSelect: (index: number) => void;
}

const THUMB_PX = 76;

export function PhotoStrip({ photos, currentIndex, history, upcomingIndex, onSelect }: PhotoStripProps) {
  const currentRef = useRef<HTMLButtonElement>(null);

  // If the strip has to scroll (a narrow panel), keep the highlighted thumb
  // visible rather than letting it drift off the edge.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [currentIndex]);

  if (photos.length === 0) return null;

  const items = buildStripItems(currentIndex, history, upcomingIndex);

  return (
    <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x">
      <div className="flex gap-1.5 w-max">
        {items.map((item, position) => {
          const photo = photos[item.index];
          if (!photo) return null;

          const isCurrent = item.kind === "current";
          const isNext = item.kind === "next";

          return (
            <button
              key={`${item.kind}-${item.index}-${position}`}
              ref={isCurrent ? currentRef : undefined}
              onClick={() => onSelect(item.index)}
              className={`
                flex-shrink-0 rounded-lg overflow-hidden border shadow-lg
                transition-all duration-200 focus:outline-none
                hover:scale-105 active:scale-95
                ${isCurrent
                  ? "border-white/90 ring-2 ring-white/60"
                  : isNext
                    ? "border-sky-400/60 ring-1 ring-sky-400/30 hover:border-sky-400/80"
                    : "border-white/15 hover:border-white/40"
                }
              `}
              style={{ width: THUMB_PX, aspectRatio: "1 / 1" }}
              title={isCurrent ? "Currently showing" : isNext ? "Up next" : "Show this photo"}
            >
              <div className="relative w-full h-full">
                <img
                  src={photo.thumbUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isNext && (
                  <div className="absolute inset-0 bg-sky-400/20 flex items-end justify-center pb-0.5">
                    <span className="text-white/90 text-[8px] font-semibold tracking-wider uppercase leading-none">
                      Next
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute inset-0 bg-white/10 flex items-end justify-center pb-0.5">
                    <span className="text-white text-[8px] font-semibold tracking-wider uppercase leading-none drop-shadow">
                      Now
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
