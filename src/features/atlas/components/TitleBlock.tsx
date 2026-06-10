interface TitleBlockField {
  label: string;
  value: string;
}

/**
 * Engineering-drawing title block: a thin-ruled box of PROJECT / SHEET /
 * DATE / SCALE-style fields set in Plex Mono. Used by the masthead and the
 * site colophon (DESIGN.md §Typography, title block motif).
 */
export function TitleBlock({ fields }: { fields: TitleBlockField[] }) {
  return (
    <dl className="title-block">
      {fields.map((field) => (
        <div className="title-block__field" key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
