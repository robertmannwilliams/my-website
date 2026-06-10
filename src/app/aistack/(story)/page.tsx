import Link from "next/link";
import AtlasSection from "@/features/atlas/components/AtlasSection";
import StoryFlow from "@/features/atlas/components/story/StoryFlow";
import { TitleBlock } from "@/features/atlas/components/TitleBlock";
import { loadChapters, loadSites } from "@/features/atlas/lib/content";
import { getFlowData } from "@/features/atlas/lib/story";

export default function AIStackStoryPage() {
  const chapters = loadChapters();
  const siteCount = loadSites().length;
  const flow = getFlowData(chapters);

  return (
    <main>
      <div className="story">
        <header className="story-masthead">
          <TitleBlock
            fields={[
              { label: "Project", value: "The Physical AI Stack" },
              { label: "Sheet", value: "03 — Flow" },
              { label: "Date", value: "Jun 2026" },
              { label: "Scale", value: "1 : 40,000,000" },
            ]}
          />
          <h1 className="story-masthead__title">The Physical AI Stack</h1>
          <p className="story-masthead__dek">
            From a quartz ridge in North Carolina to the answer on your screen
            — the mines, machines, and buildings behind AI.
          </p>
          <p className="story-masthead__note atlas-annotation">
            Working draft. Plates are placeholders and figures are unverified;
            the atlas at the end is live — {siteCount} facilities, explorable.
          </p>
        </header>
      </div>

      <StoryFlow beats={flow.beats} sites={flow.sites} />

      <AtlasSection />

      <footer className="story story-colophon">
        <TitleBlock
          fields={[
            { label: "Project", value: "The Physical AI Stack" },
            { label: "Drawn by", value: "R. Williams" },
            { label: "Sites", value: String(siteCount) },
            { label: "Status", value: "In progress" },
          ]}
        />
        <p className="story-colophon__note atlas-annotation">
          Figures in this draft are unverified; a sourcing pass precedes
          launch. Corrections welcome.
        </p>
        <nav className="story-colophon__links atlas-mono" aria-label="Related pages">
          <Link href="/aistack/methodology">Methodology &amp; sources</Link>
          <Link href="/aistack/primer">Deep Dive: the full primer</Link>
        </nav>
      </footer>
    </main>
  );
}
