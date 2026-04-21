export type WritingFormat =
  | "Essay"
  | "Dispatch"
  | "Notebook"
  | "Index Note";

export interface WritingSection {
  heading: string;
  paragraphs: string[];
}

export interface WritingEntry {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  format: WritingFormat;
  readTime: string;
  series?: string;
  sections: WritingSection[];
}

export interface WritingTrack {
  label: string;
  cadence: string;
  description: string;
}
