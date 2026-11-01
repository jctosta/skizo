import { pascalCase } from "@skizo/core";
import { readAsset } from "./assets";

/**
 * Lucide icons, from assets/icons.json (built from lucide-static by scripts/build-icons.mjs).
 * `icons` maps each canonical name to its inner SVG markup; `aliases` maps old names to canonical ones (`home` → `house`).
 */
type Lucide = { icons: Record<string, string>; aliases: Record<string, string> };

let lucide: Lucide | undefined;
let names: ReadonlySet<string> | undefined;
const load = () => (lucide ??= JSON.parse(readAsset("assets/icons.json")) as Lucide);
const canonical = (name: string) => load().aliases[name] ?? name;

/** Every name `icon=` accepts, canonical names and aliases. The cli passes it to `check` as `iconNames`. */
export const iconNames = () => (names ??= new Set([...Object.keys(load().icons), ...Object.keys(load().aliases)]));

/** Inline SVG for the Preview, hidden from assistive tech (the Label names the control). */
export const iconSvg = (name: string, className = "size-4") =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}" aria-hidden="true">${load().icons[canonical(name)]}</svg>`;

/** The lucide-react component for an icon: `home` → `HouseIcon`. Canonical names are the stable exports. */
export const iconComponent = (name: string) => `${pascalCase(canonical(name))}Icon`;
