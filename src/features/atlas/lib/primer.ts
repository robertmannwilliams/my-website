// Build-time renderer for the Deep Dive page (content/primer.md). Server-side
// only. Headings get GitHub-style ids so the document's own table of contents
// anchors keep working.

import fs from "node:fs";
import path from "node:path";
import { marked, type Tokens } from "marked";

const PRIMER_FILE = path.join(process.cwd(), "content", "primer.md");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

let cache: string | null = null;

export function renderPrimer(): string {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const source = fs.readFileSync(PRIMER_FILE, "utf8");
  marked.use({
    renderer: {
      heading({ tokens, depth }: Tokens.Heading): string {
        const text = this.parser.parseInline(tokens);
        const plain = tokens
          .map((t) => ("text" in t ? (t as { text: string }).text : ""))
          .join("");
        return `<h${depth} id="${slugify(plain)}">${text}</h${depth}>`;
      },
    },
  });
  cache = marked.parse(source, { async: false });
  return cache;
}
