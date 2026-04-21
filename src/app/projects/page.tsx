import type { Metadata } from "next";
import Link from "next/link";
import SectionShell from "@/components/SectionShell";

const projectRooms = [
  {
    title: "Global Monitor",
    status: "Live",
    body: "The map-first monitoring room for live events, market signals, and operational context.",
    href: "/monitor",
  },
  {
    title: "Writings Archive",
    status: "Filed",
    body: "A chronological system for essays, dispatches, and notebooks that need durable sequencing.",
    href: "/writings",
  },
  {
    title: "Site Architecture",
    status: "Building",
    body: "The home page is shifting from one long panel into a directory of rooms that can keep growing.",
  },
];

export const metadata: Metadata = {
  title: "Projects | Robert Williams",
  description: "A build log for active systems and site-level experiments.",
};

export default function ProjectsPage() {
  return (
    <SectionShell
      eyebrow="Projects"
      title="Build log and active rooms"
      lede="Projects here are treated as systems in progress. Some are live, some are structural, and some are just beginning to take shape."
      currentHref="/projects"
    >
      <section className="surface-panel">
        <p className="panel-label">Current rooms</p>

        <div className="mini-grid">
          {projectRooms.map((project) =>
            project.href ? (
              <Link className="info-card info-card--link" href={project.href} key={project.title}>
                <p className="info-card__eyebrow">{project.status}</p>
                <h2 className="info-card__title">{project.title}</h2>
                <p className="info-card__body">{project.body}</p>
              </Link>
            ) : (
              <article className="info-card" key={project.title}>
                <p className="info-card__eyebrow">{project.status}</p>
                <h2 className="info-card__title">{project.title}</h2>
                <p className="info-card__body">{project.body}</p>
              </article>
            )
          )}
        </div>
      </section>
    </SectionShell>
  );
}
