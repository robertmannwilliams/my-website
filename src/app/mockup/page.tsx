"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import StipplePlate from "@/components/StipplePlate";
import { drawRefinery } from "@/content/mockup-silhouettes";

const MOCKUP_LINKS = [
  { href: "/mockup", name: "Monitor", blurb: "real-time signals" },
  {
    href: "/mockup/writings",
    name: "Writings",
    blurb: "essays and briefs",
  },
  { href: "/mockup", name: "Projects", blurb: "working systems" },
];

export default function MockupLandingPage() {
  return (
    <div className="mockup-page mockup-landing">
      <ThemeToggle />

      <header className="mockup-landing__brand">
        <Link href="/mockup" className="mockup-landing__brand-name">
          Robert Williams
        </Link>
      </header>

      <main className="mockup-landing__main">
        <div className="mockup-landing__left">
          <p className="mockup-smallcaps mockup-landing__kicker">
            A notebook · April 2026
          </p>
          <h1 className="mockup-landing__headline">
            Notes on markets, geopolitics, and the physical economy.
          </h1>
          <p className="mockup-landing__subtitle">
            A record of the shift from digital back to physical — energy,
            defense, industrial capital.
          </p>

          <ul className="mockup-landing__links">
            {MOCKUP_LINKS.map((link) => (
              <li key={link.name}>
                <Link href={link.href} className="mockup-landing__link">
                  <span className="mockup-landing__link-name">{link.name}</span>
                  <span className="mockup-landing__link-blurb">
                    {link.blurb}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mockup-landing__right">
          <StipplePlate
            draw={drawRefinery}
            width={420}
            height={560}
            density={22}
            seed={11}
            minRadius={0.5}
            maxRadius={1.35}
            minOpacity={0.38}
            maxOpacity={0.9}
            className="mockup-landing__plate"
            ariaLabel="Refinery stippled illustration"
          />
        </div>
      </main>
    </div>
  );
}
