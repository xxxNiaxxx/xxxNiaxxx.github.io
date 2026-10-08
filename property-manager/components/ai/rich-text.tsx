import { Fragment } from "react";

/** Renders the assistant's light markdown (**bold**, _italic_, line breaks) without injecting HTML. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i, lines) => (
        <Fragment key={i}>
          {line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
            ) : part.startsWith("_") && part.endsWith("_") && part.length > 2 ? (
              <em key={j} className="text-muted-foreground">{part.slice(1, -1)}</em>
            ) : (
              <Fragment key={j}>{part}</Fragment>
            ),
          )}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}
