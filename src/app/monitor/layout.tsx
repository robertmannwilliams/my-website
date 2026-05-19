import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-monitor-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-monitor-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Global Monitor | Robert Williams",
  description:
    "Real-time global monitoring dashboard — geopolitical events, prediction markets, earthquakes, and market data.",
  openGraph: {
    title: "Global Monitor | Robert Williams",
    description: "Real-time global monitoring dashboard.",
    type: "website",
  },
};

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} ${jetBrainsMono.variable}`}>
      {children}
    </div>
  );
}
