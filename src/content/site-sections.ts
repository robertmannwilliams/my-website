export interface SiteSection {
  href: string;
  title: string;
  eyebrow: string;
  description: string;
  status: string;
}

export const directorySections: SiteSection[] = [
  {
    href: "/monitor",
    title: "Monitor",
    eyebrow: "Live systems",
    description:
      "A real-time map of geopolitical events, markets, disasters, and other moving signals.",
    status: "Live",
  },
  {
    href: "/writings",
    title: "Writings",
    eyebrow: "Time series",
    description:
      "Essays, dispatches, and notebooks filed chronologically so the archive reads like a sequence.",
    status: "Filed",
  },
  {
    href: "/projects",
    title: "Projects",
    eyebrow: "Build log",
    description:
      "Working systems, experiments, and structures that deserve their own room instead of a footnote.",
    status: "Growing",
  },
  {
    href: "/about",
    title: "About",
    eyebrow: "Context",
    description:
      "A short note on how the site is organized and the kind of work each section is meant to hold.",
    status: "Open",
  },
];
