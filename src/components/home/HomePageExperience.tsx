"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { HomeLink } from "@/content/homepage";
import EntryPanorama from "@/components/home/EntryPanorama";
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
  const directoryLinks = [
    ...(latestWriting
      ? [
          {
            href: latestWriting.href,
            label: latestWriting.title,
            eyebrow: copy.latestLabel,
            description: latestWriting.summary,
          },
        ]
      : []),
    ...primaryLinks,
    ...secondaryLinks,
  ];

  function handleEnter() {
    setEntered(true);

    window.requestAnimationFrame(() => {
      indexRef.current?.focus({ preventScroll: true });
    });
  }

  return (
    <main className={`${styles.home} ${entered ? styles.entered : styles.landing}`}>
      <section
        className={styles.threshold}
        aria-hidden={entered}
        aria-label="Homepage threshold"
      >
        <div className={styles.thresholdStage}>
          <h1 className={styles.srOnly}>Robert Williams</h1>
          <EntryPanorama className={styles.panorama} />
          <button className={styles.enterButton} type="button" onClick={handleEnter}>
            {copy.entryCue}
          </button>
        </div>
      </section>

      <section
        ref={indexRef}
        className={styles.index}
        tabIndex={-1}
        aria-hidden={!entered}
        inert={!entered}
        aria-label="Homepage index"
      >
        <div className={styles.mainGrid}>
          <section className={styles.mainIntro} aria-labelledby="homepage-main-title">
            <p className={styles.smallLabel}>Robert Williams</p>
            <h2 className={styles.mainTitle} id="homepage-main-title">
              Systems, capital, technology.
            </h2>
            <p className={styles.note}>{copy.note}</p>
          </section>

          <nav className={styles.directoryList} aria-label="Homepage links">
            {directoryLinks.map((link) => (
              <Link className={styles.directoryLink} href={link.href} key={link.href}>
                <span className={styles.linkEyebrow}>{link.eyebrow}</span>
                <span className={styles.linkTitle}>{link.label}</span>
                <span className={styles.linkBody}>{link.description}</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
