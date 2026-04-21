import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const BODY_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "i. The unit economics",
    paragraphs: [
      "Every ten years the industry insists the next cycle will be the one that breaks the link between unit volume and cash. It never is. The operators who survive are the ones who stop pretending the installed base is anything other than the single most valuable thing they own — and who price the service accordingly.",
      "The number that matters is not what a new unit sells for, but what an old one can still be made to do. A cylinder that has been serviced, recertified, and re-leased for a fourth time is carrying margin that no new asset can touch. The moat is not technological. It is documentary — it is the ability to prove, from records, that a given piece of iron is still legal to operate.",
    ],
  },
  {
    heading: "ii. Who is paying",
    paragraphs: [
      "Nobody in the supply chain admits they are paying more. They are all, in their own accounts, holding cost flat. And yet the cash shows up somewhere. Read the transcripts in order and the mystery resolves: the cost is moving one seat further down the table every quarter.",
      "The original operator passes it to the lessor. The lessor passes it to the end user via an access fee. The end user passes it back into the price of the finished good. Nobody is squeezed; everybody quietly raises. A pricing cartel without a cartel — the kind of equilibrium you only get when the underlying asset is scarce enough that nobody has any real alternative.",
    ],
  },
  {
    heading: "iii. The tell",
    paragraphs: [
      "Watch the secondary market. When a stock of used assets clears in under thirty days for two consecutive quarters, the pricing pressure has already moved downstream. That is the window to own the upstream — not when the headlines are loud, but when the auction clocks are quiet.",
    ],
  },
];

const FOOTNOTES = [
  {
    mark: "i",
    text: "On unit economics: the installed base is a balance-sheet asset accounted for as an expense. The reversal is where the margin hides.",
  },
  {
    mark: "ii",
    text: "The pass-through is visible in the spread between spot and contract — not in either price alone.",
  },
];

export default function MockupSamplePage() {
  return (
    <div className="mockup-page mockup-essay">
      <ThemeToggle />

      <header className="mockup-essay__top">
        <Link href="/mockup/writings" className="mockup-essay__brand">
          Robert Williams
        </Link>
        <p className="mockup-smallcaps mockup-essay__dateline">
          Filed · Brooklyn · 40.68°N 73.99°W · April 2026
        </p>
      </header>

      <article className="mockup-essay__article">
        <p className="mockup-smallcaps mockup-essay__running">
          Vol. II · No. 03 · Niche briefs
        </p>
        <h1 className="mockup-essay__title">
          Aftermarket refrigerants and the quiet pricing cartel
        </h1>
        <p className="mockup-essay__byline">Robert Williams</p>

        {BODY_SECTIONS.map((section, idx) => (
          <section key={section.heading} className="mockup-essay__section">
            {idx > 0 ? (
              <div
                aria-hidden="true"
                className="mockup-essay__ornament-rule"
              >
                <span className="mockup-essay__ornament">◆</span>
              </div>
            ) : null}

            <h2 className="mockup-smallcaps mockup-essay__section-title">
              {section.heading}
            </h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="mockup-essay__para">
                {p}
              </p>
            ))}
          </section>
        ))}

        <aside className="mockup-essay__pullquote">
          <p className="mockup-essay__pullquote-text">
            &ldquo;A pricing cartel without a cartel — the kind of equilibrium
            you only get when the underlying asset is scarce enough that nobody
            has any real alternative.&rdquo;
          </p>
          <p className="mockup-smallcaps mockup-essay__pullquote-attr">
            From &ldquo;Who is paying&rdquo;
          </p>
        </aside>

        <footer className="mockup-essay__footnotes">
          <p className="mockup-smallcaps mockup-essay__footnotes-label">
            Marginalia
          </p>
          {FOOTNOTES.map((fn) => (
            <p key={fn.mark} className="mockup-essay__footnote">
              <span className="mockup-smallcaps mockup-essay__footnote-mark">
                {fn.mark}
              </span>
              <span className="mockup-essay__footnote-text">{fn.text}</span>
            </p>
          ))}
        </footer>
      </article>

      <footer className="mockup-essay__page-footer">
        <span className="mockup-smallcaps">Vol. II · No. 03</span>
        <span className="mockup-essay__folio">— I —</span>
        <span className="mockup-smallcaps">Niche briefs</span>
      </footer>
    </div>
  );
}
