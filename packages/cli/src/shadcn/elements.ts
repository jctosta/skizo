import type { Node } from "@skizo/core";
import { CLASSES, cx } from "../classes";
import { iconComponent } from "../icons";

/** What an emitter gets besides its node. Grows with the needs of Element types (node path, icons, ...). */
export type Ctx = {
  render(nodes: Node[]): string;
  /** Adds named imports to the Screen's file, e.g. `ctx.use("@/components/ui/card", "Card", "CardHeader")`. */
  use(from: string, ...names: string[]): void;
};
export type Emit = (node: Node, ctx: Ctx) => string;

/** Text as JSX children: verbatim, or as a string expression when it holds characters JSX reads as markup. */
export const text = (s: string) => (/[{}<>&]/.test(s) ? `{${JSON.stringify(s)}}` : s);

/** Joins the present lines. */
export const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n");

/** `open`, then `body` indented two spaces, then `close`; one line when `body` is empty. */
export const wrap = (open: string, body: string, close: string) =>
  body ? `${open}\n${body.replace(/^/gm, "  ")}\n${close}` : `${open}${close}`;

/** `<HouseIcon />` for `icon=home`, importing it from lucide-react. */
export const icon = (ctx: Ctx, name: string, className?: string) => {
  const component = iconComponent(name);
  ctx.use("lucide-react", component);
  return `<${component}${className ? ` className="${className}"` : ""} />`;
};

/** Skizo `size` → shadcn Button `size`, for text Buttons and for icon-only ones. md is shadcn's default. */
const BUTTON_SIZE = { sm: "sm", md: undefined, lg: "lg" } as const;
const ICON_BUTTON_SIZE = { sm: "icon-sm", md: "icon", lg: "icon-lg" } as const;

/**
 * The shadcn Export target: one emitter per Element type, returning TSX.
 * Props arrive checked, coerced and with enum defaults filled in.
 */
export const EMITTERS: Record<string, Emit> = {
  Screen: (node, ctx) => {
    const c = CLASSES.Screen;
    const subtitle = node.props.subtitle as string | undefined;
    const header = lines(
      `<h1 className="${c.title}">${text(node.label!)}</h1>`,
      subtitle !== undefined && `<p className="${c.subtitle}">${text(subtitle)}</p>`,
    );
    return wrap(
      `<main className="${c.root}">`,
      lines(
        wrap(`<header className="${c.header}">`, header, "</header>"),
        wrap(`<div className="${c.body}">`, ctx.render(node.children), "</div>"),
      ),
      "</main>",
    );
  },
  Heading: (node) => {
    const level = node.props.level as keyof typeof CLASSES.Heading;
    return `<h${level} className="${CLASSES.Heading[level]}">${text(node.label!)}</h${level}>`;
  },
  Text: (node) => {
    const c = CLASSES.Text;
    const classes = cx(c[node.props.size as "sm" | "md" | "lg"], node.props.muted === true && c.muted, node.props.bold === true && c.bold);
    return `<p className="${classes}">${text(node.label!)}</p>`;
  },
  Button: (node, ctx) => {
    const c = CLASSES.Button;
    const { variant, size } = node.props as { variant: string; size: "sm" | "md" | "lg" };
    const iconOnly = node.props["icon-only"] === true;
    const loading = node.props.loading === true;
    const shadcnSize = (iconOnly ? ICON_BUTTON_SIZE : BUTTON_SIZE)[size];
    const attrs = [
      variant !== "default" && ` variant="${variant}"`,
      shadcnSize && ` size="${shadcnSize}"`,
      (node.props.disabled === true || loading) && " disabled",
    ];
    const open = `<Button${attrs.filter(Boolean).join("")}>`;
    ctx.use("@/components/ui/button", "Button");
    const glyph = loading ? icon(ctx, "loader-circle", c.spinner) : node.props.icon !== undefined && icon(ctx, node.props.icon as string);
    if (!glyph) return `${open}${text(node.label!)}</Button>`;
    const label = iconOnly ? `<span className="${c.hiddenLabel}">${text(node.label!)}</span>` : text(node.label!);
    return wrap(open, lines(glyph, label), "</Button>");
  },
};
