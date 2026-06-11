"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { HomeLink } from "@/content/homepage";
import HeroPainting from "@/components/hero/HeroPainting";
import styles from "./HomePage.module.css";

interface HomePageExperienceProps {
  copy: {
    entryCue: string;
    intro: string;
    introImage: {
      src: string;
      alt: string;
      width: number;
      height: number;
    };
  };
  projectLinks: HomeLink[];
}

export default function HomePageExperience({
  copy,
  projectLinks,
}: HomePageExperienceProps) {
  const [entered, setEntered] = useState(false);
  const indexRef = useRef<HTMLElement>(null);

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
          <HeroPainting />
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
          <div className={styles.mainColumn}>
            <section className={styles.mainIntro} aria-label="Introductory note">
              <p className={styles.constructionNote}>{copy.intro}</p>
            </section>

            <nav className={styles.projectNav} aria-label="Work in progress projects">
              <ul className={styles.projectList}>
                {projectLinks.map((link) => (
                  <li className={styles.projectItem} key={link.href}>
                    <Link className={styles.projectLink} href={link.href}>
                      {link.label}
                    </Link>
                    <span className={styles.projectStatus}>{link.status}</span>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className={styles.introImageWrap}>
            <Image
              className={styles.introImage}
              src={copy.introImage.src}
              alt={copy.introImage.alt}
              width={copy.introImage.width}
              height={copy.introImage.height}
              sizes="(max-width: 760px) 100vw, 30rem"
              priority
            />
          </div>
        </div>
      </section>
    </main>
  );
}
