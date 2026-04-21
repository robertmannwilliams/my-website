import type { ReactNode } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { directorySections } from "@/content/site-sections";

interface SectionShellProps {
  eyebrow: string;
  title: string;
  lede: string;
  currentHref: string;
  children: ReactNode;
}

export default function SectionShell({
  eyebrow,
  title,
  lede,
  currentHref,
  children,
}: SectionShellProps) {
  return (
    <div className="section-shell">
      <ThemeToggle />

      <header className="section-shell__header">
        <Link className="section-shell__brand" href="/">
          <span className="section-shell__brand-name">Robert Williams</span>
          <span className="section-shell__brand-tag">Index</span>
        </Link>

        <nav aria-label="Section navigation" className="section-shell__nav">
          {directorySections.map((section) => (
            <Link
              key={section.href}
              className={`section-shell__nav-link${
                section.href === currentHref
                  ? " section-shell__nav-link--active"
                  : ""
              }`}
              href={section.href}
            >
              {section.title}
            </Link>
          ))}
        </nav>
      </header>

      <main className="section-shell__main">
        <div className="section-shell__intro">
          <p className="section-shell__eyebrow">{eyebrow}</p>
          <h1 className="section-shell__title">{title}</h1>
          <p className="section-shell__lede">{lede}</p>
        </div>

        {children}
      </main>
    </div>
  );
}
