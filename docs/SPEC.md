# Skizo — Spec v0.2

*Skizo* is Esperanto for "sketch" or "draft". Package: `@jctosta/skizo` · CLI: `skizo` (alias `skz`) · Files: `.skz` · Site: skizo.dev

A tiny, indentation-based language for agents to sketch UI mockups quickly and cheaply. One `.skz` file turns into a clickable Preview (static HTML) or exports to framework code (shadcn React).

**Goals:** low output tokens, one obvious way to write things, errors an agent can fix in one pass, framework-agnostic source.

**Non-goals:** full applications, state, data binding, runtime/generative UI, pixel-perfect design. If a screen needs logic, export it and continue in real code.

Terms in this document (Element, Element type, Label, Screen, Overlay, Behavior, Backend, Export target, Preview, Guide) are defined in [GLOSSARY.md](../GLOSSARY.md).

The document has two parts:

- **Part A — Guide.** Self-contained; this is what `skizo guide` prints for agents. It measured about 1.2k tokens on extraction (1,209 with tiktoken cl100k_base); keep it near that. It lives in [packages/cli/GUIDE.md](../packages/cli/GUIDE.md); Part A links to it.
- **Part B — Implementation notes.** Parser, AST, validation, Backends. Agents never see this.

---

## Part A — Guide

Moved to [packages/cli/GUIDE.md](../packages/cli/GUIDE.md), the one source for what agents read. It ships in the published package and `skizo guide` prints it verbatim.

---

## Part B — Implementation notes

### Pipeline

```
.skz → lexer → parser → AST → validate → Backend
                                         ├─ preview  (one offline HTML file + tiny JS)
                                         └─ shadcn   (TSX using @/components/ui/*)
```

The AST is the contract. Backends never read source text, and the validator is Backend-independent.

### Line grammar

```
file     := screen+
line     := INDENT (element | text | row | slot | comment)
element  := TYPE token*            ; TYPE = PascalCase Element type
token    := STRING | FLAG | PROP
STRING   := '"' ( [^"\\] | '\\' . )* '"'
FLAG     := [a-z][a-z0-9-]*
PROP     := FLAG '=' ( STRING | BARE )   ; BARE = no spaces, no quotes
text     := STRING                     ; ⇒ Text element
row      := '|' cell ('|' cell)* '|'?  ; cells trimmed; only valid under Table
slot     := 'actions' | 'footer'
comment  := '//' .*
```

- Indent must be a multiple of 2, and a child may be at most one level deeper than its parent.
- On an element line, the first STRING is the Label. A second bare STRING is an error.
- List props split on `,`; `\,` escapes a literal comma.
- Prop values are untyped strings in the AST. The validator coerces them per schema (number, enum, list, bool).

### AST

```ts
type Node = {
  type: string;                 // Element type: "Card", "Text", ...
  label?: string;
  props: Record<string, string | number | boolean | string[]>; // flags folded in as true
  children: Node[];
  slots?: { actions?: Node[]; footer?: Node[] };
  rows?: string[][];            // Table only
  line: number;                 // 1-based, for errors and source maps
};
type Document = { screens: Node[] };   // each Screen node has props.id (auto-slug of label if missing)
```

### Validation

There is one schema per Element type, written in Zod or similar: allowed props and their types, enums, defaults, allowed children, allowed slots. Rules:

- Unknown Element type, prop, flag, enum value or id → error with a nearest-match hint: `Button: unknown prop "varient" — did you mean variant?`
- A bare word that matches an enum value of some prop → error with a hint: `Badge: unknown flag "secondary" — did you mean variant=secondary?`
- `opens` must resolve to a `Dialog` or `Sheet` on the same Screen. `to` must resolve to a `Screen`.
- Duplicate ids → error. Only one `active` per `Tabs` or `Sidebar`. `Tabs` default to the first `Tab` if none is active. A Sidebar `Link` whose `to` is its own Screen is active.
- Structural rules: `Tab` only under `Tabs`, `Item` only under `Menu`, row lines only under `Table`, `Sidebar` only as the first child of `Screen`, `Dialog` and `Sheet` only as direct children of `Screen`, and a Table needs `cols`.
- A Table row must have exactly one cell per `cols` entry.
- One content source per Element: Label or `lorem`, `|` rows or `rows`, `items` or `rows`. Both → error.
- `Button` and `Menu` need a Label, including with `icon-only`.
- Report **all** errors, not just the first. Format, one per line:

