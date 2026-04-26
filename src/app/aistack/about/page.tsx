import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Methodology, chokepoint scoring, and credits for the Physical AI Stack Atlas.",
};

export default function AboutPage() {
  return (
    <main className="h-screen overflow-y-auto bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link
          href="/aistack"
          className="font-ui inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to the map
        </Link>

        <article className="font-body prose prose-stone mt-8 max-w-none prose-headings:font-display prose-headings:text-foreground prose-a:text-foreground prose-li:text-foreground/82 prose-p:text-foreground/80">
          <h1 className="font-display mb-2 text-4xl leading-tight">
            About the atlas
          </h1>
          <p className="font-body !mt-2 text-foreground/62">
            An editorial map of the physical supply chain behind AI.
          </p>

          <h2>What you&rsquo;re looking at</h2>
          <p>
            Dataset v1 maps 341 sites and 2,279 supply relationships compiled
            from public filings, news reports, company disclosures, and
            industry databases. Confidence scores are intentionally visible:
            this atlas is as interested in what we do not know as what we do.
          </p>
          <p>
            Each pin is a real facility, tagged to one stage of the stack
            (raw materials, chemicals, wafers, equipment, EDA &amp; IP,
            design, fabrication, memory, packaging, networking, assembly,
            datacenter, power, connectivity). Arcs are approximate material
            or IP flows between those facilities — simplified for legibility
            and not an exhaustive bill of materials.
          </p>

          <h2>What the chokepoint score means</h2>
          <p>
            Each site carries a chokepoint severity based on substitutability,
            supplier concentration, and how quickly the rest of the stack could
            route around a disruption:
          </p>
          <ul>
            <li>
              <strong>Monopoly</strong> — effectively one producer or site class
              controls a critical capability.
            </li>
            <li>
              <strong>Duopoly</strong> — two credible producers or regions
              dominate the capability, with limited fast substitutes.
            </li>
            <li>
              <strong>Diversified</strong> — three or more credible sources
              exist, though capacity may still be tight.
            </li>
            <li>
              <strong>N/A</strong> — the site matters, but the monopoly/duopoly
              framing is not the right lens.
            </li>
          </ul>
          <p>
            The 1–5 risk meter is a compact visual derived from that severity
            plus criticality tags. It is editorial judgement, not a model
            output or a probability of disruption.
          </p>

          <h2>Sources and ethics</h2>
          <p>
            Each node links out to the primary source(s) used to size and
            describe it. Where possible, we cite company filings,
            industry-body reports (USGS, SEMI), and independent analysts;
            where we have to summarize widely reported figures, we say so.
          </p>
          <p>
            Facilities, not people. The atlas deliberately avoids naming
            individuals, specific employees, or details that could aid bad
            actors in targeting sites.
          </p>

          <h2>Credits</h2>
          <ul>
            <li>
              Basemap and tiles &mdash;{" "}
              <a
                href="https://www.mapbox.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mapbox
              </a>{" "}
              and{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenStreetMap contributors
              </a>
            </li>
            <li>
              Map rendering &mdash;{" "}
              <a
                href="https://docs.mapbox.com/mapbox-gl-js/api/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mapbox GL JS
              </a>
            </li>
            <li>
              Typography &mdash;{" "}
              <a
                href="https://vercel.com/font"
                target="_blank"
                rel="noopener noreferrer"
              >
                Fraunces, Source Serif 4, and Inter
              </a>
            </li>
            <li>
              Icons &mdash;{" "}
              <a
                href="https://lucide.dev/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Lucide
              </a>
            </li>
          </ul>

          <h2>Corrections</h2>
          <p>
            If a number is wrong, a facility is missing, or a flow is
            misdrawn, please say so. This is a living document.
          </p>

          <p className="!mt-12">
            <Link
              href="/aistack"
              className="font-ui no-underline text-foreground transition-colors hover:text-foreground/65"
            >
              ← Return to the map
            </Link>
          </p>
        </article>
      </div>
    </main>
  );
}
