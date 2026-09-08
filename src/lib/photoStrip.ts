export type StripItemKind = "previous" | "current" | "next";

export interface StripItem {
  index: number;
  kind: StripItemKind;
}

/** Five previous + the current one + the next: seven across the panel. */
export const PREVIOUS_COUNT = 5;
export const MAX_STRIP_ITEMS = PREVIOUS_COUNT + 2;

/**
 * Builds the thumbnail row: up to five previously shown photos, the current one,
 * then whatever the timer will advance to.
 *
 * Every index appears at most once. Two things make that non-trivial: tapping a
 * thumbnail moves the display without advancing the timer's cursor (so "next"
 * can collide with history), and history itself repeats whenever the album is
 * smaller than the window or the user taps back and forth - cycling three photos
 * gives a history of [0,1,2,0,1,2,0].
 *
 * "Previous" therefore means the five most recently seen DISTINCT photos, in the
 * order they were seen.
 */
export function buildStripItems(
  currentIndex: number,
  history: number[],
  upcomingIndex: number | null
): StripItem[] {
  const excluded = new Set<number>([currentIndex]);
  if (upcomingIndex !== null) excluded.add(upcomingIndex);

  // Walk back from the most recent, skipping repeats, then restore chronological
  // order so the row still reads oldest -> newest, left -> right.
  const seen = new Set<number>();
  const previous: number[] = [];
  for (let i = history.length - 1; i >= 0 && previous.length < PREVIOUS_COUNT; i--) {
    const index = history[i];
    if (excluded.has(index) || seen.has(index)) continue;
    seen.add(index);
    previous.unshift(index);
  }

  return [
    ...previous.map((index) => ({ index, kind: "previous" as const })),
    { index: currentIndex, kind: "current" as const },
    ...(upcomingIndex !== null && upcomingIndex !== currentIndex
      ? [{ index: upcomingIndex, kind: "next" as const }]
      : []),
  ];
}