```
orders.skz:14  Button  unknown variant "primary" (expected: default, secondary, outline, ghost, destructive, link)
```

The CLI exits non-zero on errors, and `--json` emits machine-readable output.

### Backends

Each Backend is a map `Element type → emitter`. Shared rules:

- Sizes and gaps (`sm|md|lg`) map to Backend tokens (Tailwind: gap-2/4/6).
- Placeholder content (`rows=N`, `lorem=N`, `Image`) is **deterministic**, seeded by node path, so re-exports diff cleanly. Generated table cells are guessed from the column name (Name, Email, Date, Status, Amount, otherwise "Item n").
- Overlays with the `open` flag render visibly in the Preview, and as `open` / `defaultOpen` in exported code.
- `icon-only` renders the icon alone and keeps the Label as the accessible name (`aria-label` or `sr-only` text).

**shadcn Export target.** It imports from `@/components/ui/*`, so the export uses the project's own components and theme. Compound expansions:

| DSL | shadcn |
|---|---|
| `Card` | `Card > CardHeader(CardTitle, CardDescription, actions) > CardContent > CardFooter` |
| `Dialog` | `Dialog open? > DialogContent > DialogHeader(Title, Description) + body + DialogFooter` |
| `Sheet` | Same pattern with `Sheet*` and `side` |
| `Select` | `Label + Select > SelectTrigger(SelectValue) > SelectContent > SelectItem*` |
| `Tabs` | `Tabs defaultValue=<active> > TabsList(TabsTrigger*) + TabsContent*` |
| `Table` | `Table > TableHeader/TableRow/TableHead* + TableBody/TableRow/TableCell*` |
| `Menu` | `DropdownMenu > DropdownMenuTrigger(Button icon/variant) > DropdownMenuContent > DropdownMenuItem*` |
| `Input`/`Textarea` | `div.grid.gap-2 > Label + Input` (+ error text) |
| `Stat` | `div > p.text-sm (title) + div.text-2xl.font-bold + p.text-xs.text-muted-foreground` (no shadcn equivalent) |
| `Screen` + `Sidebar` | Page shell: sidebar column + main with a header row (title, subtitle, actions) |

Each `Screen` becomes one `.tsx` file in `--out`, named after the Screen id (`orders.tsx` exporting `OrdersScreen`). `opens` turns into `useState` wiring between the trigger and the Overlay. `to` becomes a plain `<a href="/<screenId>">` (Buttons via `asChild`); swapping in a router's link component is left to the user.

**Preview.** It emits one self-contained HTML file that works offline. CSS for the fixed class set the Backend emits is precompiled at package build time and inlined; only the Lucide icons the file uses are inlined as SVG. All Screens go in one file. A few lines of vanilla JS handle Behavior (`to`, `opens`) and built-in interactions: switching Tabs, opening Menus and Selects, closing Overlays (close button, backdrop, a footer Button without Behavior). Form controls are plain, inert HTML. No build step for the user.

### CLI

```
skizo guide                                      # prints the Guide (packages/cli/GUIDE.md)
skizo check   <file.skz> [--json]
skizo preview <file.skz> [--watch]               # writes <file>.html; --watch serves it with live reload
skizo export  <file.skz> --target shadcn  [--out dir]
```

`skz` is a short alias for `skizo`.

### Packaging

TypeScript on Node, published under the `@jctosta` npm scope (the bare `skizo` name on npm is taken by an unrelated abandoned package).

```
packages/
  core/      parser, AST, validator; no Node APIs (runs in the browser too); private, not published
  cli/       @jctosta/skizo, bin: skizo, skz; bundles core; holds the Backends and GUIDE.md
```

- The parser is hand-written and line-based. No parser generator.
- Tests are golden files: `.skz` in, HTML/TSX snapshots out (Vitest).
- `core` stays dependency-light and separate so a web playground or editor extension can reuse it. Publish it when such a consumer exists.

### Out of scope for v0.2

These are deliberate omissions. Add them only when real use demands it: a plain React + Tailwind Export target, a Sidebar shared across Screens, router-specific links in exports, theming beyond the Backend's defaults, responsive variants, charts, forms with validation logic, loops/templates/variables, imports between files, and custom elements. If you need custom elements, add one `Custom "Name"` passthrough later rather than a plugin system.
