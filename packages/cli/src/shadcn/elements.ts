import { slugify, type Node } from "@skizo/core";
import { CLASSES, cx, flexClasses, gridClasses } from "../classes";
import { initials, listItems, lorem, tableRows } from "../placeholder";

/** What an emitter gets besides its node. Grows with the needs of Element types (icons, ...). */
export type Ctx = {
  render(nodes: Node[]): string;
  /** Adds named imports to the Screen's file, e.g. `ctx.use("@/components/ui/card", "Card", "CardHeader")`. */
  use(from: string, ...names: string[]): void;
  /** Node path of the Element being emitted, `<screen id>/<child index>/...`: the seed for placeholder content. */
  path: string;
};
export type Emit = (node: Node, ctx: Ctx) => string;

/** Text as JSX children: verbatim, or as a string expression when it holds characters JSX reads as markup. */
export const text = (s: string) => (/[{}<>&]/.test(s) ? `{${JSON.stringify(s)}}` : s);

/** A string as a JSX attribute value: quoted, or a string expression when it holds `"` or `&`. */
export const attr = (s: string) => (/["&]/.test(s) ? `{${JSON.stringify(s)}}` : `"${s}"`);

/** Joins the present lines. */
export const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n");

/** `open`, then `body` indented two spaces, then `close`; one line when `body` is empty. */
export const wrap = (open: string, body: string, close: string) =>
  body ? `${open}\n${body.replace(/^/gm, "  ")}\n${close}` : `${open}${close}`;

/**
 * The shadcn Export target: one emitter per Element type, returning TSX.
 * Props arrive checked, coerced and with enum defaults filled in.
 */
export const EMITTERS: Record<string, Emit> = {
  Screen: (node, ctx) => {
    const c = CLASSES.Screen;
    const subtitle = node.props.subtitle as string | undefined;
    const actions = node.slots?.actions;
    const header = lines(
      `<h1 className="${c.title}">${text(node.label!)}</h1>`,
      subtitle !== undefined && `<p className="${c.subtitle}">${text(subtitle)}</p>`,
      actions && wrap(`<div className="${c.actions}">`, ctx.render(actions), "</div>"),
    );
    return wrap(
      `<main className="${c.root}">`,
      lines(
        wrap(`<header className="${cx(c.header, actions && c.headerWithActions)}">`, header, "</header>"),
        wrap(`<div className="${c.body}">`, ctx.render(node.children), "</div>"),
      ),
      "</main>",
    );
  },
  Heading: (node) => {
    const level = node.props.level as keyof typeof CLASSES.Heading;
    return `<h${level} className="${CLASSES.Heading[level]}">${text(node.label!)}</h${level}>`;
  },
  Text: (node, ctx) => {
    const c = CLASSES.Text;
    const classes = cx(c[node.props.size as "sm" | "md" | "lg"], node.props.muted === true && c.muted, node.props.bold === true && c.bold);
    return `<p className="${classes}">${text(node.label ?? lorem(ctx.path, node.props.lorem as number))}</p>`;
  },
  // No shadcn Stat: plain markup (title, value, hint).
  Stat: (node) => {
    const c = CLASSES.Stat;
    const trend = node.props.trend as "none" | "up" | "down";
    const title = node.props.title as string | undefined;
    const hint = [{ none: "", up: "↑", down: "↓" }[trend], node.props.hint].filter(Boolean).join(" ");
    return wrap(
      `<div className="${c.root}">`,
      lines(
        title !== undefined && `<p className="${c.title}">${text(title)}</p>`,
        `<div className="${c.value}">${text(node.label!)}</div>`,
        hint && `<p className="${c[trend]}">${text(hint)}</p>`,
      ),
      "</div>",
    );
  },
  Badge: (node, ctx) => {
    ctx.use("@/components/ui/badge", "Badge");
    const variant = node.props.variant === "default" ? "" : ` variant="${node.props.variant}"`;
    return `<Badge${variant}>${text(node.label!)}</Badge>`;
  },
  Avatar: (node, ctx) => {
    ctx.use("@/components/ui/avatar", "Avatar", "AvatarFallback");
    const size = node.props.size === "md" ? "" : ` size="${node.props.size}"`;
    // Only the initials show, so the full name is the accessible name.
    return wrap(
      `<Avatar${size} role="img" aria-label=${attr(node.label!)}>`,
      `<AvatarFallback>${text(initials(node.label!))}</AvatarFallback>`,
      "</Avatar>",
    );
  },
  // No shadcn Image: a placeholder box to swap for an <img>.
  Image: (node) => {
    const c = CLASSES.Image;
    const classes = cx(c.root, c[node.props.ratio as "16:9" | "4:3" | "3:2" | "1:1"]);
    return `<div role="img" aria-label=${attr(node.label!)} className="${classes}">${text(node.label!)}</div>`;
  },
  Alert: (node, ctx) => {
    const description = node.props.text as string | undefined;
    ctx.use("@/components/ui/alert", "Alert", "AlertTitle", ...(description === undefined ? [] : ["AlertDescription"]));
    const variant = node.props.variant === "default" ? "" : ` variant="${node.props.variant}"`;
    return wrap(
      `<Alert${variant}>`,
      lines(
        `<AlertTitle>${text(node.label!)}</AlertTitle>`,
        description !== undefined && `<AlertDescription>${text(description)}</AlertDescription>`,
      ),
      "</Alert>",
    );
  },
  Progress: (node, ctx) => {
    ctx.use("@/components/ui/progress", "Progress");
    return `<Progress${node.props.value === undefined ? "" : ` value={${node.props.value}}`} />`;
  },
  Stack: (node, ctx) => wrap(`<div className="${flexClasses(node)}">`, ctx.render(node.children), "</div>"),
  Row: (node, ctx) => wrap(`<div className="${flexClasses(node)}">`, ctx.render(node.children), "</div>"),
  Grid: (node, ctx) => wrap(`<div className="${gridClasses(node)}">`, ctx.render(node.children), "</div>"),
  Separator: (_node, ctx) => {
    ctx.use("@/components/ui/separator", "Separator");
    return "<Separator />";
  },
  Card: (node, ctx) => {
    const c = CLASSES.Card;
    /** Imports a Card part and returns its name, so each part is imported only when emitted. */
    const ui = (name: string) => (ctx.use("@/components/ui/card", name), name);
    const desc = node.props.desc as string | undefined;
    const { actions, footer } = node.slots ?? {};
    const span = c.span[node.props.span as keyof typeof c.span];
    const header = lines(
      node.label !== undefined && `<${ui("CardTitle")}>${text(node.label)}</CardTitle>`,
      desc !== undefined && `<${ui("CardDescription")}>${text(desc)}</CardDescription>`,
      actions && wrap(`<${ui("CardAction")} className="${c.actions}">`, ctx.render(actions), "</CardAction>"),
    );
    return wrap(
      `<${ui("Card")}${span ? ` className="${span}"` : ""}>`,
      lines(
        header && wrap(`<${ui("CardHeader")}>`, header, "</CardHeader>"),
        node.children.length > 0 && wrap(`<${ui("CardContent")}>`, ctx.render(node.children), "</CardContent>"),
        footer && wrap(`<${ui("CardFooter")} className="${c.footerItems}">`, ctx.render(footer), "</CardFooter>"),
      ),
      "</Card>",
    );
  },
  Table: (node, ctx) => {
    ctx.use("@/components/ui/table", "Table", "TableBody", "TableCell", "TableHead", "TableHeader", "TableRow");
    const row = (tag: "TableHead" | "TableCell", cells: string[]) =>
      wrap("<TableRow>", lines(...cells.map((s) => `<${tag}>${text(s)}</${tag}>`)), "</TableRow>");
    return wrap(
      "<Table>",
      lines(
        wrap("<TableHeader>", row("TableHead", node.props.cols as string[]), "</TableHeader>"),
        wrap("<TableBody>", lines(...tableRows(node, ctx.path).map((cells) => row("TableCell", cells))), "</TableBody>"),
      ),
      "</Table>",
    );
  },
  List: (node) => wrap(`<ul className="${CLASSES.List.root}">`, lines(...listItems(node).map((item) => `<li>${text(item)}</li>`)), "</ul>"),
  /** Renders its Tabs too: each value pairs a TabsTrigger with its TabsContent. */
  Tabs: (node, ctx) => {
    ctx.use("@/components/ui/tabs", "Tabs", "TabsContent", "TabsList", "TabsTrigger");
    const tabs = node.children;
    // Slugged Labels read as hand-written; fall back to tab-1, tab-2, ... when they are empty or collide.
    const slugs = tabs.map((tab) => slugify(tab.label!));
    const values = slugs.every(Boolean) && new Set(slugs).size === slugs.length ? slugs : slugs.map((_, i) => `tab-${i + 1}`);
    const active = values[tabs.findIndex((tab) => tab.props.active === true)];
    const triggers = tabs.map((tab, i) => `<TabsTrigger value="${values[i]}">${text(tab.label!)}</TabsTrigger>`);
    return wrap(
      `<Tabs${active === undefined ? "" : ` defaultValue="${active}"`}>`,
      lines(
        wrap("<TabsList>", lines(...triggers), "</TabsList>"),
        ...tabs.map((tab, i) =>
          wrap(`<TabsContent value="${values[i]}" className="${CLASSES.Tabs.panel}">`, ctx.render(tab.children), "</TabsContent>"),
        ),
      ),
      "</Tabs>",
    );
  },
};
