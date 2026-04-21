import type { Metadata } from "next";
import Link from "next/link";
import SectionShell from "@/components/SectionShell";
import {
  formatWritingDate,
  getPublishedWritings,
  groupWritingsByYear,
  writingTracks,
} from "@/content/writings";

export const metadata: Metadata = {
  title: "Writings | Robert Williams",
  description:
    "A chronological archive of essays, dispatches, and notebooks.",
};

export default function WritingsPage() {
  const writings = getPublishedWritings();
  const groups = groupWritingsByYear(writings);

  return (
    <SectionShell
      eyebrow="Writings"
      title="Filed as a time series"
      lede="This section is organized chronologically first. Essays, dispatches, and notebooks all land in one dated archive so the sequence stays legible."
      currentHref="/writings"
    >
      <div className="section-grid section-grid--split">
        <section className="surface-panel">
          <p className="panel-label">Filing formats</p>

          <div className="mini-grid">
            {writingTracks.map((track) => (
              <article className="info-card" key={track.label}>
                <p className="info-card__eyebrow">{track.cadence}</p>
                <h2 className="info-card__title">{track.label}</h2>
                <p className="info-card__body">{track.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-panel">
          <p className="panel-label">Archive</p>

          {groups.length === 0 ? (
            <div className="empty-state">
              <h2 className="info-card__title">No entries filed yet</h2>
              <p className="info-card__body">
                The archive scaffolding is in place. New pieces can be added as
                dated entries without changing the page structure.
              </p>
            </div>
          ) : (
            <div className="archive-stack">
              {groups.map((group) => (
                <div className="archive-year" key={group.year}>
                  <div className="archive-year__label">{group.year}</div>

                  <div>
                    {group.entries.map((entry) => (
                      <Link
                        className="archive-entry"
                        href={`/writings/${entry.slug}`}
                        key={entry.slug}
                      >
                        <div className="archive-entry__meta">
                          <span>{formatWritingDate(entry.publishedAt)}</span>
                          <span>{entry.format}</span>
                          {entry.series ? <span>{entry.series}</span> : null}
                          <span>{entry.readTime}</span>
                        </div>
                        <h2 className="archive-entry__title">{entry.title}</h2>
                        <p className="archive-entry__summary">{entry.summary}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </SectionShell>
  );
}
