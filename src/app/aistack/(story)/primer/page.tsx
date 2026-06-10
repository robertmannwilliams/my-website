import type { Metadata } from "next";
import Link from "next/link";
import { TitleBlock } from "@/features/atlas/components/TitleBlock";
import { renderPrimer } from "@/features/atlas/lib/primer";

export const metadata: Metadata = {
  title: "Deep Dive — The Physical AI Stack",
  description:
    "The full technical primer behind the story: transistors, EUV, foundries, HBM, packaging, networking, datacenters, power, and the supply chain underneath.",
};

export default function PrimerPage() {
  const html = renderPrimer();
  return (
    <main className="story doc-page">
      <header className="doc-page__header">
        <TitleBlock
          fields={[
            { label: "Project", value: "The Physical AI Stack" },
            { label: "Sheet", value: "Deep Dive" },
            { label: "Form", value: "Reference" },
            { label: "Read", value: "~50 min" },
          ]}
        />
        <p className="atlas-annotation doc-page__back">
          <Link href="/aistack">← Back to the story</Link>
        </p>
      </header>
      <article
        className="prose"
        // Rendered at build time from our own content/primer.md.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
