import type { Metadata } from "next";
import HomePageExperience from "@/components/home/HomePageExperience";
import { homeProjectLinks, homepageCopy } from "@/content/homepage";

export const metadata: Metadata = {
  openGraph: {
    images: [{ url: "/hero/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/hero/og.jpg"],
  },
};

export default function Page() {
  return <HomePageExperience copy={homepageCopy} projectLinks={homeProjectLinks} />;
}
