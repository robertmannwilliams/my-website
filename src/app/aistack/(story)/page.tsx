import AtlasSection from "@/features/atlas/components/AtlasSection";
import { ChapterSection } from "@/features/atlas/components/ChapterSection";
import ChapterStory from "@/features/atlas/components/story/ChapterStory";
import { TitleBlock } from "@/features/atlas/components/TitleBlock";
import { loadChapters, loadSites } from "@/features/atlas/lib/content";
import { getStorySites } from "@/features/atlas/lib/story";
import type { Chapter } from "@/features/atlas/types";

// Chapters wired through the scroll engine; the rest render as the Phase 0
// text scaffold until the Chapter 4 design proof is signed off (PLAN Phase 2).
const STORY_CHAPTERS = new Set([4]);

type Segment =
  | { kind: "scaffold"; chapters: Chapter[] }
  | { kind: "story"; chapter: Chapter };

export default function AIStackStoryPage() {
  const chapters = loadChapters();
  const siteCount = loadSites().length;

  // Story chapters render full-width (sticky figure); runs of scaffold
  // chapters share centered .story columns between them.
  const segments: Segment[] = [];
  for (const chapter of chapters) {
    if (STORY_CHAPTERS.has(chapter.id)) {
      segments.push({ kind: "story", chapter });
    } else {
      const last = segments[segments.length - 1];
      if (last?.kind === "scaffold") last.chapters.push(chapter);
      else segments.push({ kind: "scaffold", chapters: [chapter] });
    }
  }

  return (
    <main>
      <div className="story">
        <header className="story-masthead">
          <TitleBlock
            fields={[
              { label: "Project", value: "The Physical AI Stack" },
              { label: "Sheet", value: "01 — Atlas" },
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
            Working draft. The copy below is the full story; plates and motion
            are drawn in on later sheets. The atlas at the end is live —
            {" "}{siteCount} facilities, explorable.
          </p>
        </header>

      </div>

      {segments.map((segment) =>
        segment.kind === "story" ? (
          <ChapterStory
            chapter={segment.chapter}
            sites={getStorySites(segment.chapter)}
            key={segment.chapter.id}
          />
        ) : (
          <div className="story" key={`scaffold-${segment.chapters[0].id}`}>
            {segment.chapters.map((chapter) => (
              <ChapterSection chapter={chapter} key={chapter.id} />
            ))}
          </div>
        ),
      )}

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
      </footer>
    </main>
  );
}
