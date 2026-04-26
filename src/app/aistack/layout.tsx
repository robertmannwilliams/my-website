import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Fraunces, Inter, Source_Serif_4 } from "next/font/google";
import "@/features/aistack/styles.css";
import { atlasStageCssVars } from "@/features/aistack/content/stages";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-body",
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const DESCRIPTION =
  "An interactive map that traces the physical supply chain of AI — from quartz sand in Spruce Pine to deployed inference in Ashburn.";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://my-website-robertmannwilliams.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Physical AI Stack Atlas",
    template: "%s · Physical AI Stack Atlas",
  },
  description: DESCRIPTION,
  applicationName: "Physical AI Stack Atlas",
  openGraph: {
    title: "Physical AI Stack Atlas",
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Physical AI Stack Atlas",
    description: DESCRIPTION,
  },
};

export default function AIStackLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`aistack-theme ${fraunces.variable} ${sourceSerif.variable} ${inter.variable} antialiased`}
      style={atlasStageCssVars as CSSProperties}
    >
      {children}
    </div>
  );
}
