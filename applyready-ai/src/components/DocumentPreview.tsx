import { parseBlocks, type Block } from "@/lib/blocks";
import type { Theme } from "@/lib/themes";

/** On-screen version of the export layouts; the same blocks feed PDF and DOCX. */
export function DocumentPreview({ text, theme, kind, letterhead }: { text: string; theme: Theme; kind: "cv" | "letter"; letterhead?: Block[] }) {
  const blocks: Block[] = kind === "cv"
    ? parseBlocks(text, { withName: true })
    : [...(letterhead ?? []), ...parseBlocks(text).map((b): Block => (b.kind === "heading" ? { kind: "paragraph", text: b.text } : b))];
  const name = blocks.find((b) => b.kind === "name");
  const contacts = blocks.filter((b) => b.kind === "contact");
  const body = blocks.filter((b) => b.kind !== "name" && b.kind !== "contact");

  const items: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) items.push(<ul key={`ul${items.length}`}>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
    bullets = [];
  };
  body.forEach((block, i) => {
    if (block.kind === "bullet") return void bullets.push(block.text);
    flush();
    if (block.kind === "heading") items.push(<h4 key={i}>{block.text}</h4>);
    else if (block.kind === "paragraph") items.push(<p key={i}>{block.text}</p>);
    else items.push(<div key={i} className="doc-spacer" aria-hidden="true" />);
  });
  flush();

  return (
    <article className={`doc doc-${theme}`}>
      {name?.kind === "name" && (
        <header className="doc-header">
          <div className="doc-name">{name.text}</div>
          {contacts.map((c, i) => c.kind === "contact" && <div key={i} className="doc-contact">{c.text}</div>)}
        </header>
      )}
      <div className="doc-body">{items}</div>
    </article>
  );
}
