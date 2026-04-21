import type { WritingEntry } from "../types";

export const openingTheArchive: WritingEntry = {
  slug: "opening-the-archive",
  title: "Opening the archive",
  summary:
    "A short note on how writings on this site are filed and why chronology is the backbone.",
  publishedAt: "2026-04-20",
  format: "Index Note",
  readTime: "2 min",
  series: "Housekeeping",
  sections: [
    {
      heading: "Why file by time",
      paragraphs: [
        "The writings section is meant to work like a running sequence rather than a stack of disconnected pages. Dates stay visible so each note can be read in relation to the one before it.",
        "That makes short observations, longer essays, and unfinished notebooks feel like parts of the same system instead of separate content types competing for attention.",
      ],
    },
    {
      heading: "What lives here",
      paragraphs: [
        "Essays are for slower arguments. Dispatches are for sharper dated observations. Notebooks hold fragments, charts, and lines that may later become something larger.",
        "Everything still lands in one archive, so the reader can move through it as a time series and not lose the thread.",
      ],
    },
    {
      heading: "What comes next",
      paragraphs: [
        "The home page now acts like a directory of rooms. Monitor is for live systems. Writings is for the archive. Additional sections can be added to the same directory pattern as the site grows.",
      ],
    },
  ],
};
