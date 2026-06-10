export interface HomeLink {
  href: string;
  label: string;
  status: string;
}

export const homepageCopy = {
  entryCue: "Enter",
  intro:
    "Hi, I'm Robert. This website is under construction. Below are some work-in-progress projects I am using to help myself learn how to use AI coding tools.",
  introImage: {
    src: "/hassam-flags.png",
    alt: "Impressionist painting of American flags flying over a crowded city street, in the style of Childe Hassam.",
    width: 1024,
    height: 1536,
  },
} as const;

export const homeProjectLinks: HomeLink[] = [
  {
    href: "/aistack",
    label: "The Physical AI Stack",
    status: "An illustrated atlas of the mines, machines, and buildings behind AI",
  },
  {
    href: "/monitor",
    label: "Global Monitor",
    status: "Work in progress",
  },
];
