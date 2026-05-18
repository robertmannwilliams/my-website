"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { HomeLink } from "@/content/homepage";
import EntryPanorama from "@/components/home/EntryPanorama";
import HomeIllustrationVignette from "@/components/home/HomeIllustrationVignette";
import styles from "./HomePage.module.css";

interface LatestWriting {
  href: string;
  title: string;
  summary: string;
  meta: string;
}

interface HomePageExperienceProps {
  copy: {
    entryCue: string;
    note: string;
    latestLabel: string;
    secondaryLabel: string;
  };
  primaryLinks: HomeLink[];
  secondaryLinks: HomeLink[];
  latestWriting?: LatestWriting | null;
}

export default function HomePageExperience({
  copy,
  primaryLinks,
  secondaryLinks,
  latestWriting,
}: HomePageExperienceProps) {
  const [entered, setEntered] = useState(false);
  const indexRef = useRef<HTMLElement>(null);

  function handleEnter() {
    setEntered(true);

    window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      indexRef.current?.focus({ preventScroll: true });
      indexRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  return (
    <main className={`${styles.home} ${entered ? styles.entered : ""}`}>
      <section className={styles.threshold} aria-label="Homepage threshold">
        <div className={styles.thresholdGrid}>
          <div className={styles.brandBlock}>
            <p className={styles.entryKicker}>American systems / civic technology</p>
            <h1 className={styles.name}>Robert Williams</h1>
            <button className={styles.enterButton} type="button" onClick={handleEnter}>
              {copy.entryCue}
            </button>
          </div>

          <div className={styles.panoramaWrap}>
            <EntryPanorama className={styles.panorama} />
          </div>
        </div>
      </section>

      <section
        ref={indexRef}
        className={styles.index}
        tabIndex={-1}
        aria-label="Homepage index"
      >
        <div className={styles.intro}>
          <div>
            <p className={styles.smallLabel}>Index</p>
            <p className={styles.note}>{copy.note}</p>
          </div>
          <HomeIllustrationVignette className={styles.vignette} kind="systems" />
        </div>

        <div className={styles.linksGrid} aria-label="Primary links">
          {primaryLinks.map((link) => (
            <Link className={styles.linkCard} href={link.href} key={link.href}>
              <p className={styles.linkEyebrow}>{link.eyebrow}</p>
              <h2 className={styles.linkTitle}>{link.label}</h2>
              <p className={styles.linkBody}>{link.description}</p>
            </Link>
          ))}
        </div>

        {latestWriting ? (
          <section className={styles.latest} aria-labelledby="latest-writing">
            <Link className={styles.latestLink} href={latestWriting.href}>
              <p className={styles.smallLabel} id="latest-writing">
                {copy.latestLabel}
              </p>
              <h2 className={styles.latestTitle}>{latestWriting.title}</h2>
              <p className={styles.note}>{latestWriting.summary}</p>
              <p className={styles.latestMeta}>{latestWriting.meta}</p>
            </Link>
            <HomeIllustrationVignette className={styles.vignette} kind="writing" />
          </section>
        ) : null}

        <section className={styles.secondary} aria-labelledby="secondary-links">
          <p className={styles.smallLabel} id="secondary-links">
            {copy.secondaryLabel}
          </p>
          <div className={styles.secondaryList}>
            {secondaryLinks.map((link) => (
              <Link className={styles.secondaryLink} href={link.href} key={link.href}>
                <span className={styles.linkEyebrow}>{link.eyebrow}</span>
                <span className={styles.linkTitle}>{link.label}</span>
                <span className={styles.secondaryDescription}>{link.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <span>Robert Williams</span>
          <span>Systems, capital, technology</span>
        </footer>
      </section>
    </main>
  );
}
