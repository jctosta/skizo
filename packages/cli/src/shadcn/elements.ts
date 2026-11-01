import { slugify, type Node } from "@skizo/core";
import { CLASSES, cx, flexClasses, gridClasses } from "../classes";
import { iconComponent } from "../icons";
import { initials, listItems, lorem, tableRows } from "../placeholder";

/** What an emitter gets besides its node. Grows with the needs of Element types (icons, ...). */
export type Ctx = {
  render(nodes: Node[]): string;
  /** Adds named imports to the Screen's file, e.g. `ctx.use("@/components/ui/card", "Card", "CardHeader")`. */
  use(from: string, ...names: string[]): void;
  /** Node path of the Element being emitted, `<screen id>/<child index>/...`: the seed for placeholder content. */
  path: string;
  /** `base`, or `base-2`, `base-3`... when the Screen's file already uses it: DOM ids for form controls. */
  id(base: string): string;
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

/** JSX attributes from name → value: strings through `attr`, numbers in braces, true bare; undefined and false skipped. */
export const jsxAttrs = (pairs: Record<string, unknown>) =>
  Object.entries(pairs)
    .map(([name, v]) =>
      v === undefined || v === false ? "" : v === true ? ` ${name}` : typeof v === "number" ? ` ${name}={${v}}` : ` ${name}=${attr(String(v))}`,
    )
    .join("");

/** A form control under its Label, with error text below. `id` ties the Label to the control. */
const field = (node: Node, ctx: Ctx, id: string, control: string, error?: unknown) => {
  ctx.use("@/components/ui/label", "Label");
  return wrap(
    `<div className="${CLASSES.Field.root}">`,
    lines(
      `<Label${jsxAttrs({ htmlFor: id })}>${text(node.label!)}</Label>`,
      control,
      typeof error === "string" && `<p className="${CLASSES.Field.error}">${text(error)}</p>`,
    ),
    "</div>",
  );
};

/** A small control (Checkbox, Switch, RadioGroupItem) with its Label beside it. */
const choice = (ctx: Ctx, id: string, label: string, control: string) => {
  ctx.use("@/components/ui/label", "Label");
  return wrap(`<div className="${CLASSES.Field.choice}">`, lines(control, `<Label${jsxAttrs({ htmlFor: id })}>${text(label)}</Label>`), "</div>");
};

/** A readable DOM id for a form control: its `id=`, else a slug of its Label. */
const fieldId = (node: Node, ctx: Ctx) => ctx.id(typeof node.props.id === "string" ? node.props.id : slugify(node.label!) || "field");

/** `<HouseIcon />` for `icon=home`, importing it from lucide-react. */
export const icon = (ctx: Ctx, name: string, className?: string) => {
  const component = iconComponent(name);
  ctx.use("lucide-react", component);
  return `<${component}${className ? ` className="${className}"` : ""} />`;
};

/** Where `to=` goes: the Screen's route. A plain path, so swapping in a router's link component is left to the user. */
const screenHref = (id: string) => `/${id}`;

/** Skizo `size` → shadcn Button `size`, for text Buttons and for icon-only ones. md is shadcn's default. */
const BUTTON_SIZE = { sm: "sm", md: undefined, lg: "lg" } as const;
const ICON_BUTTON_SIZE = { sm: "icon-sm", md: "icon", lg: "icon-lg" } as const;

/**
 * The shadcn Export target: one emitter per Element type, returning TSX.
 * Props arrive checked, coerced and with enum defaults filled in.
 */
export const EMITTERS: Record<string, Emit> = {
  /** With a Sidebar first: a page shell, the sidebar column beside <main>. */
  Screen: (node, ctx) => {
    const c = CLASSES.Screen;
    const subtitle = node.props.subtitle as string | undefined;
    const actions = node.slots?.actions;
    const sidebar = node.children[0]?.type === "Sidebar" ? node.children[0] : undefined;
    const header = lines(
      `<h1 className="${c.title}">${text(node.label!)}</h1>`,
      subtitle !== undefined && `<p className="${c.subtitle}">${text(subtitle)}</p>`,
      actions && wrap(`<div className="${c.actions}">`, ctx.render(actions), "</div>"),
    );
    const main = wrap(
      `<main className="${sidebar ? c.main : c.root}">`,
      lines(
        wrap(`<header className="${cx(c.header, actions && c.headerWithActions)}">`, header, "</header>"),
        wrap(`<div className="${c.body}">`, ctx.render(sidebar ? node.children.slice(1) : node.children), "</div>"),
      ),
      "</main>",
    );
    return sidebar ? wrap(`<div className="${c.shell}">`, lines(ctx.render([sidebar]), main), "</div>") : main;
  },
  Sidebar: (node, ctx) => {
    const c = CLASSES.Sidebar;
    return wrap(`<aside className="${c.root}">`, wrap(`<nav className="${c.nav}">`, ctx.render(node.children), "</nav>"), "</aside>");
  },
  /** A plain anchor, like every to=; a Link without to= goes nowhere yet: no href. */
  Link: (node, ctx) => {
    const { to, active } = node.props as { to?: string; active?: true };
    const href = to === undefined ? undefined : screenHref(to);
    const open = `<a${jsxAttrs({ href, "aria-current": active && "page" })} className="${CLASSES.Link.root}">`;
    if (node.props.icon === undefined) return `${open}${text(node.label!)}</a>`;
    return wrap(open, lines(icon(ctx, node.props.icon as string, CLASSES.Link.icon), text(node.label!)), "</a>");
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
  Button: (node, ctx) => {
    const c = CLASSES.Button;
    const { variant, size } = node.props as { variant: string; size: "sm" | "md" | "lg" };
    const iconOnly = node.props["icon-only"] === true;
    const loading = node.props.loading === true;
    const shadcnSize = (iconOnly ? ICON_BUTTON_SIZE : BUTTON_SIZE)[size];
    const disabled = node.props.disabled === true || loading;
    const to = node.props.to as string | undefined;
    const open = `<Button${jsxAttrs({ variant: variant !== "default" && variant, size: shadcnSize, disabled, asChild: to !== undefined })}>`;
    ctx.use("@/components/ui/button", "Button");
    const glyph = loading ? icon(ctx, "loader-circle", c.spinner) : node.props.icon !== undefined && icon(ctx, node.props.icon as string);
    const label = iconOnly ? `<span className="${c.hiddenLabel}">${text(node.label!)}</span>` : text(node.label!);
    const content = glyph ? lines(glyph, label) : label;
    // to=: the Button renders a plain anchor (asChild), like a Link.
    if (to !== undefined) {
      const anchor = `<a href=${attr(screenHref(to))}>`;
      return wrap(open, glyph ? wrap(anchor, content, "</a>") : `${anchor}${content}</a>`, "</Button>");
    }
    return glyph ? wrap(open, content, "</Button>") : `${open}${content}</Button>`;
  },
  Input: (node, ctx) => {
    const { type, placeholder, value, disabled, error } = node.props;
    const id = fieldId(node, ctx);
    ctx.use("@/components/ui/input", "Input");
    const a = jsxAttrs({ id, type, placeholder, defaultValue: value, disabled, "aria-invalid": error !== undefined });
    return field(node, ctx, id, `<Input${a} />`, error);
  },
  Textarea: (node, ctx) => {
    const { placeholder, value, rows } = node.props;
    const id = fieldId(node, ctx);
    ctx.use("@/components/ui/textarea", "Textarea");
    return field(node, ctx, id, `<Textarea${jsxAttrs({ id, placeholder, defaultValue: value, rows })} />`);
  },
  Select: (node, ctx) => {
    const { value, placeholder, open } = node.props;
    const id = fieldId(node, ctx);
    ctx.use("@/components/ui/select", "Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue");
    const items = ((node.props.options ?? []) as string[]).map(
      (option) => `<SelectItem${jsxAttrs({ value: option })}>${text(option)}</SelectItem>`,
    );
    const select = wrap(
      `<Select${jsxAttrs({ defaultValue: value, defaultOpen: open })}>`,
      lines(
        wrap(`<SelectTrigger${jsxAttrs({ id })}>`, `<SelectValue${jsxAttrs({ placeholder })} />`, "</SelectTrigger>"),
        wrap("<SelectContent>", lines(...items), "</SelectContent>"),
      ),
      "</Select>",
    );
    return field(node, ctx, id, select);
  },
  Checkbox: (node, ctx) => {
    const id = fieldId(node, ctx);
    ctx.use("@/components/ui/checkbox", "Checkbox");
    const { checked, disabled } = node.props;
    return choice(ctx, id, node.label!, `<Checkbox${jsxAttrs({ id, defaultChecked: checked, disabled })} />`);
  },
  Switch: (node, ctx) => {
    const id = fieldId(node, ctx);
    ctx.use("@/components/ui/switch", "Switch");
    const { checked, disabled } = node.props;
    return choice(ctx, id, node.label!, `<Switch${jsxAttrs({ id, defaultChecked: checked, disabled })} />`);
  },
  Radio: (node, ctx) => {
    const group = fieldId(node, ctx);
    ctx.use("@/components/ui/label", "Label");
    ctx.use("@/components/ui/radio-group", "RadioGroup", "RadioGroupItem");
    const items = ((node.props.options ?? []) as string[]).map((option) => {
      const id = ctx.id(`${group}-${slugify(option) || "option"}`);
      return choice(ctx, id, option, `<RadioGroupItem${jsxAttrs({ value: option, id })} />`);
    });
    const radios = wrap(`<RadioGroup${jsxAttrs({ "aria-labelledby": group, defaultValue: node.props.value })}>`, lines(...items), "</RadioGroup>");
    return wrap(`<div className="${CLASSES.Field.root}">`, lines(`<Label${jsxAttrs({ id: group })}>${text(node.label!)}</Label>`, radios), "</div>");
  },
};
