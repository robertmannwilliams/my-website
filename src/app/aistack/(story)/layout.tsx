import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import "@/features/atlas/styles/atlas.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const DESCRIPTION =
  "From a quartz ridge in North Carolina to the answer on your screen — " +
  "the mines, machines, fabs, and buildings behind AI, told as a story and " +
  "handed over as an atlas of 341 facilities.";

export const metadata: Metadata = {
  title: "The Physical AI Stack",
  description: DESCRIPTION,
  openGraph: {
    title: "The Physical AI Stack",
    description: DESCRIPTION,
    type: "article",
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F4E9",
};

export default function AtlasStoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`atlas-root ${newsreader.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
