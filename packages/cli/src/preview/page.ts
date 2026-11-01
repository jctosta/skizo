import type { Document, Node } from "@skizo/core";
import { readAsset } from "../assets";
import { emitterFor } from "../backend";
import { CLASSES } from "../classes";
import { nodePaths } from "../placeholder";
import { EMITTERS, esc, type Ctx } from "./elements";
import { FRAME, SCRIPTS, type Script } from "./script";

/** The widths, in px, that the Preview toolbar lays the sketch out at (`preview --viewport`), in toolbar order. */
export const VIEWPORTS = { desktop: 1280, tablet: 768, phone: 390 } as const;
export type Viewport = keyof typeof VIEWPORTS;

const b = CLASSES.Button;
/** Preview only, never exported: the toolbar above the sketch and the stage that holds its frame. */
const TOOLBAR = {
  root: "flex h-screen flex-col bg-muted",
  bar: "flex shrink-0 justify-center gap-1 border-b bg-background p-2",
  button: `${b.base} ${b.variant.ghost} ${b.size.sm} text-muted-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground`,
  stage: "flex min-h-0 flex-1 justify-center overflow-hidden",
  frame: "shrink-0 origin-top bg-background",
};

/**
 * The Preview: one self-contained HTML page holding every Screen. No network: CSS and JS are inlined.
 * The sketch sits in a <template>; FRAME runs it in an iframe as wide as the toolbar's pressed width (`viewport`).
 */
export function renderPreview(document: Document, viewport: Viewport = "desktop"): string {
  const scripts = new Set<Script>();
  const paths = nodePaths(document);
  const ctx = (node: Node): Ctx => ({
    path: paths.get(node)!,
    render: (nodes) => render(nodes, ctx),
    script: (name) => scripts.add(name),
    sidebar: document.sidebar,
  });
  const screens = document.screens.map((screen) => render([screen], ctx));
  // With to= links, only the first Screen shows on load and a link shows another (SCRIPTS.to).
  // Without, nothing could reach a hidden Screen, so they all show.
  const body = screens.map((html, i) => (i > 0 && scripts.has("to") ? html.replace(/^<section/, "<section hidden") : html)).join("\n");
  const handlers = (Object.keys(SCRIPTS) as Script[]).filter((name) => scripts.has(name)).map((name) => SCRIPTS[name]);
  const title = esc(document.screens[0]!.label!);
  const buttons = (Object.keys(VIEWPORTS) as Viewport[]).map(
    (name) =>
      `<button type="button" value="${name}" data-width="${VIEWPORTS[name]}" aria-pressed="${name === viewport}" title="${VIEWPORTS[name]} px" class="${TOOLBAR.button}">${name[0]!.toUpperCase()}${name.slice(1)}</button>`,
  );
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<style>${readAsset("assets/preview.css")}</style>`,
    "</head>",
    "<body>",
    `<div class="${TOOLBAR.root}">`,
    `<div role="toolbar" aria-label="Viewport" class="${TOOLBAR.bar}">`,
    ...buttons,
    "</div>",
    `<div class="${TOOLBAR.stage}">`,
    `<iframe title="${title}" class="${TOOLBAR.frame}"></iframe>`,
    "</div>",
    "</div>",
    '<template id="sketch">',
    body,
    ...(handlers.length ? ["<script>", ...handlers, "</script>"] : []),
    "</template>",
    `<script>${FRAME}</script>`,
    // Keep a literal </body>, the first in the page: preview --watch splices its reload script in before it.
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function render(nodes: Node[], ctx: (node: Node) => Ctx): string {
  return nodes.map((node) => emitterFor(EMITTERS, node.type, "Preview")(node, ctx(node))).join("\n");
}
