import { pascalCase, type Document, type Node } from "@skizo/core";
import { emitterFor, lines } from "../backend";
import { nodePaths } from "../placeholder";
import { EMITTERS, wrap, type Ctx, type Import, type Router } from "./elements";

/** Screen ids the export needs for its own files, with what for: `check` refuses them (CheckOptions). */
export const RESERVED_SCREEN_IDS: ReadonlyMap<string, string> = new Map([["app-sidebar", "for the shared Sidebar"]]);

/**
 * The shadcn Export target: file name → TSX, one file per Screen, named after its id, plus `app-sidebar.tsx` for
 * the shared Sidebar (RESERVED_SCREEN_IDS keeps that name free).
 */
export function exportShadcn(document: Document, { router }: { router?: Router } = {}): Record<string, string> {
  const { sidebar } = document;
  const options: FileOptions = { paths: nodePaths(document), router, sidebar, clashes: new Set() };
  const file = (signature: string, node: Node) => componentFile(signature, node, options);
  const screens = document.screens.map((screen) => [`${screen.props.id}.tsx`, file(`${componentName(screen.props.id as string)}()`, screen)]);
  if (!sidebar) return Object.fromEntries(screens);
  return Object.fromEntries([["app-sidebar.tsx", file("AppSidebar({ current }: { current: string })", sidebar)], ...screens]);
}

/** What a file is rendered with besides its node: the export's node paths, plus the Ctx fields every Element of it shares. */
type FileOptions = { paths: Map<Node, string> } & Pick<Ctx, "router" | "sidebar" | "clashes">;

/** `order-details` → `OrderDetailsScreen`; `2026-report` → `Screen2026ReportScreen` (no identifier starts with a digit). */
const componentName = (id: string) => `${pascalCase(id, "Screen")}Screen`;

/** What an import statement names: `{ A, type B, C as D }`; the default export comes first and bare: `X, { A }`. */
const importClause = (names: Import[]) => {
  const entries = names.map((name): Exclude<Import, string> => (typeof name === "string" ? { name } : name));
  const bare = entries.find((entry) => entry.name === "default");
  const named = entries.filter((entry) => entry !== bare).map(({ name, as, type }) => `${type ? "type " : ""}${name}${as ? ` as ${as}` : ""}`);
  return [bare?.as, named.length > 0 && `{ ${named.sort().join(", ")} }`].filter(Boolean).join(", ");
};

/** The name an import declares in the file: its alias, if any. */
const localName = (name: Import) => (typeof name === "string" ? name : (name.as ?? name.name));

/** A file exporting one component, `signature` (name and parameters), that renders `node`. */
function componentFile(signature: string, node: Node, options: FileOptions): string {
  const first = renderFile(node, options);
  // A name the file would declare twice: a Custom named like another import (Label) or like the component itself.
  // Only a Custom can clash, so a second render that aliases it settles the file.
  const declared = [signature.slice(0, signature.indexOf("(")), ...[...first.imports.values()].flatMap((names) => [...names.keys()])];
  const clashes = new Set(declared.filter((name, i) => declared.indexOf(name) !== i));
  const { imports, hooks, declarations, jsx } = clashes.size ? renderFile(node, { ...options, clashes }) : first;
  // The Next.js App Router renders a file on the server unless it says otherwise; hooks and recharts need the client.
  const client = options.router === "next" && (hooks.length > 0 || imports.has("recharts")) ? `"use client"\n\n` : "";
  const head = [...imports.keys()].sort().map((from) => `import ${importClause([...imports.get(from)!.values()])} from "${from}"\n`);
  const body = wrap(`export function ${signature} {`, lines(...hooks, wrap("return (", jsx, ")")), "}");
  return `${client}${head.join("")}${head.length ? "\n" : ""}${declarations.map((code) => `${code}\n\n`).join("")}${body}\n`;
}

/** Renders `node` with fresh per-file state: its JSX and what goes above it (imports, hooks, declarations). */
function renderFile(node: Node, { paths, ...shared }: FileOptions) {
  /** Module → the names imported from it, by the name each declares in the file. */
  const imports = new Map<string, Map<string, Import>>();
  const use: Ctx["use"] = (from, ...names) => {
    const declared = imports.get(from) ?? new Map<string, Import>();
    for (const name of names) declared.set(localName(name), name);
    imports.set(from, declared);
  };
  const ids = new Map<string, number>();
  const id: Ctx["id"] = (base) => {
    const n = (ids.get(base) ?? 0) + 1;
    ids.set(base, n);
    // ponytail: a Label that slugs to "name-2" can still collide with a second "Name"; dedupe across both if it bites.
    return n === 1 ? base : `${base}-${n}`;
  };
  const hooks: string[] = [];
  const hook: Ctx["hook"] = (line) => hooks.push(line);
  const declarations: string[] = [];
  const declare: Ctx["declare"] = (code) => declarations.push(code);
  const ctx = (n: Node): Ctx => ({
    ...shared,
    path: paths.get(n)!,
    use,
    id,
    hook,
    declare,
    render: (nodes) => nodes.map((child) => emitterFor(EMITTERS, child.type, "shadcn export")(child, ctx(child))).join("\n"),
  });
  const jsx = ctx(node).render([node]);
  return { imports, hooks, declarations, jsx };
}
