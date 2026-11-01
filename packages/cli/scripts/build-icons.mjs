// Writes assets/icons.json from lucide-static: {"icons": {name: inner SVG markup}, "aliases": {alias: name}}.
// lucide-static is a build-time devDependency only (55MB unpacked); the package ships just this JSON.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const root = dirname(createRequire(import.meta.url).resolve("lucide-static/package.json"));
const svgs = join(root, "icons");
const inner = (name) => {
  const svg = readFileSync(join(svgs, `${name}.svg`), "utf8").match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!svg) throw new Error(`lucide-static: icons/${name}.svg holds no <svg>...</svg> element`);
  return svg[1]
    .replace(/\s+/g, " ")
    .replaceAll(" />", "/>")
    .replace(/>\s+</g, "><")
    .trim();
};

// icon-nodes.json is keyed by the canonical names; every other file in icons/ is an alias with identical markup.
const names = Object.keys(JSON.parse(readFileSync(join(root, "icon-nodes.json"), "utf8")));
const icons = Object.fromEntries(names.map((name) => [name, inner(name)]));
const byMarkup = new Map(names.map((name) => [icons[name], name]));
const aliases = {};
for (const file of readdirSync(svgs).sort()) {
  const name = file.replace(/\.svg$/, "");
  if (name in icons) continue;
  const target = byMarkup.get(inner(name));
  if (!target) throw new Error(`lucide-static: ${file} is neither an icon nor an alias of one`);
  aliases[name] = target;
}

const out = new URL("../assets/icons.json", import.meta.url);
mkdirSync(new URL(".", out), { recursive: true });
writeFileSync(out, JSON.stringify({ icons, aliases }));
