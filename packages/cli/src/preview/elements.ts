import type { Node } from "@skizo/core";
import { CLASSES, cx } from "../classes";
import { tableRows } from "../placeholder";

/** What an emitter gets besides its node. Grows with the needs of Element types (node path, icons, ...). */
export type Ctx = {
  render(nodes: Node[]): string;
  /** Node path of the Element being emitted, `<screen id>/<child index>/...`: the seed for placeholder content. */
  path: string;
};
export type Emit = (node: Node, ctx: Ctx) => string;

/** HTML-escapes text and attribute values. */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The Preview Backend: one emitter per Element type, returning HTML.
 * Props arrive checked, coerced and with enum defaults filled in.
 */
export const EMITTERS: Record<string, Emit> = {
  Screen: (node, ctx) => {
    const c = CLASSES.Screen;
    const subtitle = node.props.subtitle as string | undefined;
    return [
      `<section data-screen="${esc(node.props.id as string)}" class="${c.root}">`,
      `<header class="${c.header}">`,
      `<h1 class="${c.title}">${esc(node.label!)}</h1>`,
      subtitle !== undefined && `<p class="${c.subtitle}">${esc(subtitle)}</p>`,
      `</header>`,
      `<div class="${c.body}">`,
      ctx.render(node.children),
      `</div>`,
      `</section>`,
    ]
      .filter(Boolean)
      .join("\n");
  },
  Heading: (node) => {
    const level = node.props.level as keyof typeof CLASSES.Heading;
    return `<h${level} class="${CLASSES.Heading[level]}">${esc(node.label!)}</h${level}>`;
  },
  Text: (node) => {
    const c = CLASSES.Text;
    const classes = cx(c[node.props.size as "sm" | "md" | "lg"], node.props.muted === true && c.muted, node.props.bold === true && c.bold);
    return `<p class="${classes}">${esc(node.label!)}</p>`;
  },
  Table: (node, ctx) => {
    const c = CLASSES.Table;
    const row = (tag: "th" | "td", cells: string[]) =>
      `<tr class="${c.row}">${cells.map((s) => `<${tag} class="${tag === "th" ? c.head : c.cell}">${esc(s)}</${tag}>`).join("")}</tr>`;
    return [
      `<div class="${c.container}">`,
      `<table class="${c.table}">`,
      `<thead class="${c.header}">`,
      row("th", node.props.cols as string[]),
      "</thead>",
      `<tbody class="${c.body}">`,
      ...tableRows(node, ctx.path).map((cells) => row("td", cells)),
      "</tbody>",
      "</table>",
      "</div>",
    ].join("\n");
  },
};
