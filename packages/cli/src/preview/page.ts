import type { Document, Node } from "@skizo/core";
import { readAsset } from "../assets";
import { EMITTERS, esc, type Ctx } from "./elements";

/** The Preview: one self-contained HTML page holding every Screen. No network: CSS is inlined. */
export function renderPreview(document: Document): string {
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
    render(document.screens, ""),
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** Renders `nodes`, the children of the node at `parent` (top level: "", where Screens take their id as path). */
function render(nodes: Node[], parent: string): string {
  return nodes
    .map((node, i) => {
      const emit = EMITTERS[node.type];
      if (!emit) throw new Error(`Preview has no emitter for Element type ${node.type}`);
      const path = parent ? `${parent}/${i}` : (node.props.id as string);
      const ctx: Ctx = { path, render: (children) => render(children, path) };
      return emit(node, ctx);
    })
    .join("\n");
}
