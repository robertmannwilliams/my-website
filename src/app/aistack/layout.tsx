import type { Metadata } from "next";
import "@/features/aistack/styles.css";

const DESCRIPTION =
  "An interactive map that traces the physical supply chain of AI — from quartz sand in Spruce Pine to deployed inference in Ashburn.";

export const metadata: Metadata = {
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
  return children;
}
