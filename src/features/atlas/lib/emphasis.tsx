// Chapter copy is plain prose except for sparse *emphasis* spans.
// Shared by the server-rendered scaffold and the client story engine.

export function withEmphasis(text: string): React.ReactNode {
  const parts = text.split(/\*([^*]+)\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (i % 2 === 1 ? <em key={i}>{part}</em> : part));
}
