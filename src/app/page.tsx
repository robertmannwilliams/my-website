import HomePageExperience from "@/components/home/HomePageExperience";
import { homeProjectLinks, homepageCopy } from "@/content/homepage";

export default function Page() {
  return <HomePageExperience copy={homepageCopy} projectLinks={homeProjectLinks} />;
}
