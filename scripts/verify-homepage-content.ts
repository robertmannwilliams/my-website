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
    "public/homepage-reference-sketch-base.svg",
    "public/homepage-reference-sketch.svg",
    "public/homepage-reference-sketch-generated-city.svg",
    "public/homepage-reference-sketch-previous.svg",
    "scripts/generate-homepage-reference-sketch.ts",
    "src/app/globals.css",
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
  const globals = readFileSync(join(projectRoot, "src/app/globals.css"), "utf8");
  assert(
    globals.includes("margin: 0"),
    "Global page reset must remove the default browser body margin",
  );
  assert(
    entryPanorama.includes("/homepage-reference-sketch.svg"),
    "EntryPanorama must render the live transparent reference sketch SVG",
  );

  const generatedSvg = readFileSync(
    join(projectRoot, "public/homepage-reference-sketch.svg"),
    "utf8",
  );
  const baseSvg = readFileSync(
    join(projectRoot, "public/homepage-reference-sketch-base.svg"),
    "utf8",
  );
  const previousSvg = readFileSync(
    join(projectRoot, "public/homepage-reference-sketch-previous.svg"),
    "utf8",
  );
  const generatedCitySvg = readFileSync(
    join(projectRoot, "public/homepage-reference-sketch-generated-city.svg"),
    "utf8",
  );
  assert(generatedSvg.includes("<svg"), "Reference sketch must be an SVG");
  assert(baseSvg.includes("<svg"), "Base reference sketch must be an SVG");
  assert(previousSvg.includes("<svg"), "Previous reference sketch must be an SVG");
  assert(generatedCitySvg.includes("<svg"), "Generated city backup must be an SVG");
  assert(
    generatedSvg.includes("viewBox=\"0 0 1672 941\""),
    "Reference sketch must preserve the supplied SVG viewBox",
  );
  assert(
    baseSvg.includes("viewBox=\"0 0 1672 941\""),
    "Base reference sketch must preserve the supplied SVG viewBox",
  );
  assert(
    previousSvg.includes("viewBox=\"0 0 840 473\""),
    "Previous reference sketch must preserve the prior source image viewBox",
  );
  assert(
    generatedCitySvg.includes("viewBox=\"0 0 1672 941\""),
    "Generated city backup must preserve the generated city viewBox",
  );
  assert(
    generatedSvg === baseSvg,
    "Live and base reference sketches must both be the supplied SVG",
  );
  assert(
    generatedSvg.includes("data:image/png;base64,"),
    "Reference sketch SVG must embed the supplied transparent drawing image data",
  );
  assert(
    !generatedSvg.includes("id=\"strategic-additions\"") &&
      !baseSvg.includes("id=\"strategic-additions\""),
    "Live and base reference sketches must not include strategic addition overlays",
  );

  const generatorScript = readFileSync(
    join(projectRoot, "scripts/generate-homepage-reference-sketch.ts"),
    "utf8",
  );
  assert(
    generatorScript.includes("SOURCE_SVG_PATH") &&
      generatorScript.includes("city_lineart_preserved_sketch_no_bg_no_signature.svg") &&
      generatorScript.includes("homepage-reference-sketch.svg") &&
      generatorScript.includes("homepage-reference-sketch-base.svg") &&
      generatorScript.includes("copyFileSync"),
    "Reference sketch generator must copy the supplied SVG into the live homepage assets",
  );
  assert(
    !generatorScript.includes("sharp") &&
    !generatorScript.includes("roughjs"),
    "Reference sketch generator must not approximate or reinterpret the supplied drawing",
  );
}

function assertThresholdLayout() {
  const homeExperience = readFileSync(
    join(projectRoot, "src/components/home/HomePageExperience.tsx"),
    "utf8",
  );
  const panoramaIndex = homeExperience.indexOf("<EntryPanorama");
  const enterIndex = homeExperience.indexOf("className={styles.enterButton}");

  assert(panoramaIndex > -1, "Threshold must render EntryPanorama");
  assert(enterIndex > -1, "Threshold must render the enter button");
  assert(
    panoramaIndex < enterIndex,
    "Threshold must place the sketch before the enter button",
  );
  assert(
    !homeExperience.includes("American systems / civic technology"),
    "Threshold must not show the old kicker above the sketch",
  );
  assert(
    homeExperience.includes("styles.landing") &&
      homeExperience.includes("aria-hidden={!entered}") &&
      homeExperience.includes("inert={!entered}") &&
      !homeExperience.includes("scrollIntoView"),
    "Homepage must gate the index behind Enter instead of allowing scroll-through access",
  );
  assert(
    homeExperience.includes("directoryLinks") &&
      homeExperience.includes("styles.mainGrid") &&
      homeExperience.includes("styles.mainIntro") &&
      homeExperience.includes("styles.directoryList"),
    "Post-enter homepage must use a simple text-left, links-right layout",
  );

  const homeStyles = readFileSync(
    join(projectRoot, "src/components/home/HomePage.module.css"),
    "utf8",
  );
  assert(
    homeStyles.includes(".thresholdStage") &&
      homeStyles.includes("place-items: center") &&
      homeStyles.includes(".landing") &&
      homeStyles.includes("overflow: hidden") &&
      homeStyles.includes("background: #eee8da"),
    "Threshold styles must center the sketch on the off-white paper field",
  );
  assert(
    homeStyles.includes(".mainGrid") &&
      homeStyles.includes(".directoryList") &&
      homeStyles.includes(".directoryLink") &&
      homeStyles.includes("grid-template-columns: minmax(0, 0.86fr) minmax(19rem, 0.74fr)"),
    "Index styles must define the post-enter two-column directory layout",
  );
  assert(
    homeStyles.includes("bottom: clamp(2.75rem, 7.5svh, 5.25rem)") &&
      homeStyles.includes("left: 50%") &&
      homeStyles.includes("font-size: 1.56rem") &&
      homeStyles.includes("translateX(-50%)"),
    "Enter button must be centered, raised from the viewport bottom, and doubled in size",
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
assertThresholdLayout();
assertRootPageIntegration();

console.log("✓ homepage content verified");
