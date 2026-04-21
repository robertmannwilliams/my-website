import type { Metadata } from "next";
import SectionShell from "@/components/SectionShell";

const principles = [
  {
    title: "Distinct rooms",
    body: "The site is moving toward separate sections with clear jobs instead of one page trying to hold everything.",
  },
  {
    title: "Chronology matters",
    body: "Writings are filed as a visible sequence so a reader can follow the evolution of ideas over time.",
  },
  {
    title: "Systems over noise",
    body: "The visual direction stays editorial and structured so the work feels intentional, not like a default template.",
  },
];

export const metadata: Metadata = {
  title: "About | Robert Williams",
  description: "A short note on how this site is organized and why.",
};

export default function AboutPage() {
  return (
    <SectionShell
      eyebrow="About"
      title="Why the site is split into rooms"
      lede="This site is starting to behave more like a directory than a single landing page. Each section can develop its own density, rhythm, and type of material."
      currentHref="/about"
    >
      <section className="surface-panel">
        <p className="panel-label">Operating principles</p>

        <div className="mini-grid">
          {principles.map((principle) => (
            <article className="info-card" key={principle.title}>
              <h2 className="info-card__title">{principle.title}</h2>
              <p className="info-card__body">{principle.body}</p>
            </article>
          ))}
        </div>
      </section>
    </SectionShell>
  );
}
