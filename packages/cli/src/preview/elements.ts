import type { Node } from "@skizo/core";
import { CLASSES, cx, flexClasses, gridClasses, spanClasses } from "../classes";
import { initials, listItems, lorem, tableRows } from "../placeholder";
import { iconSvg } from "../icons";
import type { Script } from "./script";

/** What an emitter gets besides its node. Grows with the needs of Element types (icons, ...). */
export type Ctx = {
  render(nodes: Node[]): string;
  /** Node path of the Element being emitted, `<screen id>/<child index>/...`: the seed for placeholder content. */
  path: string;
  /** Adds one of the SCRIPTS handlers to the page. */
  script(name: Script): void;
};
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

/** Where `to=` goes in the Preview: the hash names the Screen to show (SCRIPTS.to). */
const screenHref = (id: string) => `#${encodeURIComponent(id)}`;

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
    const actions = node.slots?.actions;
    const sidebar = node.children[0]?.type === "Sidebar" ? node.children[0] : undefined;
    const main = lines(
      `<header class="${cx(c.header, actions && c.headerWithActions)}">`,
      `<h1 class="${c.title}">${esc(node.label!)}</h1>`,
      subtitle !== undefined && `<p class="${c.subtitle}">${esc(subtitle)}</p>`,
      actions && div(c.actions, ctx.render(actions)),
      `</header>`,
      div(c.body, ctx.render(sidebar ? node.children.slice(1) : node.children)),
    );
    return lines(
      `<section data-screen="${esc(node.props.id as string)}" class="${sidebar ? c.shell : c.root}">`,
      sidebar ? lines(ctx.render([sidebar]), div(c.main, main)) : main,
      `</section>`,
    );
  },
  Sidebar: (node, ctx) => {
    const c = CLASSES.Sidebar;
    return lines(`<aside class="${c.root}">`, `<nav class="${c.nav}">`, ctx.render(node.children), "</nav>", "</aside>");
  },
  /** A Link without to= goes nowhere yet: no href. */
  Link: (node, ctx) => {
    const { icon, to, active } = node.props as { icon?: string; to?: string; active?: true };
    if (to !== undefined) ctx.script("to");
    const a = attrs({ href: to === undefined ? undefined : screenHref(to), "aria-current": active && "page" });
    return `<a${a} class="${CLASSES.Link.root}">${icon === undefined ? "" : iconSvg(icon, CLASSES.Link.icon)}${esc(node.label!)}</a>`;
  },
  Heading: (node) => {
    const level = node.props.level as keyof typeof CLASSES.Heading;
    return `<h${level} class="${CLASSES.Heading[level]}">${esc(node.label!)}</h${level}>`;
  },
  Text: (node, ctx) => {
    const c = CLASSES.Text;
    const classes = cx(c[node.props.size as "sm" | "md" | "lg"], node.props.muted === true && c.muted, node.props.bold === true && c.bold);
    return `<p class="${classes}">${esc(node.label ?? lorem(ctx.path, node.props.lorem as number))}</p>`;
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
    const size = c[node.props.size as "sm" | "md" | "lg"];
    // Only the initials show, so the full name is the accessible name.
    return `<span role="img" aria-label="${esc(node.label!)}" class="${cx(c.root, size)}">${esc(initials(node.label!))}</span>`;
  },
  Image: (node) => {
    const alt = esc(node.label!);
    const ratio = (node.props.ratio as string).replace(":", " / ");
    return `<div role="img" aria-label="${alt}" class="${CLASSES.Image.root}" style="aspect-ratio: ${ratio}">${alt}</div>`;
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
  Stack: (node, ctx) => div(flexClasses(node), ctx.render(node.children)),
  Row: (node, ctx) => div(flexClasses(node), ctx.render(node.children)),
  /** Wraps each child with span=N in a cell spanning N columns, so no other emitter handles span. */
  Grid: (node, ctx) => {
    const cells = node.children.map((child) => {
      const span = spanClasses(child);
      return span ? div(span, ctx.render([child])) : ctx.render([child]);
    });
    return div(gridClasses(node), lines(...cells));
  },
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
  List: (node) => [`<ul class="${CLASSES.List.root}">`, ...listItems(node).map((item) => `<li>${esc(item)}</li>`), "</ul>"].join("\n"),
  Dialog: (node, ctx) => overlay(node, ctx, CLASSES.Dialog, CLASSES.Dialog.content),
  Sheet: (node, ctx) => overlay(node, ctx, CLASSES.Sheet, cx(CLASSES.Sheet.content, CLASSES.Sheet[node.props.side as "right" | "left"])),
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
  /** Its trigger is a Button (always size md) and it renders its Items; script.ts's popup handler opens it. */
  Menu: (node, ctx) => {
    const b = CLASSES.Button;
    const c = CLASSES.Menu;
    ctx.script("popup");
    const { variant, icon } = node.props as { variant: keyof typeof b.variant; icon?: string };
    const iconOnly = node.props["icon-only"] === true;
    const open = node.props.open === true;
    const label = iconOnly ? `<span class="${b.hiddenLabel}">${esc(node.label!)}</span>` : esc(node.label!);
    const classes = cx(b.base, b.variant[variant], iconOnly ? b.iconSize.md : b.size.md);
    const items = node.children.map((item) => {
      const disabled = item.props.disabled === true;
      const look = cx(c.item, item.props.destructive === true ? c.destructive : c.default, disabled && c.disabled);
      return `<div role="menuitem"${attrs({ "aria-disabled": disabled && "true" })} class="${look}">${esc(item.label!)}</div>`;
    });
    return [
      `<div data-popup>`,
      `<button type="button" aria-haspopup="menu"${attrs({ "aria-expanded": String(open) })} data-popup-trigger class="${classes}">${icon === undefined ? "" : iconSvg(icon)}${label}</button>`,
      `<div role="menu"${attrs({ "aria-label": node.label })} data-popup-content class="${c.content}"${open ? "" : " hidden"}>`,
      ...items,
      `</div>`,
      `</div>`,
    ].join("\n");
  },
  Button: (node, ctx) => {
    const c = CLASSES.Button;
    const { variant, size, icon } = node.props as { variant: keyof typeof c.variant; size: "sm" | "md" | "lg"; icon?: string };
    const iconOnly = node.props["icon-only"] === true;
    const loading = node.props.loading === true;
    const glyph = loading ? iconSvg("loader-circle", cx("size-4", c.spinner)) : icon !== undefined ? iconSvg(icon) : "";
    const label = iconOnly ? `<span class="${c.hiddenLabel}">${esc(node.label!)}</span>` : esc(node.label!);
    const disabled = node.props.disabled === true || loading;
    const classes = cx(c.base, c.variant[variant], (iconOnly ? c.iconSize : c.size)[size]);
    // Disabled wins over to=: a link cannot be disabled, so it renders as a disabled button.
    const to = disabled ? undefined : (node.props.to as string | undefined);
    if (to !== undefined) {
      // A link styled as a Button, like the export's <Button asChild><a>.
      ctx.script("to");
      return `<a href="${esc(screenHref(to))}" class="${classes}">${glyph}${label}</a>`;
    }
    const opens = attrs({ "data-opens": node.props.opens, "aria-haspopup": node.props.opens && "dialog" });
    return `<button type="button" class="${classes}"${attrs({ disabled })}${opens}>${glyph}${label}</button>`;
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
  Select: (node, ctx) => {
    const c = CLASSES.Select;
    ctx.script("popup");
    const { value, placeholder = "", open } = node.props as { value?: string; placeholder?: string; open?: true };
    const options = (node.props.options ?? []) as string[];
    const shown = value === undefined ? `<span class="${c.placeholder}">${esc(placeholder)}</span>` : `<span>${esc(value)}</span>`;
    const trigger = `<button type="button" role="combobox"${attrs({ id: fieldId(node), "aria-expanded": String(open === true) })} aria-haspopup="listbox" data-popup-trigger class="${c.trigger}">${shown}${iconSvg("chevron-down", c.chevron)}</button>`;
    const check = iconSvg("check", c.check);
    const items = options.map(
      (option) => `<div role="option" aria-selected="${option === value}" class="${c.item}">${esc(option)}${check}</div>`,
    );
    return field(
      node,
      [
        `<div data-popup>`,
        trigger,
        `<div role="listbox" data-popup-content class="${c.content}"${open === true ? "" : " hidden"}>`,
        ...items,
        `</div>`,
        `</div>`,
      ].join("\n"),
    );
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

/**
 * Dialog and Sheet: a backdrop and a panel, hidden until a Button's opens= shows them, or shown on load with `open`.
 * The close button, the backdrop and footer Buttons without Behavior carry data-overlay-close (SCRIPTS.overlay).
 */
function overlay(node: Node, ctx: Ctx, c: typeof CLASSES.Dialog | typeof CLASSES.Sheet, panel: string) {
  ctx.script("overlay");
  const b = CLASSES.Button;
  const desc = node.props.desc as string | undefined;
  const title = `overlay-${node.line}`;
  const footer = node.slots?.footer?.map((n) => {
    const closes = n.type === "Button" && n.props.opens === undefined && n.props.to === undefined;
    return closes ? `<div data-overlay-close class="contents">${ctx.render([n])}</div>` : ctx.render([n]);
  });
  return lines(
    `<div${attrs({ "data-overlay": node.props.id ?? "", hidden: node.props.open !== true })}>`,
    `<div data-overlay-close class="${c.backdrop}"></div>`,
    `<div role="dialog" aria-modal="true" aria-labelledby="${title}" class="${panel}">`,
    div(
      c.header,
      lines(`<h2 id="${title}" class="${c.title}">${esc(node.label!)}</h2>`, desc !== undefined && `<p class="${c.desc}">${esc(desc)}</p>`),
    ),
    node.children.length > 0 && div(c.body, ctx.render(node.children)),
    footer && div(c.footer, lines(...footer)),
    `<button type="button" data-overlay-close class="${cx(b.base, b.variant.ghost, b.iconSize.sm, c.close)}">${iconSvg("x")}<span class="${b.hiddenLabel}">Close</span></button>`,
    "</div>",
    "</div>",
  );
}

/** Joins the present lines. */
const lines =(...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n");

/** A `<div>` holding `body`, which may be empty. */
const div = (classes: string, body: string) => lines(`<div class="${classes}">`, body, "</div>");
