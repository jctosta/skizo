// Builds docs/index.html, the Skizo documentation: the prose and Element entries in docs/content.mjs, prop tables
// generated from the Element schemas, a live Preview of every example, and the sketches in examples/*.skz.
// Run `pnpm build:docs`, which builds the CLI first. Fails if an example fails `skizo check` or the docs drift from the schemas.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import module from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The docs build imports core's TypeScript source: it needs type stripping (Node 22.18) and module.registerHooks.
if (!module.registerHooks || !process.features.typescript)
  throw new Error(`scripts/docs.mjs needs Node 22.18 or later (this is ${process.version})`);
// core's sources import "./ast" without an extension; let Node find the .ts file.
module.registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".")) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});
const { ELEMENTS } = await import("../packages/core/src/elements.ts");
const { GROUPS, PROP_NOTES, SECTIONS } = await import("../docs/content.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "packages/cli/dist/cli.mjs");
const examplesDir = join(root, "examples");
const tmp = mkdtempSync(join(tmpdir(), "skizo-docs-"));
const skizo = (...args) => execFileSync(process.execPath, [cli, ...args], { encoding: "utf8" });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Escapes text and turns `backticks` into <code>. */
const md = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const span = (cls, s) => `<span class="${cls}">${esc(s)}</span>`;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Light Skizo highlighting: Element type, slot word, Label/strings, prop keys and values, flags, rows, comments.
const TOKEN = /("(?:[^"\\]|\\.)*")|([a-z][a-z0-9-]*)=("(?:[^"\\]|\\.)*"|\S+)|(\S+)/g;
function highlight(body) {
  if (body.startsWith("//")) return span("c", body);
  if (body.startsWith("|")) return span("r", body);
  let first = true;
  return body.replace(TOKEN, (_, str, key, value, word) => {
    const lead = first;
    first = false;
    if (str) return span("s", str);
    if (key) return span("k", key) + "=" + span(value.startsWith('"') ? "s" : "v", value);
    return span(lead ? (/^[A-Z]/.test(word) ? "t" : "slot") : "f", word);
  });
}
const shell = (body) => body.replace(/^(.*?)(\s+#.*)?$/, (_, cmd, comment = "") => esc(cmd) + (comment && span("c", comment)));

/** One block per line. A long line wraps with a hanging indent, so the nesting of the source stays visible. */
const lines = (text, fmt) =>
  text.trimEnd().split("\n").map((line) => {
    const indent = line.match(/^ */)[0].length;
    return `<span class="ln" style="padding-left:${indent + 4}ch">${fmt(line.slice(indent)) || " "}</span>`;
  }).join("");
const codeBlock = (text, fmt, cls = "") => `<pre class="code ${cls}"><code>${lines(text, fmt)}</code></pre>`;
const { version } = JSON.parse(readFileSync(join(root, "packages/cli/package.json"), "utf8"));
const helpers = { skz: (t) => codeBlock(t, highlight), sh: (t) => codeBlock(t, shell), pre: (t) => codeBlock(t, esc), tag: `v${version}` };

// Every Preview inlines the same precompiled CSS; the page keeps one copy and puts it back into each frame.
let css;
const frames = [];
/** Renders Skizo source with the real CLI and returns the index of its frame. */
function frame(source, name, { demo = false, wrapped = false } = {}) {
  const file = join(tmp, `${name}.skz`);
  writeFileSync(file, source);
  try {
    skizo("preview", file);
  } catch (error) {
    throw new Error(`docs example "${name}" fails skizo check:\n${error.stdout}${error.stderr}`);
  }
  const html = readFileSync(join(tmp, `${name}.html`), "utf8");
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  if (css !== undefined && style !== css) throw new Error(`Preview CSS differs in "${name}"`);
  css = style;
  // An example is the whole Preview, with its viewport toolbar. A demo is the sketch alone, as wide as its box:
  // the Preview's <template> in place of the toolbar and frame.
  const page = demo ? html.replace(/<body>[\s\S]*<\/body>/, () => `<body>\n${html.match(/<template id="sketch">\n([\s\S]*?)<\/template>/)[1]}</body>`) : html;
  // srcdoc frames resolve links against this page; the base keeps the Preview's #screen links inside the frame.
  frames.push({ html: page.replace(style, "").replace("<head>", '<head>\n<base href="about:srcdoc">'), demo, wrapped });
  return frames.length - 1;
}

// ---- Element reference ----

const covered = new Map();
for (const group of GROUPS)
  for (const entry of group.entries)
    for (const type of entry.types) {
      if (!ELEMENTS[type]) throw new Error(`docs/content.mjs documents unknown Element type ${type}`);
      if (covered.has(type)) throw new Error(`Element type ${type} is documented twice`);
      covered.set(type, entry);
      for (const prop of Object.keys(entry.about?.[type]?.props ?? {}))
        if (!ELEMENTS[type].props[prop] && !ELEMENTS[type].childProps?.[prop]) throw new Error(`docs/content.mjs describes unknown prop ${type} ${prop}`);
    }
const missing = Object.keys(ELEMENTS).filter((type) => !covered.has(type));
if (missing.length) throw new Error(`docs/content.mjs does not document: ${missing.join(", ")}`);

const LUCIDE = '<a href="https://lucide.dev/icons">Lucide</a> icon name';
function valuesOf(p) {
  switch (p.kind) {
    case "flag": return "<i>flag</i>";
    case "string": return '<code>"text"</code>';
    case "icon": return LUCIDE;
    case "enum": return p.values.map((v) => `<code>${esc(v)}</code>`).join(" | ");
    case "number": return p.max !== undefined ? `${p.min ?? 0} to ${p.max}` : p.min !== undefined ? `${p.min} or more` : "number";
    case "ratio": return "<code>W:H</code>";
    case "list": return '<code>"a,b,c"</code>';
    case "ref": return `${p.to.join(" or ")} id`;
  }
  throw new Error(`no docs for prop kind ${p.kind}`);
}
const defaultOf = (p) =>
  p.kind === "enum" ? `<code>${esc(p.values[0])}</code>` : p.default !== undefined ? `<code>${esc(p.default)}</code>` : "";

function propsTable(type, spec, about) {
  const row = (name, p, note) =>
    `<tr><td><code>${esc(name)}</code></td><td>${valuesOf(p)}</td><td>${defaultOf(p)}</td><td>${md(note ?? "")}</td></tr>`;
  const rows = Object.entries(spec.props).map(([name, p]) => row(name, p, about?.props?.[name] ?? PROP_NOTES[name]));
  for (const [name, p] of Object.entries(spec.childProps ?? {}))
    rows.push(row(name, p, about?.props?.[name] ?? `Write it on a direct child, not on the ${type}. The child spans this number of columns. The maximum is cols.`));
  if (!rows.length) return "";
  return `<table class="props"><thead><tr><th>Prop</th><th>Values</th><th>Default</th><th>Description</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function facts(type, spec, about) {
  const list = (types) => types.map((t) => `<a href="#${slug(covered.get(t).types[0])}">${t}</a>`).join(", ");
  const label = spec.label === "none" ? "None" : `${spec.label === "required" ? "Required" : "Optional"}. ${md(about?.label ?? "")}`;
  const children = spec.children === undefined ? "None" : spec.children === "any" ? "Any Elements" : list(spec.children);
  const goes =
    about?.position ?? (type === "Screen" ? "The top level of the file" : spec.parents ? `Directly in ${list(spec.parents)}` : "Anywhere in a Screen");
  const items = [["Label", label], ["Children", children], ["Position", goes]];
  if (spec.slots) items.push(["Slots", spec.slots.map((s) => `<code>${s}</code>`).join(", ")]);
  if (spec.exclusive)
    items.push(["Rule", `Only one child can have <code>${spec.exclusive.flag}</code>.${spec.exclusive.firstByDefault ? " If no child has it, the first child gets it." : ""}`]);
  return `<dl class="facts">${items.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
}

function elementEntry(entry) {
  const id = slug(entry.types[0]);
  const full = /^(Screen|Sidebar)\b/.test(entry.example);
  const source = full ? entry.example : `Screen "${entry.types[0]}"\n${entry.example.replace(/^/gm, "  ")}`;
  const index = frame(source, `element-${id}`, { demo: true, wrapped: !full });
  const height = entry.height ? ` style="height:${entry.height}px"` : "";
  const perType = entry.types
    .map((type) => {
      const spec = ELEMENTS[type];
      const about = entry.about?.[type];
      return `${entry.types.length > 1 ? `<h4>${type}</h4>` : ""}${facts(type, spec, about)}${propsTable(type, spec, about)}`;
    })
    .join("");
  return `
<article class="element" id="${id}">
  <h3><a href="#${id}">${entry.types.join(" / ")}</a></h3>
  <p>${md(entry.summary)}</p>
  <div class="demo">
    <iframe title="Preview of ${esc(entry.types.join(" and "))}" data-frame="${index}"${height}></iframe>
    ${codeBlock(entry.example, highlight)}
  </div>
  ${perType}
  ${entry.notes ? `<ul class="notes">${entry.notes.map((n) => `<li>${md(n)}</li>`).join("")}</ul>` : ""}
  ${entry.shadcn ? `<p class="shadcn"><b>Export:</b> ${md(entry.shadcn)}</p>` : ""}
</article>`;
}

// ---- Examples ----

const lineCount = (code) => code.trimEnd().split("\n").length;
const charCount = (code) => code.length.toLocaleString("en");
const exampleFiles = readdirSync(examplesDir)
  .filter((f) => f.endsWith(".skz"))
  .sort((a, b) => (a === "orders.skz" ? -1 : b === "orders.skz" ? 1 : a.localeCompare(b)));

function exampleSection(file) {
  const name = file.slice(0, -".skz".length);
  const source = readFileSync(join(examplesDir, file), "utf8");
  const index = frame(source, `example-${name}`);
  const out = join(tmp, `tsx-${name}`);
  skizo("export", join(tmp, `example-${name}.skz`), "--target", "shadcn", "--out", out);
  const tsx = readdirSync(out).sort().map((f) => ({ file: f, code: readFileSync(join(out, f), "utf8") }));
  const tsxAll = tsx.map((t) => t.code).join("");
  const tabs = [{ label: file, html: lines(source, highlight) }].concat(tsx.map((t) => ({ label: t.file, html: lines(t.code, esc) })));
  return `
<div class="example" id="example-${name}">
  <h3><a href="#example-${name}">${esc(file)}</a></h3>
  <p class="sizes">The Skizo source has ${lineCount(source)} lines and ${charCount(source)} characters. The shadcn export has
  ${tsx.length} file${tsx.length > 1 ? "s" : ""}, ${lineCount(tsxAll)} lines and ${charCount(tsxAll)} characters, ${(tsxAll.length / source.length).toFixed(1)} times as many.</p>
  <div class="pair">
    <div class="tabbed">
      <div class="tabs" role="tablist">${tabs.map((t, j) => `<button role="tab" aria-selected="${j === 0}" data-tab="${j}">${esc(t.label)}</button>`).join("")}</div>
      ${tabs.map((t, j) => `<pre class="code" data-panel="${j}"${j ? " hidden" : ""}><code>${t.html}</code></pre>`).join("")}
    </div>
    <iframe title="Preview of ${esc(file)}" data-frame="${index}"></iframe>
  </div>
</div>`;
}

// ---- Page ----

const sections = SECTIONS(helpers);
const elementsHtml = GROUPS.map((g) => `<h2 class="group" id="${slug(g.title)}">${esc(g.title)}</h2>${g.entries.map(elementEntry).join("")}`).join("");
const examplesHtml = exampleFiles.map(exampleSection).join("");
rmSync(tmp, { recursive: true, force: true });

// GitHub Pages serves docs/ from main (docs/.nojekyll keeps the files as they are).
const SITE = "https://jctosta.github.io/skizo/";
const REPO = "https://github.com/jctosta/skizo";
const DESCRIPTION = "Skizo is a small language to sketch user interfaces, made for coding agents. The skizo command checks a sketch, shows it as a Preview page and exports it as shadcn React code.";

const nav = `
<a class="brand" href="#top"><img src="assets/logo/skizo-lockup.svg" alt="Skizo" width="87" height="28"> <span class="tag">alpha</span></a>
<a href="${REPO}">GitHub repository</a>
<p class="navhead">Basics</p>
${sections.map((s) => `<a href="#${s.id}">${esc(s.title)}</a>`).join("")}
<p class="navhead"><a href="#elements">Elements</a></p>
${GROUPS.map((g) => `<p class="navgroup">${esc(g.title)}</p>${g.entries.map((e) => `<a href="#${slug(e.types[0])}">${e.types.join(" / ")}</a>`).join("")}`).join("")}
<p class="navhead"><a href="#examples">Examples</a></p>
${exampleFiles.map((f) => `<a href="#example-${f.slice(0, -4)}">${esc(f)}</a>`).join("")}`;

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Skizo documentation</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<link rel="canonical" href="${SITE}">
<meta property="og:type" content="website">
<meta property="og:title" content="Skizo documentation">
<meta property="og:description" content="${esc(DESCRIPTION)}">
<meta property="og:url" content="${SITE}">
<meta property="og:image" content="${SITE}assets/logo/skizo-icon-512.png">
<meta name="twitter:card" content="summary">
<link rel="icon" href="assets/logo/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/logo/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/logo/apple-touch-icon.png">
<!-- Generated by scripts/docs.mjs from docs/content.mjs, the Element schemas and examples/*.skz. Run \`pnpm build:docs\`; do not edit by hand. -->
<style>
  * { box-sizing: border-box; }
  html { scroll-padding-top: 24px; }
  body { margin: 0; font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #0a0a0a; background: #fff; }
  a { color: inherit; }
  code { font: 0.86em ui-monospace, SFMono-Regular, Menlo, monospace; background: #f4f4f5; border-radius: 4px; padding: 1px 5px; }
  .layout { display: grid; grid-template-columns: 248px minmax(0, 1fr); }
  aside { position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 24px 16px 48px; border-right: 1px solid #e5e5e5; background: #fafafa; font-size: 14px; }
  aside a { display: block; padding: 3px 10px; border-radius: 6px; text-decoration: none; color: #404040; }
  aside a:hover { background: #f0f0f0; color: #0a0a0a; }
  aside .brand { display: flex; align-items: center; gap: 10px; padding: 0 10px 12px; }
  aside .brand:hover { background: none; }
  aside .brand img { display: block; }
  .tag { font-size: 11px; font-weight: 600; vertical-align: middle; padding: 2px 8px; border-radius: 999px; background: #0a0a0a; color: #fff; letter-spacing: 0; }
  .navhead { margin: 18px 10px 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #737373; }
  .navhead a { padding: 0; color: inherit; } .navhead a:hover { background: none; }
  .navgroup { margin: 10px 10px 2px; font-size: 13px; font-weight: 600; color: #171717; }
  main { padding: 40px 56px 96px; max-width: 1240px; }
  .prose { max-width: 820px; }
  h1 { font-size: 40px; line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 12px; }
  h2 { font-size: 28px; letter-spacing: -0.02em; margin: 72px 0 12px; padding-top: 8px; border-top: 1px solid #e5e5e5; }
  h2.group { font-size: 22px; border-top: 0; margin-top: 48px; color: #404040; }
  h3 { font-size: 19px; margin: 32px 0 8px; letter-spacing: -0.01em; }
  h3 a, h2 a { text-decoration: none; }
  h4 { font-size: 15px; margin: 24px 0 4px; }
  .lede { font-size: 18px; color: #404040; max-width: 720px; margin: 0 0 24px; }
  .note { color: #525252; font-size: 14px; }
  .prose img { max-width: 100%; height: auto; }
  ul { padding-left: 20px; } li { margin: 4px 0; }
  pre.code { margin: 12px 0; padding: 14px 16px; border-radius: 10px; background: #0a0a0a; color: #e5e5e5; font: 12.5px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; overflow: auto; tab-size: 2; }
  pre.code code { background: none; padding: 0; font: inherit; }
  pre[hidden] { display: none; }
  .ln { display: block; text-indent: -4ch; white-space: pre-wrap; overflow-wrap: anywhere; }
  .t { color: #7dd3fc; font-weight: 600; } .slot { color: #c4b5fd; font-style: italic; } .s { color: #86efac; }
  .k { color: #fca5a5; } .v { color: #fcd34d; } .f { color: #f9a8d4; } .r { color: #d4d4d4; } .c { color: #737373; }
  .hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: start; margin-bottom: 8px; }
  .hero pre.code { margin: 0; }
  .hero .pitch li { margin: 6px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; margin: 12px 0; }
  th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid #e5e5e5; }
  th { font-weight: 600; color: #525252; font-size: 13px; }
  table.props td:first-child, table.ref td:first-child { white-space: nowrap; }
  .element { max-width: 900px; padding-bottom: 8px; }
  .demo { border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; margin: 16px 0; }
  .demo iframe { display: block; width: 100%; height: 96px; border: 0; background: #fff; }
  .demo pre.code { margin: 0; border-radius: 0; }
  .facts { display: flex; flex-wrap: wrap; gap: 4px 28px; margin: 16px 0 4px; font-size: 14px; }
  .facts div { display: flex; gap: 8px; } .facts dt { color: #737373; } .facts dd { margin: 0; }
  .facts a { text-decoration-color: #d4d4d4; }
  .notes { color: #404040; font-size: 14px; }
  .shadcn { font-size: 14px; color: #404040; }
  .example { margin-top: 32px; }
  .sizes { margin: 0 0 12px; color: #525252; font-size: 14px; }
  .pair { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 16px; height: 720px; }
  .pair > iframe { width: 100%; height: 100%; border: 1px solid #e5e5e5; border-radius: 10px; background: #fff; }
  .tabbed { display: flex; flex-direction: column; min-height: 0; border-radius: 10px; background: #0a0a0a; overflow: hidden; }
  .tabbed pre.code { flex: 1; margin: 0; border-radius: 0; }
  .tabs { display: flex; gap: 2px; padding: 6px 6px 0; border-bottom: 1px solid #262626; overflow-x: auto; }
  .tabs button { font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; color: #a3a3a3; background: none; border: 0; border-radius: 6px 6px 0 0; padding: 6px 12px; cursor: pointer; white-space: nowrap; }
  .tabs button[aria-selected="true"] { color: #fafafa; background: #262626; }
  @media (max-width: 1100px) { .pair, .hero { grid-template-columns: 1fr; } .pair { height: auto; } .pair > * { height: 640px; } }
  @media (max-width: 860px) { .layout { display: block; } aside { position: static; height: auto; } main { padding: 24px 20px 64px; } }
</style>
</head>
<body>
<div class="layout">
<aside><nav>${nav}</nav></aside>
<main>
<section id="top" class="prose">
  <h1>Skizo</h1>
  <p class="lede">Skizo is a small language to sketch user interfaces. You write one Element on each line. The
  <code>skizo</code> command checks the file, shows it as a Preview page and exports it as shadcn React code.</p>
  <div class="hero">
    ${helpers.skz(`Screen "Orders" subtitle="Track customer orders"
  actions
    Button "New order" icon=plus opens=new
  Table cols="Order,Customer,Amount" rows=3
  Dialog "New order" id=new
    Input "Customer"
    footer
      Button "Create"`)}
    <ul class="pitch">
      <li><b>Short source.</b> Each line holds one Element. Skizo has no closing tags and no styles.</li>
      <li><b>One way to write each thing.</b> Skizo has ${Object.keys(ELEMENTS).length} Element types. <code>skizo check</code> rejects all other types.</li>
      <li><b>All errors in one run.</b> <code>skizo check</code> shows each error with a hint.</li>
      <li><b>Code that you keep.</b> The export uses the shadcn components of your project.</li>
      <li><b>Phones and tablets.</b> One sketch fits each screen size. The Preview shows each width.</li>
    </ul>
  </div>
</section>
${sections.map((s) => `<section class="prose" id="${s.id}"><h2><a href="#${s.id}">${esc(s.title)}</a></h2>${s.html}</section>`).join("\n")}
<section id="elements">
  <h2><a href="#elements">Elements</a></h2>
  <p class="prose">Each Element type has an example and its live Preview. The prop tables come from the schemas
  that <code>skizo check</code> uses. In a list of values, the first value is the default. All Elements also
  accept <code>id=</code>.</p>
  ${elementsHtml}
</section>
<section id="examples">
  <h2><a href="#examples">Examples</a></h2>
  <p class="prose">These sketches come from the <code>examples</code> folder. For each sketch, the page shows the
  Skizo source next to its Preview. In the Preview, you can click these items:</p>
  <ul class="prose">
    <li>Links and Buttons with <code>to=</code> show other Screens.</li>
    <li>Buttons with <code>opens=</code> show Dialogs and Sheets.</li>
    <li>Tabs, Menus and Selects open when you click them.</li>
  </ul>
  <p class="prose">The other tabs above the source show the output of <code>skizo export --target shadcn</code>.</p>
  <p class="prose">Each Preview opens at desktop width and is smaller to fit this page. To see the sketch at
  tablet or phone width, click Tablet or Phone in the toolbar of the Preview.</p>
  ${examplesHtml}
</section>
</main>
</div>
<script>
  const CSS = ${JSON.stringify(css).replace(/</g, "\\u003c")};
  // Element demos fit their content: no full-height Screens, and no Screen header for wrapped snippets.
  const DEMO_CSS = "[data-screen]{min-height:0!important}";
  const WRAPPED_CSS = "[data-screen]>header{display:none}";
  const FRAMES = ${JSON.stringify(frames).replace(/</g, "\\u003c")};
  for (const frame of document.querySelectorAll("iframe[data-frame]")) {
    const f = FRAMES[frame.dataset.frame];
    const style = CSS + (f.demo ? DEMO_CSS : "") + (f.wrapped ? WRAPPED_CSS : "");
    frame.srcdoc = f.html.replace("<style></style>", () => "<style>" + style + "</style>");
    if (f.demo && !frame.style.height)
      frame.addEventListener("load", () => {
        const body = frame.contentDocument.body;
        const fit = () => (frame.style.height = body.scrollHeight + "px");
        new ResizeObserver(fit).observe(body);
        fit();
      });
  }
  document.addEventListener("click", (event) => {
    const tab = event.target.closest(".tabs button");
    if (!tab) return;
    const box = tab.closest(".tabbed");
    for (const b of box.querySelectorAll(".tabs button")) b.setAttribute("aria-selected", String(b === tab));
    for (const p of box.querySelectorAll("pre")) p.hidden = p.dataset.panel !== tab.dataset.tab;
  });
</script>
</body>
</html>
`;

writeFileSync(join(root, "docs/index.html"), page);
console.log(`wrote docs/index.html (${covered.size} Element types, ${exampleFiles.length} examples, ${Math.round(page.length / 1024)} KB)`);
