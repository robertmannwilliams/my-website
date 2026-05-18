# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current scroll-hijacked particle homepage with a minimalist off-white cinematic threshold, architectural civic-industrial illustrations, and a normal post-enter scroll index.

**Architecture:** The root page becomes a server component that fetches the latest writing and passes static data into a focused client homepage experience. The homepage uses CSS modules, static SVG React components, and a deliberate Enter action instead of Three.js/canvas scroll morphing. Existing sections remain unchanged except for small lint fixes needed to make final verification meaningful.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules, static SVG, existing writing content helpers, ESLint, `tsx` verification scripts.

---

## File Structure

- Create `src/content/homepage.ts`: homepage copy and link data. Keeps homepage content strategy separate from the current section-directory data.
- Create `scripts/verify-homepage-content.ts`: lightweight TypeScript verification for homepage content, illustration files, and root-page integration.
- Modify `package.json`: add `verify:homepage`.
- Create `src/components/home/EntryPanorama.tsx`: main off-white civic-industrial panorama SVG.
- Create `src/components/home/HomeIllustrationVignette.tsx`: small section SVG fragments for post-enter continuity.
- Create `src/components/home/HomePageExperience.tsx`: client component for Enter state, focus movement, and rendering the homepage.
- Create `src/components/home/HomePage.module.css`: homepage-only layout, palette, responsive behavior, and reduced-motion rules.
- Replace `src/app/page.tsx`: server component wiring content and latest writing into `HomePageExperience`.
- Delete `src/components/ParticleField.tsx`: remove unused homepage-only Three.js component after root page no longer imports it.
- Modify `src/components/ThemeToggle.tsx`: remove state-in-effect lint error while preserving theme behavior for existing section pages.
- Modify `src/app/susan/page.tsx`: remove state-in-effect and shader uniform immutability lint errors without changing the page design.
- Modify `src/app/monitor/layout.tsx`, `src/app/monitor/page.tsx`, `src/components/monitor/PriceTicker.tsx`, and `src/components/monitor/SituationBriefBar.tsx`: replace page-local font `<link>` tags with `next/font` and CSS variables.

---

### Task 1: Homepage Content Contract

**Files:**
- Create: `src/content/homepage.ts`
- Create: `scripts/verify-homepage-content.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the failing homepage verification script**

Create `scripts/verify-homepage-content.ts`:

```ts
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
    assert(link.href.startsWith("/"), `${link.label} href must be root-relative`);
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
```

Modify `package.json` scripts by adding `verify:homepage` after `lint`:

```json
"lint": "eslint",
"verify:homepage": "tsx scripts/verify-homepage-content.ts"
```

- [ ] **Step 2: Run verification and confirm it fails for the missing content module**

Run:

```bash
npm run verify:homepage
```

Expected: FAIL with a module resolution error for `../src/content/homepage`.

- [ ] **Step 3: Add homepage content data**

Create `src/content/homepage.ts`:

```ts
export interface HomeLink {
  href: string;
  label: string;
  eyebrow: string;
  description: string;
}

export const homepageCopy = {
  entryCue: "Enter",
  note:
    "This site collects writing and working notes on systems, capital, technology, and national growth, alongside the maps and projects that help me think in public.",
  latestLabel: "Latest writing",
  secondaryLabel: "Systems and experiments",
} as const;

export const primaryHomeLinks: HomeLink[] = [
  {
    href: "/writings",
    label: "Writings",
    eyebrow: "Archive",
    description:
      "Essays, dispatches, and notebooks filed as a chronological record of ideas in motion.",
  },
  {
    href: "/about",
    label: "About",
    eyebrow: "Context",
    description:
      "A short note on the site, the work, and the questions holding the rooms together.",
  },
  {
    href: "/projects",
    label: "Work",
    eyebrow: "Build log",
    description:
      "Projects, systems, and experiments that deserve more structure than a passing note.",
  },
];

