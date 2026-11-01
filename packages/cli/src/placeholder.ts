import type { Node } from "@skizo/core";

// Placeholder content shared by every Backend (Text lorem=N, Avatar initials, Table rows=N).
// Generators are seeded by node path, never by line or time, so the same source always gives the same
// content in the Preview and every export, and editing one Element leaves the others' content alone.

/** Each node's path: its Screen id, then child indexes, with the slot name for slot children ("orders/2/footer/0"). */
export function nodePaths(screens: Node[]): Map<Node, string> {
  const paths = new Map<Node, string>();
  const walk = (node: Node, path: string) => {
    paths.set(node, path);
    node.children.forEach((child, i) => walk(child, `${path}/${i}`));
    for (const [slot, nodes] of Object.entries(node.slots ?? {})) nodes.forEach((child, i) => walk(child, `${path}/${slot}/${i}`));
  };
  for (const screen of screens) walk(screen, String(screen.props.id));
  return paths;
}

/** Numbers in [0, 1), the same sequence for the same seed (FNV-1a hash of the seed, then mulberry32). */
export function random(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna " +
  "aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute " +
  "irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non " +
  "proident sunt culpa qui officia deserunt mollit anim id est laborum"
).split(" ");

/** `count` words of lorem ipsum, in sentences of 4 to 12 words. */
export function lorem(seed: string, count: number): string {
  const next = random(seed);
  const sentences: string[] = [];
  for (let left = count; left > 0; ) {
    const length = Math.min(left, 4 + Math.floor(next() * 9));
    const words = Array.from({ length }, () => WORDS[Math.floor(next() * WORDS.length)]!).join(" ");
    sentences.push(`${words.charAt(0).toUpperCase()}${words.slice(1)}.`);
    left -= length;
  }
  return sentences.join(" ");
}

/** "Ana Souza" → "AS", "Carla Maria Dias" → "CD", "bruno" → "B". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words
    .filter((_, i) => i === 0 || i === words.length - 1)
    .map((word) => [...word][0]!.toUpperCase())
    .join("");
}
