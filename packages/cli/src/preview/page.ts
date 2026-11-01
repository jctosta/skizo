import type { Document, Node } from "@skizo/core";
import { readAsset } from "../assets";
import { nodePaths } from "../placeholder";
import { EMITTERS, esc, type Ctx } from "./elements";
import { SCRIPTS, type Script } from "./script";

/** The Preview: one self-contained HTML page holding every Screen. No network: CSS and JS are inlined. */
export function renderPreview(document: Document): string {
  const scripts = new Set<Script>();
  const paths = nodePaths(document);
  const ctx = (node: Node): Ctx => ({ path: paths.get(node)!, render: (nodes) => render(nodes, ctx), script: (name) => scripts.add(name) });
  const screens = document.screens.map((screen) => render([screen], ctx));
  // With to= links, only the first Screen shows on load and a link shows another (SCRIPTS.to).
  // Without, nothing could reach a hidden Screen, so they all show.
  const body = screens.map((html, i) => (i > 0 && scripts.has("to") ? html.replace(/^<section/, "<section hidden") : html)).join("\n");
  const handlers = (Object.keys(SCRIPTS) as Script[]).filter((name) => scripts.has(name)).map((name) => SCRIPTS[name]);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(document.screens[0]!.label!)}</title>`,
    `<style>${readAsset("assets/preview.css")}</style>`,
    "</head>",
    "<body>",
    body,
    ...(handlers.length ? ["<script>", ...handlers, "</script>"] : []),
    // Keep a literal </body>: preview --watch splices its reload script in before it.
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function render(nodes: Node[], ctx: (node: Node) => Ctx): string {
  return nodes
    .map((node) => {
      const emit = EMITTERS[node.type];
      if (!emit) throw new Error(`Preview has no emitter for Element type ${node.type}`);
      return emit(node, ctx(node));
    })
    .join("\n");
}
