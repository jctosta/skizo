import type { Node } from "@skizo/core";
import { CLASSES, cx, flexClasses, gridClasses } from "../classes";

/** What an emitter gets besides its node. Grows with the needs of Element types (node path, icons, ...). */
export type Ctx = { render(nodes: Node[]): string };
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
  Stack: (node, ctx) => div(flexClasses(node), ctx.render(node.children)),
  Row: (node, ctx) => div(flexClasses(node), ctx.render(node.children)),
  Grid: (node, ctx) => div(gridClasses(node), ctx.render(node.children)),
  Separator: () => `<div role="none" class="${CLASSES.Separator.root}"></div>`,
  Card: (node, ctx) => {
    const c = CLASSES.Card;
    const desc = node.props.desc as string | undefined;
    const { actions, footer } = node.slots ?? {};
    const header = lines(
      node.label !== undefined && `<div class="${c.title}">${esc(node.label)}</div>`,
      desc !== undefined && `<div class="${c.desc}">${esc(desc)}</div>`,
      actions && div(cx(c.action, c.actions), ctx.render(actions)),
    );
    return div(
      c.root,
      lines(
        header && div(cx(c.header, actions && c.headerWithActions), header),
        node.children.length > 0 && div(c.content, ctx.render(node.children)),
        footer && div(cx(c.footer, c.footerItems), ctx.render(footer)),
      ),
    );
  },
};

/** Joins the present lines. */
const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n");

/** A `<div>` holding `body`, which may be empty. */
const div = (classes: string, body: string) => lines(`<div class="${classes}">`, body, "</div>");
