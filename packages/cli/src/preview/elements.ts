import type { Node } from "@skizo/core";
import { CLASSES, cx } from "../classes";
import type { Script } from "./script";

/** What an emitter gets besides its node. Grows with the needs of Element types (node path, icons, ...). */
export type Ctx = {
  render(nodes: Node[]): string;
  /** Adds one of the SCRIPTS handlers to the page. */
  script(name: Script): void;
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
  /** Renders its Tabs too: triggers and panels pair up by position. */
  Tabs: (node, ctx) => {
    const c = CLASSES.Tabs;
    ctx.script("tabs");
    const active = (tab: Node) => tab.props.active === true;
    return [
      `<div class="${c.root}">`,
      `<div role="tablist" class="${c.list}">`,
      ...node.children.map(
        (tab) => `<button type="button" role="tab" aria-selected="${active(tab)}" class="${c.trigger}">${esc(tab.label!)}</button>`,
      ),
      `</div>`,
      ...node.children.map((tab) =>
        [`<div role="tabpanel" class="${c.panel}"${active(tab) ? "" : " hidden"}>`, ctx.render(tab.children), `</div>`]
          .filter(Boolean)
          .join("\n"),
      ),
      `</div>`,
    ].join("\n");
  },
};
