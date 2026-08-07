import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import "@/features/atlas/styles/atlas.css";
import "@/features/grid/styles/grid.css";

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
  "How power works in North America — the largest machine ever built, " +
  "told as a story and handed over as a live atlas. Volume II of the series " +
  "that began with The Physical AI Stack. Under survey.";

export const metadata: Metadata = {
  title: "The Largest Machine",
  description: DESCRIPTION,
  // Survey stub — unindexed until launch (GRID-PLAN Phase 5 flips this).
  robots: { index: false, follow: false },
  openGraph: {
    title: "The Largest Machine",
    description: DESCRIPTION,
    type: "article",
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F4E9",
};

export default function GridLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // atlas-root supplies the Volume-I base surface (paper, grain, type);
  // grid-root scopes Volume-II additions. GRID-DESIGN.md governs.
  return (
    <div className={`atlas-root grid-root ${newsreader.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
