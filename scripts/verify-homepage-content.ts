import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  homepageCopy,
  primaryHomeLinks,
  secondaryHomeLinks,
} from "../src/content/homepage";

const projectRoot = process.cwd();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertUniqueHrefs() {
  const hrefs = [...primaryHomeLinks, ...secondaryHomeLinks].map(
    (link) => link.href,
  );
  assert(
    new Set(hrefs).size === hrefs.length,
    `Homepage links must use unique hrefs. Received: ${hrefs.join(", ")}`,
  );
}

function assertLinks() {
  const primaryLabels = primaryHomeLinks.map((link) => link.label);
  assert(
    JSON.stringify(primaryLabels) === JSON.stringify(["Writings", "About", "Work"]),
    `Primary homepage links must be Writings, About, Work. Received: ${primaryLabels.join(", ")}`,
  );

  const secondaryLabels = secondaryHomeLinks.map((link) => link.label);
  assert(
    JSON.stringify(secondaryLabels) === JSON.stringify(["Monitor", "AI Stack"]),
    `Secondary homepage links must be Monitor, AI Stack. Received: ${secondaryLabels.join(", ")}`,
  );

  for (const link of [...primaryHomeLinks, ...secondaryHomeLinks]) {
    assert(
      link.href.startsWith("/") && !link.href.startsWith("//"),
      `${link.label} href must be root-relative`,
    );
    assert(link.eyebrow.length > 0, `${link.label} must include an eyebrow`);
    assert(link.description.length >= 24, `${link.label} description is too short`);
  }

  assertUniqueHrefs();
}

function assertCopy() {
  assert(homepageCopy.entryCue === "Enter", "Entry cue must be Enter");
  assert(
    homepageCopy.note.length >= 90 && homepageCopy.note.length <= 220,
    `Homepage note should read like a concise plaque. Current length: ${homepageCopy.note.length}`,
  );
  assert(
    homepageCopy.note.includes("systems") &&
      homepageCopy.note.includes("capital") &&
      homepageCopy.note.includes("technology"),
    "Homepage note must include systems, capital, and technology",
  );
}

function assertIllustrationFiles() {
  const requiredFiles = [
    "src/components/home/EntryPanorama.tsx",
    "src/components/home/HomeIllustrationVignette.tsx",
    "src/components/home/HomePageExperience.tsx",
    "src/components/home/HomePage.module.css",
  ];

  for (const file of requiredFiles) {
    assert(existsSync(join(projectRoot, file)), `${file} must exist`);
  }

  const entryPanorama = readFileSync(
    join(projectRoot, "src/components/home/EntryPanorama.tsx"),
    "utf8",
  );
  assert(entryPanorama.includes("<svg"), "EntryPanorama must render an SVG");
  assert(
    entryPanorama.includes("viewBox=\"0 0 1200 720\""),
    "EntryPanorama must use the expected viewBox",
  );
}

function assertRootPageIntegration() {
  const rootPagePath = join(projectRoot, "src/app/page.tsx");
  const rootPage = readFileSync(rootPagePath, "utf8");
  assert(!rootPage.includes("\"use client\""), "Root page should be a server component");
  assert(!rootPage.includes("ParticleField"), "Root page must not import ParticleField");
  assert(
    rootPage.includes("HomePageExperience"),
    "Root page must render HomePageExperience",
  );
}

assertCopy();
assertLinks();
assertIllustrationFiles();
assertRootPageIntegration();

console.log("✓ homepage content verified");
