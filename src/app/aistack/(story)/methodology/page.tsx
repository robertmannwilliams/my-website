import type { Metadata } from "next";
import Link from "next/link";
import { TitleBlock } from "@/features/atlas/components/TitleBlock";
import { loadSites } from "@/features/atlas/lib/content";

export const metadata: Metadata = {
  title: "Methodology — The Physical AI Stack",
  description:
    "Where the atlas data comes from, what the confidence flags mean, and how to send corrections.",
};

export default function MethodologyPage() {
  const sites = loadSites();
  const high = sites.filter((s) => s.confidence === "high").length;
  const medium = sites.length - high;
  const sourceCount = sites.reduce((n, s) => n + (s.sources?.length ?? 0), 0);
  const monopolies = sites.filter(
    (s) => s.chokepoint_severity === "monopoly",
  ).length;

  return (
    <main className="story doc-page">
      <header className="doc-page__header">
        <TitleBlock
          fields={[
            { label: "Project", value: "The Physical AI Stack" },
            { label: "Sheet", value: "Methodology" },
            { label: "Sites", value: String(sites.length) },
            { label: "Snapshot", value: "Jun 2026" },
          ]}
        />
        <p className="atlas-annotation doc-page__back">
          <Link href="/aistack">← Back to the story</Link>
        </p>
      </header>

      <article className="prose">
        <h2>What this is</h2>
        <p>
          The atlas maps {sites.length} facilities in the physical supply chain
          of AI — mines, refineries, wafer plants, toolmakers, fabs, packaging
          and assembly lines, datacenters, exchanges, and power stations. Each
          site carries what it does, who operates it, why it matters, its
          status, and source links.
        </p>

        <h2>Where the data comes from</h2>
        <p>
          The dataset was assembled with AI assistance from public reporting,
          company disclosures, and trade press, then run through automated
          checks (no missing coordinates, no out-of-country coordinates). It is
          honest work, but it is not a census: capacities and dollar figures
          are best public estimates, coordinates are city-level rather than
          parcel-level, and the industry moves fast enough that some statuses
          will drift between snapshots.
        </p>
        <p>
          Hero claims in the story — the numbers attached to named sites — get
          a hand-verification pass against their listed sources before this
          piece is declared finished. Until then, treat figures as drafts with
          sources attached.
        </p>

        <h2>Confidence flags</h2>
        <p>
          Every site carries a confidence flag. <strong>High</strong> ({high}{" "}
          sites) means multiple independent sources agree on the facility&apos;s
          existence, operator, and role. <strong>Medium</strong> ({medium}{" "}
          sites) means the site is well-attested but some details — capacity,
          timing, exact role — rest on fewer or softer sources. The atlas
          carries {sourceCount.toLocaleString()} source links in total, one to
          three per site.
        </p>

        <h2>Chokepoint severity</h2>
        <p>
          Sites are tagged by how concentrated their step of the chain is:{" "}
          <strong>monopoly</strong> ({monopolies} sites — one indispensable
          supplier), <strong>duopoly</strong>, <strong>diversified</strong>, or
          not applicable. The tags drive the atlas filter and the red ticks on
          pins. They are judgments about the leading edge — many steps have
          trailing-edge alternatives that don&apos;t change the strategic picture.
        </p>

        <h2>Corrections</h2>
        <p>
          If you operate one of these facilities, or simply know better, I
          want the correction. Open an issue on{" "}
          <a
            href="https://github.com/robertmannwilliams/my-website/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{" "}
          or reach me through the site. Corrections ship in the next data
          snapshot with credit if you want it.
        </p>

        <p className="atlas-annotation">
          See also: <Link href="/aistack/primer">the Deep Dive primer</Link> —
          the full technical reference behind the story.
        </p>
      </article>
    </main>
  );
}
