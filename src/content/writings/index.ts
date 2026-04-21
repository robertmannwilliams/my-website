import { openingTheArchive } from "./entries/opening-the-archive";
import type { WritingEntry, WritingTrack } from "./types";

const writingEntries: WritingEntry[] = [openingTheArchive];

export const writingTracks: WritingTrack[] = [
  {
    label: "Essays",
    cadence: "Longform",
    description:
      "Thesis-led pieces with a slower pace and enough room to build an argument.",
  },
  {
    label: "Dispatches",
    cadence: "Dated notes",
    description:
      "Shorter observations tied to a moment, a market window, or a live event.",
  },
  {
    label: "Notebooks",
    cadence: "Working lines",
    description:
      "Fragments, rough charts, and thoughts that stay close to the process.",
  },
];

export function getPublishedWritings(): WritingEntry[] {
  return [...writingEntries].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getWritingBySlug(slug: string): WritingEntry | undefined {
  return writingEntries.find((entry) => entry.slug === slug);
}

export function groupWritingsByYear(
  entries: WritingEntry[] = getPublishedWritings()
) {
  const years = new Map<string, WritingEntry[]>();

  for (const entry of entries) {
    const year = new Date(entry.publishedAt).getFullYear().toString();
    const existing = years.get(year);

    if (existing) {
      existing.push(entry);
    } else {
      years.set(year, [entry]);
    }
  }

  return Array.from(years.entries()).map(([year, groupedEntries]) => ({
    year,
    entries: groupedEntries,
  }));
}

export function formatWritingDate(
  value: string,
  variant: "short" | "long" = "short"
) {
  return new Intl.DateTimeFormat("en-US", {
    month: variant === "short" ? "short" : "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
