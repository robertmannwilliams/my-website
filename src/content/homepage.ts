export interface HomeLink {
  href: string;
  label: string;
  status: string;
}

export const homepageCopy = {
  entryCue: "Enter",
  intro:
    "Hi, I'm Robert. This website is under construction. On the right are some work-in-progress projects I am using to help myself learn how to use AI coding tools.",
} as const;

export const homeProjectLinks: HomeLink[] = [
  {
    href: "/aistack",
    label: "Data Center Thing",
    status: "Work in progress",
  },
  {
    href: "/monitor",
    label: "Global Monitor",
    status: "Work in progress",
  },
];
