import HomePageExperience from "@/components/home/HomePageExperience";
import {
  homepageCopy,
  primaryHomeLinks,
  secondaryHomeLinks,
} from "@/content/homepage";
import { formatWritingDate, getPublishedWritings } from "@/content/writings";

export default function Page() {
  const latestEntry = getPublishedWritings()[0];
  const latestWriting = latestEntry
    ? {
        href: `/writings/${latestEntry.slug}`,
        title: latestEntry.title,
        summary: latestEntry.summary,
        meta: `${formatWritingDate(latestEntry.publishedAt)} / ${latestEntry.format} / ${latestEntry.readTime}`,
      }
    : null;

  return (
    <HomePageExperience
      copy={homepageCopy}
      primaryLinks={primaryHomeLinks}
      secondaryLinks={secondaryHomeLinks}
      latestWriting={latestWriting}
    />
  );
}
