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
            The atlas traces the materials, equipment, designs, and facilities
            that together make modern AI compute possible — starting with
            quartz sand in the Appalachian mountains and ending at the
            server racks running GPUs in Loudoun County, Virginia.
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
            Each node carries a <em>chokepointRisk</em> from 1 to 5, roughly:
          </p>
          <ul>
            <li>
              <strong>1–2</strong> — substitutable; multiple suppliers, spare
              capacity, or standard IP
            </li>
            <li>
              <strong>3</strong> — concentrated but with credible
              alternatives on a sensible timeline
            </li>
            <li>
              <strong>4</strong> — substantially concentrated; disruption
              meaningfully constrains the industry for months
            </li>
            <li>
              <strong>5</strong> — effectively a single point of failure for
              the current leading-edge roadmap
            </li>
          </ul>
          <p>
            Scores are editorial judgement, not a model output. They should
            be read as &ldquo;how much would an outage here hurt AI supply
            today, given nothing else changes&rdquo; rather than a
            probability of disruption.
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
