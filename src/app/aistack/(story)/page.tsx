import { ChapterSection } from "@/features/atlas/components/ChapterSection";
import { TitleBlock } from "@/features/atlas/components/TitleBlock";
import { loadChapters, loadSites } from "@/features/atlas/lib/content";

export default function AIStackStoryPage() {
  const chapters = loadChapters();
  const siteCount = loadSites().length;

  return (
    <main className="story">
      <header className="story-masthead">
        <TitleBlock
          fields={[
            { label: "Project", value: "The Physical AI Stack" },
            { label: "Sheet", value: "00 — Scaffold" },
            { label: "Date", value: "Jun 2026" },
            { label: "Scale", value: "1 : 40,000,000" },
          ]}
        />
        <h1 className="story-masthead__title">The Physical AI Stack</h1>
        <p className="story-masthead__dek">
          From a quartz ridge in North Carolina to the answer on your screen —
          the mines, machines, and buildings behind AI.
        </p>
        <p className="story-masthead__note atlas-annotation">
          Working draft. The copy below is the full story; the maps, plates,
          and motion are drawn in on later sheets. {siteCount} facilities wait
          in the atlas.
        </p>
      </header>

      {chapters.map((chapter) => (
        <ChapterSection chapter={chapter} key={chapter.id} />
      ))}

      <footer className="story-colophon">
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
      </footer>
    </main>
  );
}
