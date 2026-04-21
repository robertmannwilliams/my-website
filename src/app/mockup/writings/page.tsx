"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import StipplePlate from "@/components/StipplePlate";
import {
  drawBatteryStack,
  drawContainership,
  drawCoolingTower,
  drawRefrigerantCylinder,
  drawTurbofan,
  drawWindTurbine,
} from "@/content/mockup-silhouettes";

const PLATES = [
  {
    draw: drawRefrigerantCylinder,
    seed: 3,
    dateline: "April 2026",
    title: "Aftermarket refrigerants",
    dek: "The long tail of HFC service cylinders and who ends up holding the stock.",
    href: "/mockup/writings/sample",
  },
  {
    draw: drawTurbofan,
    seed: 7,
    dateline: "March 2026",
    title: "Turbofan economics",
    dek: "Why the installed base outlasts the manufacturer's stated depreciation schedule.",
    href: "/mockup/writings/sample",
  },
  {
    draw: drawWindTurbine,
    seed: 12,
    dateline: "March 2026",
    title: "Wind curtailment",
    dek: "Negative-price hours are a pricing problem, not a generation one.",
    href: "/mockup/writings/sample",
  },
  {
    draw: drawContainership,
    seed: 19,
    dateline: "February 2026",
    title: "Containership margins",
    dek: "Slot economics once the idle fleet is absorbed and the order book clears.",
    href: "/mockup/writings/sample",
  },
  {
    draw: drawBatteryStack,
    seed: 25,
    dateline: "February 2026",
    title: "Grid-scale storage",
    dek: "Duration auctions are starting to price what four hours is actually worth.",
    href: "/mockup/writings/sample",
  },
  {
    draw: drawCoolingTower,
    seed: 31,
    dateline: "January 2026",
    title: "Data center water",
    dek: "Hyperscaler cooling has become a water-rights story as much as a power one.",
    href: "/mockup/writings/sample",
  },
];

export default function MockupWritingsPage() {
  return (
    <div className="mockup-page mockup-library">
      <ThemeToggle />

      <header className="mockup-library__header">
        <Link href="/mockup" className="mockup-library__brand">
          Robert Williams
        </Link>
        <p className="mockup-smallcaps mockup-library__kicker">
          Writings · Plate library
        </p>
      </header>

      <main className="mockup-library__main">
        <div className="mockup-library__intro">
          <h1 className="mockup-library__title">Writings</h1>
          <p className="mockup-library__lede">
            Each brief is filed against the physical thing it&rsquo;s actually
            about. A plate for a cylinder, an engine, a hull.
          </p>
        </div>

        <ul className="mockup-library__grid">
          {PLATES.map((plate) => (
            <li key={plate.title}>
              <Link href={plate.href} className="mockup-plate">
                <div className="mockup-plate__illustration">
                  <StipplePlate
                    draw={plate.draw}
                    width={320}
                    height={240}
                    density={26}
                    seed={plate.seed}
                    minRadius={0.45}
                    maxRadius={1.25}
                    minOpacity={0.4}
                    maxOpacity={0.9}
                    ariaLabel={`${plate.title} stippled illustration`}
                  />
                </div>
                <p className="mockup-smallcaps mockup-plate__dateline">
                  {plate.dateline}
                </p>
                <h2 className="mockup-plate__title">{plate.title}</h2>
                <p className="mockup-plate__dek">{plate.dek}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
