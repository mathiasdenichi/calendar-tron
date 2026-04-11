import { SlideshowPhoto } from "../../hooks/useICloudPhotos";

interface PhotoStripProps {
  photos: SlideshowPhoto[];
  currentIndex: number;
  history: number[];
  upcomingIndex: number | null;
  onSelect: (index: number) => void;
}

export function PhotoStrip({ photos, currentIndex, history, upcomingIndex, onSelect }: PhotoStripProps) {
  if (photos.length === 0) return null;

  const historyIndices = history.slice(-7);

  const thumbnails: Array<{ index: number; label: "history" | "current" | "upcoming" }> = [
    ...historyIndices.map((i) => ({ index: i, label: "history" as const })),
    ...(upcomingIndex !== null && upcomingIndex !== currentIndex
      ? [{ index: upcomingIndex, label: "upcoming" as const }]
      : []),
  ];

  if (thumbnails.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex gap-1.5 overflow-hidden">
        {thumbnails.map(({ index, label }) => {
          const photo = photos[index];
          if (!photo) return null;
          const isUpcoming = label === "upcoming";
          const isActive = index === currentIndex;

          return (
            <button
              key={`${label}-${index}`}
              onClick={() => onSelect(index)}
              className={`
                flex-shrink-0 rounded-lg overflow-hidden border shadow-lg
                transition-all duration-200 focus:outline-none
                hover:scale-105 hover:border-white/40 active:scale-95
                ${isActive
                  ? "border-white/70 ring-1 ring-white/50"
                  : isUpcoming
                    ? "border-sky-400/60 ring-1 ring-sky-400/30"
                    : "border-white/15"
                }
              `}
              style={{ width: "calc((100% - 7 * 6px) / 8)", aspectRatio: "1 / 1" }}
              title={isUpcoming ? "Up next" : "Show this photo"}
            >
              <div className="relative w-full h-full">
                <img
                  src={photo.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isUpcoming && (
                  <div className="absolute inset-0 bg-sky-400/20 flex items-end justify-center pb-0.5">
                    <span className="text-white/90 text-[8px] font-semibold tracking-wider uppercase leading-none">
                      Next
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