export const secondaryHomeLinks: HomeLink[] = [
  {
    href: "/monitor",
    label: "Monitor",
    eyebrow: "Live system",
    description:
      "A map-first room for geopolitical events, markets, disasters, and moving signals.",
  },
  {
    href: "/aistack",
    label: "AI Stack",
    eyebrow: "Atlas",
    description:
      "A physical map of the AI supply chain from raw materials to deployed inference.",
  },
];
```

- [ ] **Step 4: Run verification and confirm the expected next failure**

Run:

```bash
npm run verify:homepage
```

Expected: FAIL because `src/components/home/EntryPanorama.tsx` does not exist yet.

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json scripts/verify-homepage-content.ts src/content/homepage.ts
git commit -m "feat: add homepage content contract"
```

---

### Task 2: Static Illustration Components

**Files:**
- Create: `src/components/home/EntryPanorama.tsx`
- Create: `src/components/home/HomeIllustrationVignette.tsx`

- [ ] **Step 1: Confirm the illustration verification fails**

Run:

```bash
npm run verify:homepage
```

Expected: FAIL because `src/components/home/EntryPanorama.tsx` does not exist.

- [ ] **Step 2: Create the entry panorama**

Create `src/components/home/EntryPanorama.tsx`:

```tsx
interface EntryPanoramaProps {
  className?: string;
}

export default function EntryPanorama({ className }: EntryPanoramaProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 1200 720"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M80 590H1120" strokeWidth="10" opacity="0.9" />
        <path d="M126 590V392L198 328L270 392V590" strokeWidth="8" />
        <path d="M156 428H240M156 468H240M156 508H240" strokeWidth="4" opacity="0.44" />
        <path d="M318 590V252H408V590" strokeWidth="11" />
        <path d="M334 310H392M334 370H392M334 430H392M334 490H392" strokeWidth="4" opacity="0.44" />
        <path d="M468 590V372L618 284L768 372V590" strokeWidth="10" />
        <path d="M506 410H730M506 470H730M506 530H730" strokeWidth="4" opacity="0.42" />
        <path d="M820 590V184H914V590" strokeWidth="12" />
        <path d="M840 250H894M840 318H894M840 386H894M840 454H894" strokeWidth="4" opacity="0.44" />
        <path d="M958 590V354H1064V590" strokeWidth="9" />
        <path d="M990 354V284H1034V354" strokeWidth="7" />
        <path d="M142 476C248 340 388 386 492 462C608 548 740 528 826 374C900 240 1024 248 1110 352" strokeWidth="6" opacity="0.38" />
        <path d="M224 634H440M506 634H768M820 634H1064" strokeWidth="4" opacity="0.35" />
        <path d="M602 284L602 590" strokeWidth="4" opacity="0.36" />
        <path d="M558 310L646 310M532 344L672 344" strokeWidth="4" opacity="0.36" />
        <path d="M867 184L900 138L933 184" strokeWidth="6" opacity="0.55" />
        <path d="M900 138V252" strokeWidth="4" opacity="0.45" />
      </g>
      <g fill="currentColor" opacity="0.32">
        <circle cx="198" cy="328" r="8" />
        <circle cx="618" cy="284" r="8" />
        <circle cx="900" cy="138" r="7" />
        <circle cx="1034" cy="284" r="6" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 3: Create section vignettes**

Create `src/components/home/HomeIllustrationVignette.tsx`:

```tsx
export type HomeVignetteKind = "writing" | "work" | "about" | "systems";

interface HomeIllustrationVignetteProps {
  kind: HomeVignetteKind;
  className?: string;
}

