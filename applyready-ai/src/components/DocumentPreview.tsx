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

  // Group into sections (title + content) so the Europass-style theme can lay them out in two columns.
  const sections: { title?: string; blocks: Block[] }[] = [{ blocks: [] }];
  for (const block of body) {
    if (block.kind === "heading") sections.push({ title: block.text, blocks: [] });
    else sections[sections.length - 1].blocks.push(block);
  }

  const renderBlocks = (list: Block[]) => {
    const items: React.ReactNode[] = [];
    let bullets: string[] = [];
    const flush = () => {
      if (bullets.length) items.push(<ul key={`ul${items.length}`}>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
      bullets = [];
    };
    list.forEach((block, i) => {
      if (block.kind === "bullet") return void bullets.push(block.text);
      flush();
      if (block.kind === "paragraph") items.push(<p key={i}>{block.text}</p>);
      else items.push(<div key={i} className="doc-spacer" aria-hidden="true" />);
    });
    flush();
    return items;
  };

  return (
    <article className={`doc doc-${theme}`}>
      {name?.kind === "name" && (
        <header className="doc-header">
          <div className="doc-name">{name.text}</div>
          {contacts.map((c, i) => c.kind === "contact" && <div key={i} className="doc-contact">{c.text}</div>)}
        </header>
      )}
      <div className="doc-body">
        {sections.map((section, i) => section.title === undefined
          ? section.blocks.length > 0 && <div key={i} className="doc-intro">{renderBlocks(section.blocks)}</div>
          : (
            <section key={i} className="doc-section">
              <h4>{section.title}</h4>
              <div className="doc-section-body">{renderBlocks(section.blocks)}</div>
            </section>
          ))}
      </div>
    </article>
  );
}
