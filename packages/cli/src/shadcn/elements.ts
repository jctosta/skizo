import { pascalCase, slugify, type Node } from "@skizo/core";
import { chartColor, chartHasLegend, customProps, hasBehavior, lines, screenParts, statHint, type ChartType } from "../backend";
import { CLASSES, cx, flexClasses, gridClasses, spanClasses } from "../classes";
import { iconComponent } from "../icons";
import { chartRows, initials, listItems, lorem, tableRows } from "../placeholder";

/**
 * One name an import declares: `"Card"`, or an object for a name under an alias (`{ name: "Label", as: "CustomLabel" }`),
 * a type (`{ name: "ChartConfig", type: true }`) or the default export (`{ name: "default", as: "Link" }`).
 */
export type Import = string | { name: string; as?: string; type?: true };

/** What an emitter gets besides its node. Grows with the needs of Element types (icons, ...). */
export type Ctx = {
  render(nodes: Node[]): string;
  /** Adds imports to the Screen's file, e.g. `ctx.use("@/components/ui/card", "Card", "CardHeader")`. */
  use(from: string, ...names: Import[]): void;
  /** The `--router` whose Link the export writes links with; undefined for plain anchors. Read it through `screenLink`. */
  router?: Router;
  /** Node path of the Element being emitted, `<screen id>/<child index>/...`: the seed for placeholder content. */
  path: string;
  /** `base`, or `base-2`, `base-3`... when the Screen's file already uses it: DOM ids for form controls, Chart names. */
  id(base: string): string;
  /** Adds a line to the top of the Screen's component, before `return`: state hooks. */
  hook(line: string): void;
  /** Adds a declaration above the Screen's component: a Chart's data and config. */
  declare(code: string): void;
  /** The Sidebar shared by every Screen without its own (Document.sidebar), exported once as AppSidebar. */
  sidebar?: Node;
  /** Names the file would otherwise declare twice. A Custom with one of them imports under an alias: CustomLabel. */
  clashes: ReadonlySet<string>;
};
export type Emit = (node: Node, ctx: Ctx) => string;

/** Text as JSX children: verbatim, or as a string expression when it holds characters JSX reads as markup. */
export const text = (s: string) => (/[{}<>&]/.test(s) ? `{${JSON.stringify(s)}}` : s);

