import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionShell from "@/components/SectionShell";
import {
  formatWritingDate,
  getPublishedWritings,
  getWritingBySlug,
} from "@/content/writings";

interface WritingDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return getPublishedWritings().map((entry) => ({
    slug: entry.slug,
  }));
}

export async function generateMetadata({
  params,
}: WritingDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getWritingBySlug(slug);

  if (!entry) {
    return {
      title: "Writing Not Found | Robert Williams",
    };
  }

  return {
    title: `${entry.title} | Writings | Robert Williams`,
    description: entry.summary,
  };
}

export default async function WritingDetailPage({
  params,
}: WritingDetailPageProps) {
  const { slug } = await params;
  const entry = getWritingBySlug(slug);

  if (!entry) notFound();

  return (
    <SectionShell
      eyebrow="Writings"
      title={entry.title}
      lede={entry.summary}
      currentHref="/writings"
    >
      <article className="surface-panel essay">
        <div className="essay__meta">
          <span>{formatWritingDate(entry.publishedAt, "long")}</span>
          <span>{entry.format}</span>
          {entry.series ? <span>{entry.series}</span> : null}
          <span>{entry.readTime}</span>
        </div>

        {entry.sections.map((section) => (
          <section className="essay__section" key={section.heading}>
            <h2 className="essay__section-title">{section.heading}</h2>

            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
    </SectionShell>
  );
}
