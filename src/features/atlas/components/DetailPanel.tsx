"use client";

// Site detail, styled as a drafting card with the figure-caption convention.
// Desktop: card over the map's right edge. Mobile: bottom sheet.

import type { Site } from "../types";

const STATUS_LABELS: Record<Site["status"], string> = {
  operational: "Operational",
  construction: "Under construction",
  planned: "Planned",
};

const BLOC_LABELS: Record<Site["jurisdiction_bloc"], string> = {
  us: "United States",
  allied: "U.S.-allied",
  china: "China",
  neutral: "Neutral",
};

export default function DetailPanel({
  site,
  onClose,
}: {
  site: Site;
  onClose: () => void;
}) {
  const place = [site.city, site.country].filter(Boolean).join(", ");
  return (
    <aside className="atlas-detail" aria-label={`Details for ${site.name}`}>
      <header className="atlas-detail__header">
        <div>
          <span className="atlas-mono atlas-detail__kicker">
            {site.layer} · {site.sub_type}
          </span>
          <h3 className="atlas-detail__name">{site.name}</h3>
          <p className="atlas-detail__operator">
            {site.operator}
            {site.status !== "operational" && (
              <span
                className={`atlas-mono atlas-detail__status atlas-detail__status--${site.status}`}
              >
                {STATUS_LABELS[site.status]}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="atlas-mono atlas-detail__close"
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>
      </header>

      <p className="atlas-detail__why">{site.why_it_matters}</p>

      <dl className="atlas-detail__facts">
        {site.chokepoint_severity !== "na" && (
          <Fact label="Chokepoint">
            <span
              className={
                site.chokepoint_severity === "monopoly"
                  ? "atlas-detail__monopoly"
                  : undefined
              }
            >
              {site.chokepoint_severity}
            </span>
          </Fact>
        )}
        <Fact label="Bloc">{BLOC_LABELS[site.jurisdiction_bloc]}</Fact>
        {typeof site.capex_usd_b === "number" && (
          <Fact label="Capex">${formatCapex(site.capex_usd_b)}B</Fact>
        )}
        {typeof site.year_online === "number" && (
          <Fact label="Online">{String(site.year_online)}</Fact>
        )}
        {site.key_customers && site.key_customers.length > 0 && (
          <Fact label="Customers">{site.key_customers.join(", ")}</Fact>
        )}
      </dl>

      {site.sources && site.sources.length > 0 && (
        <p className="atlas-mono atlas-detail__sources">
          {site.sources.slice(0, 3).map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              Source {i + 1}
            </a>
          ))}
        </p>
      )}

      <p className="atlas-detail__caption atlas-annotation">
        Fig. — {site.name}
        {place ? `, ${place}` : ""}.
      </p>
    </aside>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="atlas-detail__fact">
      <dt className="atlas-mono">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function formatCapex(b: number): string {
  return b >= 10 ? b.toFixed(0) : b.toFixed(1);
}