/** A string as a JSX attribute value: quoted, or a string expression when it holds `"` or `&`. */
export const attr = (s: string) => (/["&]/.test(s) ? `{${JSON.stringify(s)}}` : `"${s}"`);

/** `start`, then `body` indented two spaces, then `end`; one line when `body` is empty. */
export const wrap = (start: string, body: string, end: string) =>
  body ? `${start}\n${body.replace(/^/gm, "  ")}\n${end}` : `${start}${end}`;

/**
 * JSX attributes from name → value: strings through `attr`, numbers and `{ expr: "code" }` in braces, true bare;
 * undefined and false skipped. Only emitters build an `expr`, so source text never becomes code.
 */
export const jsxAttrs = (pairs: Record<string, unknown>) =>
  Object.entries(pairs)
    .map(([name, v]) => {
      if (v === undefined || v === false) return "";
      if (v === true) return ` ${name}`;
      if (typeof v === "number") return ` ${name}={${v}}`;
      if (typeof v === "object" && v !== null && "expr" in v) return ` ${name}={${v.expr}}`;
      return ` ${name}=${attr(String(v))}`;
    })
    .join("");

/**
 * Slugs of `labels`, which read as hand-written; `<fallback>-1`, `<fallback>-2`... for all when one is empty, two
 * collide or one is `taken` (a key the export writes beside them).
 */
const slugs = (labels: string[], fallback: string, taken: readonly string[] = []) => {
  const s = labels.map(slugify);
  return s.every((k) => k && !taken.includes(k)) && new Set(s).size === s.length ? s : s.map((_, i) => `${fallback}-${i + 1}`);
};

/** An object literal key: bare when it is an identifier, else quoted. */
const key = (s: string) => (/^[A-Za-z_$][\w$]*$/.test(s) ? s : JSON.stringify(s));

/** The recharts chart and series components of each cartesian Chart type. */
const CHARTS = { line: ["LineChart", "Line"], bar: ["BarChart", "Bar"], area: ["AreaChart", "Area"] } as const;

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

/** `--router`: each router's Link component, as `ctx.use` imports it, and the prop that takes the path. */
export const ROUTERS = {
  next: { from: "next/link", link: { name: "default", as: "Link" }, prop: "href" },
  "react-router": { from: "react-router", link: "Link", prop: "to" },
};
export type Router = keyof typeof ROUTERS;

/**
 * A link to the Screen `to`, at its route `/<id>`. Every emitter that writes a link calls this, so `--router` reaches
 * them all: the router's Link, else a plain `<a href>`. Without `to` it goes nowhere yet: a plain `<a>` with no href.
 */
export function screenLink(ctx: Ctx, to: string | undefined, attrs: Record<string, unknown>, body: string) {
  const router = to === undefined || ctx.router === undefined ? undefined : ROUTERS[ctx.router];
  if (router) ctx.use(router.from, router.link);
  const tag = router ? "Link" : "a";
  const open = `<${tag}${jsxAttrs({ [router?.prop ?? "href"]: to === undefined ? undefined : `/${to}`, ...attrs })}>`;
  return body.includes("\n") ? wrap(open, body, `</${tag}>`) : `${open}${body}</${tag}>`;
}

/**
 * The useState pair behind opens=, named after the id of the Dialog or Sheet: `new-order` → ["newOrderOpen", "setNewOrderOpen"].
 * ponytail: ids that differ only in punctuation (new-order, new_order) collide; dedupe per Screen if it bites.
 */
export const openState = (id: string) => {
  const name = pascalCase(id, "Overlay");
  return [`${name[0]!.toLowerCase()}${name.slice(1)}Open`, `set${name}Open`] as const;
};

/** Dialog and Sheet: Content > Header(Title, Description) + body + Footer, with useState when an id lets opens= show it. */
function dialog(node: Node, ctx: Ctx, kind: "Dialog" | "Sheet", content: string) {
  /** Imports a part and returns its name. */
  const ui = (part: string) => (ctx.use(`@/components/ui/${kind.toLowerCase()}`, `${kind}${part}`), `${kind}${part}`);
  const id = node.props.id as string | undefined;
  const desc = node.props.desc as string | undefined;
  let state = jsxAttrs({ defaultOpen: node.props.open === true });
  if (id !== undefined) {
    const [value, set] = openState(id);
    ctx.use("react", "useState");
    ctx.hook(`const [${value}, ${set}] = useState(${node.props.open === true})`);
    state = ` open={${value}} onOpenChange={${set}}`;
  }
  // A footer Button without Behavior closes the Dialog or Sheet, as in the Preview.
  const footer = node.slots?.footer?.map((n) =>
    n.type === "Button" && !hasBehavior(n)
      ? wrap(`<${ui("Close")} asChild>`, ctx.render([n]), `</${kind}Close>`)
      : ctx.render([n]),
  );
  ctx.use(`@/components/ui/${kind.toLowerCase()}`, kind);
  return wrap(
    `<${kind}${state}>`,
    wrap(
      // Without a Description, Radix warns unless told there is none.
      `<${ui("Content")}${content}${desc === undefined ? " aria-describedby={undefined}" : ""}>`,
      lines(
        wrap(
          `<${ui("Header")}>`,
          lines(
            `<${ui("Title")}>${text(node.label!)}</${kind}Title>`,
            desc !== undefined && `<${ui("Description")}>${text(desc)}</${kind}Description>`,
          ),
          `</${kind}Header>`,
        ),
        node.children.length > 0 && wrap(`<div className="${CLASSES[kind].body}">`, ctx.render(node.children), "</div>"),
        footer && wrap(`<${ui("Footer")}>`, lines(...footer), `</${kind}Footer>`),
      ),
      `</${kind}Content>`,
    ),
    `</${kind}>`,
  );
}

/** Skizo `size` → shadcn Button `size`, for text Buttons and for icon-only ones. md is shadcn's default. */
const BUTTON_SIZE = { sm: "sm", md: undefined, lg: "lg" } as const;
const ICON_BUTTON_SIZE = { sm: "icon-sm", md: "icon", lg: "icon-lg" } as const;

/**
 * The shadcn Export target: one emitter per Element type, returning TSX.
 * Props arrive checked, coerced and with enum defaults filled in.
 */
export const EMITTERS: Record<string, Emit> = {
  /** With a Sidebar: a page shell, the sidebar column beside <main>. The shared Sidebar is <AppSidebar> (app-sidebar.tsx). */
  Screen: (node, ctx) => {
    const c = CLASSES.Screen;
    const subtitle = node.props.subtitle as string | undefined;
    const actions = node.slots?.actions;
    const { sidebar, isShared, body } = screenParts(node, ctx.sidebar);
    const header = lines(
      `<h1 className="${c.title}">${text(node.label!)}</h1>`,
      subtitle !== undefined && `<p className="${c.subtitle}">${text(subtitle)}</p>`,
      actions && wrap(`<div className="${c.actions}">`, ctx.render(actions), "</div>"),
    );
    const main = wrap(
      `<main className="${sidebar ? c.main : c.root}">`,
      lines(
        wrap(`<header className="${cx(c.header, actions && c.headerWithActions)}">`, header, "</header>"),
        wrap(`<div className="${c.body}">`, ctx.render(body), "</div>"),
      ),
      "</main>",
    );
    if (!sidebar) return main;
    if (isShared) ctx.use("./app-sidebar", "AppSidebar");
    const column = isShared ? `<AppSidebar${jsxAttrs({ current: node.props.id })} />` : ctx.render([sidebar]);
    return wrap(`<div className="${c.shell}">`, lines(column, main), "</div>");
  },
  Sidebar: (node, ctx) => {
    const c = CLASSES.Sidebar;
    return wrap(`<aside className="${c.root}">`, wrap(`<nav className="${c.nav}">`, ctx.render(node.children), "</nav>"), "</aside>");
  },
  /** In the shared Sidebar (AppSidebar) the active Link is the one whose to= is the `current` prop. */
  Link: (node, ctx) => {
    const { to, active } = node.props as { to?: string; active?: true };
    const shared = to !== undefined && ctx.sidebar?.children.includes(node);
    const current = shared ? { expr: `current === ${JSON.stringify(to)} ? "page" : undefined` } : active && "page";
    const glyph = node.props.icon !== undefined && icon(ctx, node.props.icon as string, CLASSES.Link.icon);
    return screenLink(ctx, to, { "aria-current": current, className: CLASSES.Link.root }, lines(glyph, text(node.label!)));
  },
  Heading: (node) => {
    const level = node.props.level as keyof typeof CLASSES.Heading;
    return `<h${level} className="${CLASSES.Heading[level]}">${text(node.label!)}</h${level}>`;
  },
  Text: (node, ctx) => {
    const c = CLASSES.Text;
    const classes = cx(c[node.props.size as keyof typeof c], node.props.muted === true && c.muted, node.props.bold === true && c.bold);
    return `<p className="${classes}">${text(node.label ?? lorem(ctx.path, node.props.lorem as number))}</p>`;
  },
  // No shadcn Stat: plain markup (title, value, hint).
  Stat: (node) => {
    const c = CLASSES.Stat;
    const trend = node.props.trend as keyof typeof c;
    const title = node.props.title as string | undefined;
    const hint = statHint(node);
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
    const ratio = (node.props.ratio as string).replace(":", " / ");
    const style = `style={{ aspectRatio: "${ratio}" }}`;
    return `<div role="img" aria-label=${attr(node.label!)} className="${CLASSES.Image.root}" ${style}>${text(node.label!)}</div>`;
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
  /** Wraps each child with span=N in a cell spanning N columns, so no other emitter handles span. */
  Grid: (node, ctx) => {
    const cells = node.children.map((child) => {
      const span = spanClasses(child);
      return span ? wrap(`<div className="${span}">`, ctx.render([child]), "</div>") : ctx.render([child]);
    });
    return wrap(`<div className="${gridClasses(node)}">`, lines(...cells), "</div>");
  },
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
    const header = lines(
      node.label !== undefined && `<${ui("CardTitle")}>${text(node.label)}</CardTitle>`,
      desc !== undefined && `<${ui("CardDescription")}>${text(desc)}</CardDescription>`,
      actions && wrap(`<${ui("CardAction")} className="${c.actions}">`, ctx.render(actions), "</CardAction>"),
    );
    return wrap(
      `<${ui("Card")}>`,
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
  /**
   * The project's shadcn chart around a recharts chart. The data and the ChartConfig go above the component, named
   * after the Label; data keys are the column slugs. A pie, as in shadcn's examples, names each slice by a config
   * key (the slug of its name) that labels and colors it, so its legend and tooltip read the config.
   */
  Chart: (node, ctx) => {
    const type = node.props.type as ChartType;
    const cols = node.props.cols as string[];
    // A pie's data rows also hold fill; config keys are the series and the slices, so a slice key differs from the series key.
    const [x, ...series] = slugs(cols, "col", type === "pie" ? ["fill"] : []);
    const pascal = pascalCase(ctx.id(slugify(node.label!) || "chart"), "Chart");
    const name = `${pascal[0]!.toLowerCase()}${pascal.slice(1)}`;
    const data = chartRows(node, ctx.path);
    const slices = type === "pie" ? slugs(data.map(([slice]) => slice!), "slice", series) : [];
    const rows = data.map(([first, ...values], r) => {
      const fields = [`${key(x!)}: ${JSON.stringify(slices[r] ?? first)}`, ...values.map((v, i) => `${key(series[i]!)}: ${Number(v)}`)];
      return `{ ${[...fields, slices[r] && `fill: "var(--color-${slices[r]})"`].filter(Boolean).join(", ")} },`;
    });
    const config = [
      ...series.map((s, i) => `${key(s)}: { label: ${JSON.stringify(cols[i + 1])}${type === "pie" ? "" : `, color: "${chartColor(i)}"`} },`),
      ...slices.map((s, r) => `${key(s)}: { label: ${JSON.stringify(data[r]![0])}, color: "${chartColor(r)}" },`),
    ];
    ctx.declare(wrap(`const ${name}Data = [`, lines(...rows), "]"));
    ctx.declare(wrap(`const ${name}Config = {`, lines(...config), "} satisfies ChartConfig"));
    const legend = chartHasLegend(node);
    ctx.use("@/components/ui/chart", "ChartContainer", "ChartTooltip", "ChartTooltipContent", { name: "ChartConfig", type: true });
    if (legend) ctx.use("@/components/ui/chart", "ChartLegend", "ChartLegendContent");
    const title = ` title=${attr(node.label!)}`;
    if (type === "pie") {
      ctx.use("recharts", "Pie", "PieChart");
      return wrap(
        `<ChartContainer config={${name}Config} className="${CLASSES.Chart.pieContainer}">`,
        wrap(
          `<PieChart${title}>`,
          lines(
            "<ChartTooltip content={<ChartTooltipContent hideLabel />} />",
            `<Pie data={${name}Data} dataKey="${series[0]}" nameKey="${x}" />`,
            `<ChartLegend content={<ChartLegendContent nameKey="${x}" />} />`,
          ),
          "</PieChart>",
        ),
        "</ChartContainer>",
      );
    }
    const [chart, part] = CHARTS[type];
    ctx.use("recharts", "CartesianGrid", chart, part, "XAxis");
    const look = {
      line: (s: string) => `stroke="var(--color-${s})" strokeWidth={2} dot={false}`,
      bar: (s: string) => `fill="var(--color-${s})" radius={4}`,
      area: (s: string) => `fill="var(--color-${s})" fillOpacity={0.4} stroke="var(--color-${s})"`,
    }[type];
    // Line and area points sit on the plot's edges: the margin keeps the first and last x labels whole.
    const margin = type === "bar" ? "" : " margin={{ left: 12, right: 12 }}";
    return wrap(
      `<ChartContainer config={${name}Config} className="${CLASSES.Chart.container}">`,
      wrap(
        `<${chart} data={${name}Data}${margin}${title}>`,
        lines(
          "<CartesianGrid vertical={false} />",
          `<XAxis dataKey="${x}" tickLine={false} axisLine={false} tickMargin={8} />`,
          "<ChartTooltip content={<ChartTooltipContent />} />",
          legend && "<ChartLegend content={<ChartLegendContent />} />",
          ...series.map((s) => `<${part} dataKey="${s}" ${look(s)} />`),
        ),
        `</${chart}>`,
      ),
      "</ChartContainer>",
    );
  },
  Dialog: (node, ctx) => dialog(node, ctx, "Dialog", ""),
  Sheet: (node, ctx) => dialog(node, ctx, "Sheet", node.props.side === "right" ? "" : ` side="${node.props.side}"`),
  /** Renders its Tabs too: each value pairs a TabsTrigger with its TabsContent. */
  Tabs: (node, ctx) => {
    ctx.use("@/components/ui/tabs", "Tabs", "TabsContent", "TabsList", "TabsTrigger");
    const tabs = node.children;
    const values = slugs(tabs.map((tab) => tab.label!), "tab");
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
  /** Its trigger is the Button emitter's output (size md, no Behavior) under asChild; it renders its Items. */
  Menu: (node, ctx) => {
    ctx.use("@/components/ui/dropdown-menu", "DropdownMenu", "DropdownMenuContent", "DropdownMenuItem", "DropdownMenuTrigger");
    const trigger = EMITTERS.Button!({ ...node, props: { ...node.props, size: "md" } }, ctx);
    const items = node.children.map((item) => {
      const a = jsxAttrs({ variant: item.props.destructive === true && "destructive", disabled: item.props.disabled });
      return `<DropdownMenuItem${a}>${text(item.label!)}</DropdownMenuItem>`;
    });
    return wrap(
      `<DropdownMenu${jsxAttrs({ defaultOpen: node.props.open })}>`,
      lines(
        wrap("<DropdownMenuTrigger asChild>", trigger, "</DropdownMenuTrigger>"),
        wrap("<DropdownMenuContent>", lines(...items), "</DropdownMenuContent>"),
      ),
      "</DropdownMenu>",
    );
  },
  Button: (node, ctx) => {
    const c = CLASSES.Button;
    const { variant, size } = node.props as { variant: string; size: keyof typeof BUTTON_SIZE };
    const iconOnly = node.props["icon-only"] === true;
    const loading = node.props.loading === true;
    const shadcnSize = (iconOnly ? ICON_BUTTON_SIZE : BUTTON_SIZE)[size];
    const disabled = node.props.disabled === true || loading;
    // Disabled wins over to=: a link cannot be disabled, so it renders as a disabled Button.
    const to = disabled ? undefined : (node.props.to as string | undefined);
    const opens = node.props.opens === undefined ? "" : ` onClick={() => ${openState(node.props.opens as string)[1]}(true)}`;
    const tag = `<Button${jsxAttrs({ variant: variant !== "default" && variant, size: shadcnSize, disabled, asChild: to !== undefined })}${opens}>`;
    ctx.use("@/components/ui/button", "Button");
    const glyph = loading ? icon(ctx, "loader-circle", c.spinner) : node.props.icon !== undefined && icon(ctx, node.props.icon as string);
    const label = iconOnly ? `<span className="${c.hiddenLabel}">${text(node.label!)}</span>` : text(node.label!);
    const content = glyph ? lines(glyph, label) : label;
    // to=: the Button renders the link (asChild), like a Link.
    if (to !== undefined) return wrap(tag, screenLink(ctx, to, {}, content), "</Button>");
    return glyph ? wrap(tag, content, "</Button>") : `${tag}${content}</Button>`;
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
  /**
   * The project's own component from `@/components/<kebab-name>`, with the props (keys in camelCase) and children.
   * Named like another import of the file (Label) or its component, it imports as Custom<Name>.
   */
  Custom: (node, ctx) => {
    const name = node.label!;
    const tag = ctx.clashes.has(name) ? `Custom${name}` : name;
    // ChatBubble → chat-bubble, KPICard → kpi-card.
    const file = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
    ctx.use(`@/components/${file}`, tag === name ? name : { name, as: tag });
    const camel = (key: string) => key.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
    const props = jsxAttrs(Object.fromEntries(customProps(node).map(([key, v]) => [camel(key), v])));
    return node.children.length ? wrap(`<${tag}${props}>`, ctx.render(node.children), `</${tag}>`) : `<${tag}${props} />`;
  },
};
