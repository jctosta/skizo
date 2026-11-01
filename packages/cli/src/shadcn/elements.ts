import { slugify, type Node } from "@skizo/core";
import { CLASSES, cx } from "../classes";
import { iconComponent } from "../icons";

/** What an emitter gets besides its node. Grows with the needs of Element types (node path, icons, ...). */
export type Ctx = {
  render(nodes: Node[]): string;
  /** Adds named imports to the Screen's file, e.g. `ctx.use("@/components/ui/card", "Card", "CardHeader")`. */
  use(from: string, ...names: string[]): void;
  /** `base`, or `base-2`, `base-3`... when the Screen's file already uses it: DOM ids for form controls. */
  id(base: string): string;
};
export type Emit = (node: Node, ctx: Ctx) => string;

/** Text as JSX children: verbatim, or as a string expression when it holds characters JSX reads as markup. */
export const text = (s: string) => (/[{}<>&]/.test(s) ? `{${JSON.stringify(s)}}` : s);

/** Joins the present lines. */
export const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n");

/** `open`, then `body` indented two spaces, then `close`; one line when `body` is empty. */
export const wrap = (open: string, body: string, close: string) =>
  body ? `${open}\n${body.replace(/^/gm, "  ")}\n${close}` : `${open}${close}`;

/**
 * JSX attributes from name → value: strings quoted (as an expression when they hold `"` or `&`, which JSX
 * strings can't carry verbatim), numbers in braces, true bare; undefined and false are skipped.
 */
export const jsxAttrs = (pairs: Record<string, unknown>) =>
  Object.entries(pairs)
    .map(([name, v]) =>
      v === undefined || v === false
        ? ""
        : v === true
          ? ` ${name}`
          : typeof v === "number"
            ? ` ${name}={${v}}`
            : /["&]/.test(String(v))
              ? ` ${name}={${JSON.stringify(v)}}`
              : ` ${name}="${v}"`,
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
    const disabled = node.props.disabled === true || loading;
    const open = `<Button${jsxAttrs({ variant: variant !== "default" && variant, size: shadcnSize, disabled })}>`;
    ctx.use("@/components/ui/button", "Button");
    const glyph = loading ? icon(ctx, "loader-circle", c.spinner) : node.props.icon !== undefined && icon(ctx, node.props.icon as string);
    if (!glyph) return `${open}${text(node.label!)}</Button>`;
    const label = iconOnly ? `<span className="${c.hiddenLabel}">${text(node.label!)}</span>` : text(node.label!);
    return wrap(open, lines(glyph, label), "</Button>");
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
