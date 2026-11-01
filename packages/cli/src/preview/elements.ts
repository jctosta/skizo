import type { Node } from "@skizo/core";
import { CLASSES, cx } from "../classes";
import { initials, lorem } from "../placeholder";
import type { Script } from "./script";

/** What an emitter gets besides its node. Grows with the needs of Element types (icons, ...). */
export type Ctx = {
  render(nodes: Node[]): string;
  /** The node's path: the seed for its placeholder content (see placeholder.ts). */
  path(node: Node): string;
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
  Text: (node, ctx) => {
    const c = CLASSES.Text;
    const classes = cx(c[node.props.size as "sm" | "md" | "lg"], node.props.muted === true && c.muted, node.props.bold === true && c.bold);
    return `<p class="${classes}">${esc(node.label ?? lorem(ctx.path(node), node.props.lorem as number))}</p>`;
  },
  Stat: (node) => {
    const c = CLASSES.Stat;
    const trend = node.props.trend as "none" | "up" | "down";
    const title = node.props.title as string | undefined;
    const hint = [{ none: "", up: "↑", down: "↓" }[trend], node.props.hint].filter(Boolean).join(" ");
    return [
      `<div class="${c.root}">`,
      title !== undefined && `<p class="${c.title}">${esc(title)}</p>`,
      `<div class="${c.value}">${esc(node.label!)}</div>`,
      hint && `<p class="${c[trend]}">${esc(hint)}</p>`,
      `</div>`,
    ]
      .filter(Boolean)
      .join("\n");
  },
  Badge: (node) => {
    const c = CLASSES.Badge;
    return `<span class="${cx(c.root, c[node.props.variant as "default" | "secondary" | "outline" | "destructive"])}">${esc(node.label!)}</span>`;
  },
  Avatar: (node) => {
    const c = CLASSES.Avatar;
    return `<span class="${cx(c.root, c[node.props.size as "sm" | "md" | "lg"])}">${esc(initials(node.label!))}</span>`;
  },
  Image: (node) => {
    const c = CLASSES.Image;
    const alt = esc(node.label!);
    return `<div role="img" aria-label="${alt}" class="${cx(c.root, c[node.props.ratio as "16:9" | "4:3" | "3:2" | "1:1"])}">${alt}</div>`;
  },
  Alert: (node) => {
    const c = CLASSES.Alert;
    const variant = node.props.variant as "default" | "destructive";
    const text = node.props.text as string | undefined;
    return [
      `<div role="alert" class="${cx(c.root, c[variant])}">`,
      `<div class="${c.title}">${esc(node.label!)}</div>`,
      text !== undefined && `<div class="${c.text[variant]}">${esc(text)}</div>`,
      `</div>`,
    ]
      .filter(Boolean)
      .join("\n");
  },
  Progress: (node) => {
    const c = CLASSES.Progress;
    const value = (node.props.value as number | undefined) ?? 0;
    return `<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" class="${c.root}"><div class="${c.indicator}" style="width: ${value}%"></div></div>`;
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
