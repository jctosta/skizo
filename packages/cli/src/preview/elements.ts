import type { Node } from "@skizo/core";
import { CLASSES, cx } from "../classes";
import { iconSvg } from "../icons";

/** What an emitter gets besides its node. Grows with the needs of Element types (node path, icons, ...). */
export type Ctx = { render(nodes: Node[]): string };
export type Emit = (node: Node, ctx: Ctx) => string;

/** HTML-escapes text and attribute values. */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** ` name="value"` per attribute (escaped); true is a bare boolean attribute; undefined and false are skipped. */
export const attrs = (pairs: Record<string, unknown>) =>
  Object.entries(pairs)
    .map(([name, v]) => (v === undefined || v === false ? "" : v === true ? ` ${name}` : ` ${name}="${esc(String(v))}"`))
    .join("");

/** DOM id of a form control: from its source line, so unique within the page and stable between runs. */
export const fieldId = (node: Node) => `field-${node.line}`;

/** A form control under its Label, with error text below. */
const field = (node: Node, control: string, error?: unknown) =>
  [
    `<div class="${CLASSES.Field.root}">`,
    `<label for="${fieldId(node)}" class="${CLASSES.Field.label}">${esc(node.label!)}</label>`,
    control,
    typeof error === "string" && `<p class="${CLASSES.Field.error}">${esc(error)}</p>`,
    `</div>`,
  ]
    .filter(Boolean)
    .join("\n");

/** A small control (Checkbox, Switch, Radio option) with its Label beside it. */
const choice = (id: string, label: string, control: string) =>
  `<div class="${CLASSES.Field.choice}">${control}<label for="${id}" class="${CLASSES.Field.label}">${esc(label)}</label></div>`;

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
  Button: (node) => {
    const c = CLASSES.Button;
    const { variant, size, icon } = node.props as { variant: keyof typeof c.variant; size: "sm" | "md" | "lg"; icon?: string };
    const iconOnly = node.props["icon-only"] === true;
    const loading = node.props.loading === true;
    const glyph = loading ? iconSvg("loader-circle", cx("size-4", c.spinner)) : icon !== undefined ? iconSvg(icon) : "";
    const label = iconOnly ? `<span class="${c.hiddenLabel}">${esc(node.label!)}</span>` : esc(node.label!);
    const disabled = node.props.disabled === true || loading ? " disabled" : "";
    const classes = cx(c.base, c.variant[variant], (iconOnly ? c.iconSize : c.size)[size]);
    return `<button type="button" class="${classes}"${disabled}>${glyph}${label}</button>`;
  },
  Input: (node) => {
    const { type, placeholder, value, disabled, error } = node.props;
    const a = attrs({ id: fieldId(node), type, placeholder, value, disabled, "aria-invalid": error !== undefined && "true" });
    return field(node, `<input${a} class="${CLASSES.Input.control}">`, error);
  },
  Textarea: (node) => {
    const { placeholder, value = "", rows } = node.props;
    const a = attrs({ id: fieldId(node), placeholder, rows });
    return field(node, `<textarea${a} class="${CLASSES.Textarea.control}">${esc(String(value))}</textarea>`);
  },
  Checkbox: (node) => {
    const { checked, disabled } = node.props;
    const control = `<input type="checkbox"${attrs({ id: fieldId(node), checked, disabled })} class="${CLASSES.Checkbox.control}">`;
    return choice(fieldId(node), node.label!, control);
  },
  Switch: (node) => {
    const c = CLASSES.Switch;
    const on = node.props.checked === true;
    const a = attrs({ id: fieldId(node), "aria-checked": String(on), disabled: node.props.disabled });
    const thumb = `<span class="${cx(c.thumb, on ? c.thumbOn : c.thumbOff)}"></span>`;
    const control = `<button type="button" role="switch"${a} class="${cx(c.track, on ? c.trackOn : c.trackOff)}">${thumb}</button>`;
    return choice(fieldId(node), node.label!, control);
  },
  Radio: (node) => {
    const group = fieldId(node);
    const options = (node.props.options ?? []) as string[];
    const items = options.map((option, i) => {
      const a = attrs({ id: `${group}-${i + 1}`, name: group, value: option, checked: option === node.props.value });
      return choice(`${group}-${i + 1}`, option, `<input type="radio"${a} class="${CLASSES.Radio.control}">`);
    });
    return [
      `<div class="${CLASSES.Field.root}">`,
      `<span id="${group}" class="${CLASSES.Field.label}">${esc(node.label!)}</span>`,
      `<div role="radiogroup" aria-labelledby="${group}" class="${CLASSES.Radio.group}">`,
      ...items,
      `</div>`,
      `</div>`,
    ].join("\n");
  },
};
