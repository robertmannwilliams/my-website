export interface HomeLink {
  href: string;
  label: string;
  eyebrow: string;
  description: string;
}

export const homepageCopy = {
  entryCue: "Enter",
  note:
    "This site collects writing and working notes on systems, capital, technology, and national growth, alongside the maps and projects that help me think in public.",
  latestLabel: "Latest writing",
  secondaryLabel: "Systems and experiments",
} as const;

export const primaryHomeLinks: HomeLink[] = [
  {
    href: "/writings",
    label: "Writings",
    eyebrow: "Archive",
    description:
      "Essays, dispatches, and notebooks filed as a chronological record of ideas in motion.",
  },
  {
    href: "/about",
    label: "About",
    eyebrow: "Context",
    description:
      "A short note on the site, the work, and the questions holding the rooms together.",
  },
  {
    href: "/projects",
    label: "Work",
    eyebrow: "Build log",
    description:
      "Projects, systems, and experiments that deserve more structure than a passing note.",
  },
];

export const secondaryHomeLinks: HomeLink[] = [
  {
    href: "/monitor",
    label: "Monitor",
    eyebrow: "Live system",
    description:
      "A map-first room for geopolitical events, markets, disasters, and moving signals.",
  },
  {
    href: "/aistack",
    label: "AI Stack",
    eyebrow: "Atlas",
    description:
      "A physical map of the AI supply chain from raw materials to deployed inference.",
  },
];