export default function HomeIllustrationVignette({
  kind,
  className,
}: HomeIllustrationVignetteProps) {
  if (kind === "writing") {
    return (
      <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 260 140">
        <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M22 104C64 38 114 124 158 62C190 18 224 42 244 28" strokeWidth="6" opacity="0.54" />
          <path d="M28 122H232" strokeWidth="4" opacity="0.3" />
          <path d="M54 48H138M44 72H112M82 96H176" strokeWidth="3" opacity="0.32" />
        </g>
      </svg>
    );
  }

  if (kind === "work") {
    return (
      <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 260 140">
        <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M24 118H238" strokeWidth="6" />
          <path d="M50 118V54H104V118" strokeWidth="5" />
          <path d="M132 118V34H180V118" strokeWidth="6" />
          <path d="M198 118V72H232V118" strokeWidth="5" />
          <path d="M62 76H94M142 58H170M142 82H170" strokeWidth="3" opacity="0.42" />
        </g>
      </svg>
    );
  }

  if (kind === "about") {
    return (
      <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 260 140">
        <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M130 22L230 118H30L130 22Z" strokeWidth="6" />
          <path d="M130 22V118" strokeWidth="4" opacity="0.44" />
          <path d="M74 78H186M96 98H164" strokeWidth="3" opacity="0.35" />
        </g>
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 260 140">
      <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M30 104C70 40 112 112 150 62C188 12 224 54 236 30" strokeWidth="5" opacity="0.48" />
        <path d="M54 80L108 104L158 62L216 64" strokeWidth="4" opacity="0.34" />
      </g>
      <g fill="currentColor" opacity="0.34">
        <circle cx="54" cy="80" r="7" />
        <circle cx="108" cy="104" r="7" />
        <circle cx="158" cy="62" r="7" />
        <circle cx="216" cy="64" r="7" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: Run verification and confirm the expected next failure**

Run:

```bash
npm run verify:homepage
```

Expected: FAIL because `src/components/home/HomePageExperience.tsx` does not exist yet.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/components/home/EntryPanorama.tsx src/components/home/HomeIllustrationVignette.tsx
git commit -m "feat: add homepage illustration components"
```

---

### Task 3: Homepage Experience And Root Page

**Files:**
- Create: `src/components/home/HomePageExperience.tsx`
- Create: `src/components/home/HomePage.module.css`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Confirm root integration verification fails**

Run:

```bash
npm run verify:homepage
```

Expected: FAIL because `HomePageExperience.tsx` and `HomePage.module.css` do not exist, and the root page still imports `ParticleField`.

- [ ] **Step 2: Create scoped homepage styles**

Create `src/components/home/HomePage.module.css`:

```css
.home {
  --home-bg: #f1efe7;
  --home-ink: #203548;
  --home-muted: rgba(32, 53, 72, 0.68);
  --home-soft: rgba(32, 53, 72, 0.12);
  --home-rule: rgba(32, 53, 72, 0.28);
  min-height: 100svh;
  background: var(--home-bg);
  color: var(--home-ink);
}

.threshold {
  position: relative;
  display: grid;
  min-height: 100svh;
  overflow: hidden;
  padding: clamp(1.25rem, 3vw, 3rem);
}

.thresholdGrid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(18rem, 1fr);
  align-items: end;
  gap: clamp(1.5rem, 4vw, 4rem);
  width: min(100%, 86rem);
  margin: 0 auto;
}

.brandBlock {
  position: relative;
  z-index: 2;
  padding-bottom: clamp(1.5rem, 6vh, 4rem);
}

.name {
  max-width: 11ch;
  font-size: clamp(3.4rem, 8vw, 8.8rem);
  line-height: 0.84;
  letter-spacing: 0;
}

.entryKicker,
.smallLabel,
.linkEyebrow,
.footer {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.entryKicker {
  margin-bottom: 1rem;
  color: var(--home-muted);
}

.enterButton {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: 1.5rem;
  border: 0;
  border-top: 2px solid currentColor;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.24em;
  padding: 0.8rem 0 0;
  text-transform: uppercase;
}

.enterButton::after {
  content: "";
  width: 2.8rem;
  height: 2px;
  background: currentColor;
  transform: translateY(-1px);
  transition: transform 220ms ease;
}

.enterButton:hover::after,
.enterButton:focus-visible::after {
  transform: translate(0.45rem, -1px);
}

.enterButton:focus-visible,
.linkCard:focus-visible,
.latestLink:focus-visible,
.secondaryLink:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}

.panoramaWrap {
  position: relative;
  z-index: 1;
  min-height: min(62vw, 42rem);
  color: var(--home-ink);
}

.panorama {
  position: absolute;
  inset: auto -8% 0 auto;
  width: min(76vw, 58rem);
  opacity: 0.94;
  transition:
    opacity 700ms ease,
    transform 700ms ease;
}

.entered .panorama {
  opacity: 0.32;
  transform: translateY(-4rem) scale(0.96);
}

.index {
  width: min(100%, 72rem);
  margin: 0 auto;
  padding: clamp(4rem, 8vw, 7rem) clamp(1.25rem, 3vw, 3rem) 3rem;
}

.intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.62fr);
  gap: clamp(2rem, 5vw, 5rem);
  align-items: end;
  margin-bottom: clamp(3rem, 6vw, 5rem);
}

.note {
  max-width: 44rem;
  font-size: clamp(1.45rem, 2.5vw, 2.55rem);
  line-height: 1.13;
}

.vignette {
  justify-self: end;
  width: min(100%, 18rem);
  color: var(--home-ink);
  opacity: 0.42;
}

.linksGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: clamp(2.5rem, 5vw, 4rem);
}

.linkCard,
.latestLink,
.secondaryLink {
  color: inherit;
  text-decoration: none;
}

.linkCard {
  min-height: 12rem;
  border-top: 4px solid currentColor;
  padding-top: 1rem;
}

.linkTitle {
  margin-top: 0.55rem;
  font-size: clamp(1.4rem, 2vw, 2rem);
  line-height: 1;
}

.linkBody,
.latestMeta,
.secondaryDescription {
  color: var(--home-muted);
  line-height: 1.65;
}

.linkBody {
  margin-top: 0.8rem;
}

.latest {
  display: grid;
  grid-template-columns: minmax(10rem, 0.32fr) minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 4rem);
  border-top: 1px solid var(--home-rule);
  padding-top: 1.5rem;
  margin-bottom: clamp(2.5rem, 5vw, 4rem);
}

.latestTitle {
  font-size: clamp(1.6rem, 3vw, 3rem);
  line-height: 0.98;
}

.secondary {
  display: grid;
  grid-template-columns: minmax(10rem, 0.32fr) minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 4rem);
  border-top: 1px solid var(--home-rule);
  padding-top: 1.5rem;
}

.secondaryList {
  display: grid;
  gap: 1rem;
}

.secondaryLink {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--home-soft);
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  width: min(100%, 72rem);
  margin: 0 auto;
  padding: 2rem clamp(1.25rem, 3vw, 3rem) 3rem;
  color: var(--home-muted);
}

@media (max-width: 820px) {
  .thresholdGrid,
  .intro,
  .latest,
  .secondary {
    grid-template-columns: 1fr;
  }

  .thresholdGrid {
    min-height: calc(100svh - 2.5rem);
  }

  .brandBlock {
    order: 2;
    padding-bottom: 0;
  }

  .panoramaWrap {
    order: 1;
    min-height: 48svh;
  }

  .panorama {
    inset: auto -28% 0 auto;
    width: 128vw;
  }

  .linksGrid {
    grid-template-columns: 1fr;
  }

  .linkCard {
    min-height: auto;
  }

  .secondaryLink {
    grid-template-columns: 1fr;
  }

  .footer {
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panorama,
  .enterButton::after {
    transition: none;
  }

  .entered .panorama {
    transform: none;
  }
}
```

- [ ] **Step 3: Create the homepage client experience**

Create `src/components/home/HomePageExperience.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { HomeLink } from "@/content/homepage";
import EntryPanorama from "./EntryPanorama";
import HomeIllustrationVignette from "./HomeIllustrationVignette";
import styles from "./HomePage.module.css";

interface HomepageCopy {
  entryCue: string;
  note: string;
  latestLabel: string;
  secondaryLabel: string;
}

interface LatestWriting {
  href: string;
  title: string;
  summary: string;
  meta: string;
}

interface HomePageExperienceProps {
  copy: HomepageCopy;
  primaryLinks: HomeLink[];
  secondaryLinks: HomeLink[];
  latestWriting: LatestWriting | null;
}

export default function HomePageExperience({
  copy,
  primaryLinks,
  secondaryLinks,
  latestWriting,
}: HomePageExperienceProps) {
  const [entered, setEntered] = useState(false);
  const indexRef = useRef<HTMLElement>(null);

  const handleEnter = () => {
    setEntered(true);
    requestAnimationFrame(() => {
      indexRef.current?.focus({ preventScroll: true });
      indexRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  return (
    <main className={`${styles.home} ${entered ? styles.entered : ""}`}>
      <section className={styles.threshold} aria-label="Homepage entry">
        <div className={styles.thresholdGrid}>
          <div className={styles.brandBlock}>
            <p className={styles.entryKicker}>American systems / civic technology</p>
            <h1 className={styles.name}>Robert Williams</h1>
            <button
              className={styles.enterButton}
              onClick={handleEnter}
              type="button"
            >
              {copy.entryCue}
            </button>
          </div>
          <div className={styles.panoramaWrap}>
            <EntryPanorama className={styles.panorama} />
          </div>
        </div>
      </section>

      <section
        className={styles.index}
        id="home-index"
        ref={indexRef}
        tabIndex={-1}
      >
        <div className={styles.intro}>
          <div>
            <p className={styles.smallLabel}>Index</p>
            <p className={styles.note}>{copy.note}</p>
          </div>
          <HomeIllustrationVignette className={styles.vignette} kind="systems" />
        </div>

        <nav className={styles.linksGrid} aria-label="Primary homepage links">
          {primaryLinks.map((link) => (
            <Link className={styles.linkCard} href={link.href} key={link.href}>
              <p className={styles.linkEyebrow}>{link.eyebrow}</p>
              <h2 className={styles.linkTitle}>{link.label}</h2>
              <p className={styles.linkBody}>{link.description}</p>
            </Link>
          ))}
        </nav>

        {latestWriting ? (
          <section className={styles.latest} aria-labelledby="latest-writing">
            <div>
              <p className={styles.smallLabel} id="latest-writing">
                {copy.latestLabel}
              </p>
              <HomeIllustrationVignette className={styles.vignette} kind="writing" />
            </div>
            <Link className={styles.latestLink} href={latestWriting.href}>
              <h2 className={styles.latestTitle}>{latestWriting.title}</h2>
              <p className={styles.latestMeta}>{latestWriting.meta}</p>
              <p className={styles.linkBody}>{latestWriting.summary}</p>
            </Link>
          </section>
        ) : null}

        <section className={styles.secondary} aria-labelledby="secondary-links">
          <p className={styles.smallLabel} id="secondary-links">
            {copy.secondaryLabel}
          </p>
          <div className={styles.secondaryList}>
            {secondaryLinks.map((link) => (
              <Link className={styles.secondaryLink} href={link.href} key={link.href}>
                <span>{link.label}</span>
                <span className={styles.secondaryDescription}>
                  {link.description}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <footer className={styles.footer}>
        <span>Robert Williams</span>
        <span>2026</span>
      </footer>
    </main>
  );
}
```

- [ ] **Step 4: Replace the root page**

Replace `src/app/page.tsx` with:

```tsx
import HomePageExperience from "@/components/home/HomePageExperience";
import {
  homepageCopy,
  primaryHomeLinks,
  secondaryHomeLinks,
} from "@/content/homepage";
import { formatWritingDate, getPublishedWritings } from "@/content/writings";

export default function Page() {
  const latestWriting = getPublishedWritings()[0];

  return (
    <HomePageExperience
      copy={homepageCopy}
      latestWriting={
        latestWriting
          ? {
              href: `/writings/${latestWriting.slug}`,
              title: latestWriting.title,
              summary: latestWriting.summary,
              meta: `${formatWritingDate(latestWriting.publishedAt)} / ${latestWriting.format}`,
            }
          : null
      }
      primaryLinks={primaryHomeLinks}
      secondaryLinks={secondaryHomeLinks}
    />
  );
}
```

- [ ] **Step 5: Run homepage verification**

Run:

```bash
npm run verify:homepage
```

Expected: PASS with `✓ homepage content verified`.

- [ ] **Step 6: Run production build**

Run:

```bash
npm run build
```

Expected: PASS. The route table should still include `/`, `/monitor`, `/aistack`, `/writings`, `/projects`, `/about`, and `/susan`.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/app/page.tsx src/components/home src/content/homepage.ts scripts/verify-homepage-content.ts package.json
git commit -m "feat: rebuild homepage threshold"
```

---

### Task 4: Lint Cleanup Required For Verification

**Files:**
- Delete: `src/components/ParticleField.tsx`
- Modify: `src/components/ThemeToggle.tsx`
- Modify: `src/app/susan/page.tsx`
- Modify: `src/app/monitor/layout.tsx`
- Modify: `src/app/monitor/page.tsx`
- Modify: `src/components/monitor/PriceTicker.tsx`
- Modify: `src/components/monitor/SituationBriefBar.tsx`

- [ ] **Step 1: Run lint and confirm the known failures**

Run:

```bash
npm run lint
```

Expected: FAIL on the existing `react-hooks/set-state-in-effect`, `react-hooks/immutability`, `@typescript-eslint/no-explicit-any`, and monitor font warning areas.

- [ ] **Step 2: Delete the unused homepage particle component**

Run:

```bash
git rm src/components/ParticleField.tsx
```

Expected: file removed. `rg "ParticleField" src` should return no matches.

- [ ] **Step 3: Replace ThemeToggle with an external-store implementation**

Replace `src/components/ThemeToggle.tsx` with:

```tsx
"use client";

import { useEffect, useSyncExternalStore } from "react";

type ThemeName = "dark" | "light";

const THEME_EVENT = "rw-theme-change";

function getServerSnapshot(): ThemeName {
  return "dark";
}

function getSnapshot(): ThemeName {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function applyTheme(theme: ThemeName, persist = true) {
  document.documentElement.style.setProperty(
    "--background",
    theme === "dark" ? "#344a34" : "#f5dcc8",
  );
  document.documentElement.style.setProperty(
    "--foreground",
    theme === "dark" ? "#f5dcc8" : "#344a34",
  );
  document.documentElement.classList.toggle("dark", theme === "dark");

  if (persist) {
    localStorage.setItem("theme", theme);
  }

  window.dispatchEvent(new Event(THEME_EVENT));
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dark = theme === "dark";

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    applyTheme(saved === "light" ? "light" : "dark", false);
  }, []);

  const toggle = () => {
    applyTheme(dark ? "light" : "dark");
  };

  return (
    <button
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      style={{
        position: "fixed",
        top: "1.5rem",
        right: "1.5rem",
        zIndex: 50,
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "1px solid var(--foreground)",
        background: "transparent",
        color: "var(--foreground)",
        cursor: "pointer",
        opacity: 0.3,
        transition: "opacity 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        padding: 0,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.opacity = "0.8";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.opacity = "0.3";
      }}
      type="button"
    >
      {dark ? "\u2600\uFE0E" : "\u263E"}
    </button>
  );
}
```

- [ ] **Step 4: Make Susan hearts deterministic and mutate shader uniforms through a ref**

In `src/app/susan/page.tsx`, change the React import to:

```tsx
import { useMemo, useRef, useEffect } from "react";
```

Add this after `const HEART_COUNT = 18;`:

```tsx
type FloatingHeart = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
};

const HEARTS: FloatingHeart[] = Array.from({ length: HEART_COUNT }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  size: 14 + ((i * 11) % 22),
  duration: 8 + ((i * 7) % 10),
  delay: (i * 13) % 18,
  opacity: 0.2 + (((i * 17) % 45) / 100),
  color: i % 2 === 0 ? "#FF69B4" : "#FF1493",
}));
```

Replace the start of `FloatingHearts` with:

```tsx
function FloatingHearts() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {HEARTS.map((h) => (
```

Remove the old `useState` declaration and the `useEffect` that called `setHearts`.

Inside `Portrait`, add a material ref below the existing points ref:

```tsx
const shaderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
```

After the `shaderMaterial` `useMemo`, add:

```tsx
useEffect(() => {
  shaderMaterialRef.current = shaderMaterial;
  return () => {
    shaderMaterialRef.current = null;
    shaderMaterial.dispose();
  };
}, [shaderMaterial]);
```

Replace the first line inside `useFrame` with:

```tsx
const material = shaderMaterialRef.current;
if (material) {
  material.uniforms.uTime.value = clock.getElapsedTime();
}
```

Keep the existing `pointsRef.current.rotation.y` update.

- [ ] **Step 5: Replace monitor page font links with Next fonts**

Replace `src/app/monitor/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-monitor-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-monitor-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Global Monitor | Robert Williams",
  description:
    "Real-time global monitoring dashboard — geopolitical events, prediction markets, earthquakes, and market data.",
  openGraph: {
    title: "Global Monitor | Robert Williams",
    description: "Real-time global monitoring dashboard.",
    type: "website",
  },
};

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} ${jetBrainsMono.variable}`}>
      {children}
    </div>
  );
}
```

Replace monitor inline font family strings:

```bash
rg -n "Inter|JetBrains" src/app/monitor src/components/monitor
```

Make these replacements:

- In `src/app/monitor/page.tsx`, replace `"'Inter', 'Neue Montreal', sans-serif"` with `"var(--font-monitor-sans), 'Neue Montreal', sans-serif"`.
- In `src/components/monitor/PriceTicker.tsx`, replace `"'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace"` with `"var(--font-monitor-mono), 'IBM Plex Mono', 'SF Mono', monospace"`.
- In `src/components/monitor/SituationBriefBar.tsx`, replace `"'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace"` with `"var(--font-monitor-mono), 'IBM Plex Mono', 'SF Mono', monospace"`.

- [ ] **Step 6: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no errors. A clean warning-free run is preferred.

- [ ] **Step 7: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/components/ThemeToggle.tsx src/app/susan/page.tsx src/app/monitor/layout.tsx src/app/monitor/page.tsx src/components/monitor/PriceTicker.tsx src/components/monitor/SituationBriefBar.tsx
git add -u src/components/ParticleField.tsx
git commit -m "chore: clear lint blockers"
```

---

### Task 5: Visual Verification And Polish

**Files:**
- Modify: `src/components/home/HomePage.module.css`
- Modify: `src/components/home/EntryPanorama.tsx`
- Modify: `src/components/home/HomePageExperience.tsx`

- [ ] **Step 1: Start the local dev server**

Run:

```bash
npm run dev
```

Expected: server starts at `http://localhost:3001`.

- [ ] **Step 2: Verify desktop first viewport**

Open `http://localhost:3001`.

Expected:

- Off-white background fills the viewport.
- Name and Enter cue are visible without scrolling.
- The panorama is recognizable as a city/industrial/energy/transport study.
- The illustration reads as bold architectural linework, not a thin technical diagram.
- No Monitor or AI Stack card is prominent on the first viewport.

- [ ] **Step 3: Verify Enter behavior**

Click Enter.

Expected:

- Focus moves to the index section.
- Page scrolls to the index without scroll hijacking.
- The experience remains usable if the visitor scrolls manually instead of clicking Enter.

- [ ] **Step 4: Verify post-enter scroll**

Expected:

- The authored note is readable and not too biographical.
- Primary links are Writings, About, Work.
- Latest writing appears when a writing entry exists.
- Monitor and AI Stack appear as lower-emphasis secondary links.
- Section vignettes support the visual language without blocking reading.

- [ ] **Step 5: Verify mobile**

Use a narrow viewport around 390px wide.

Expected:

- No text overlaps the panorama.
- Name fits on screen.
- Enter cue remains visible.
- Primary links stack cleanly.
- Vignettes do not create horizontal scrolling.

- [ ] **Step 6: Verify reduced motion**

Use the browser's reduced-motion emulation or OS setting.

Expected:

- No essential information depends on animation.
- Enter still scrolls to the index.
- CSS transitions are removed by the `prefers-reduced-motion` media query.

- [ ] **Step 7: Patch polish issues and rerun checks**

If any check fails, patch the relevant file and rerun:

```bash
npm run verify:homepage
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 8: Commit visual polish**

Run:

```bash
git add src/components/home src/app/page.tsx
git commit -m "polish: tune homepage visual rhythm"
```

If Step 7 required no file changes, skip this commit and record that no polish commit was needed.

---

## Final Verification

Run:

```bash
npm run verify:homepage
npm run lint
npm run build
```

Expected: all PASS.

Run:

```bash
git status --short
```

Expected: only pre-existing unrelated untracked files remain, such as `.superpowers/` scratch files and the untracked AI Stack tour files.

Do not modify or stage:

- `.superpowers/`
- `src/features/aistack/components/tour/`
- `src/features/aistack/lib/tour-sequences.ts`

unless the user explicitly expands the task.

---

## Self-Review

Spec coverage:

- Cinematic threshold: Task 3.
- Off-white architectural civic-industrial illustration: Task 2 and Task 5.
- Enter action instead of scroll hijack: Task 3.
- Continuous scroll with note, index, latest writing, secondary links: Task 3.
- Illustration continuity through section vignettes: Task 2 and Task 3.
- Static SVG/CSS instead of Three.js root homepage: Task 3 and Task 4.
- Accessibility and reduced motion: Task 3 and Task 5.
- Build and lint verification: Task 4 and final verification.

No vague plan markers remain. The plan intentionally includes lint cleanup because final `npm run lint` is otherwise blocked by existing unrelated errors.
