import type { Document, Node } from "@skizo/core";

// Placeholder content shared by every Backend. Deterministic: seeded by the node path,
// so reruns and re-exports diff cleanly and the Preview shows what the export writes.

/**
 * The node path of every Element, the seed for its placeholder content: `<screen id>/<child index>/...`,
 * slot children as `<path>/actions/<i>`. Taken from the AST, so it does not depend on how emitters nest output.
 */
export function nodePaths(document: Document): Map<Node, string> {
  const paths = new Map<Node, string>();
  const walk = (node: Node, path: string) => {
    paths.set(node, path);
    node.children.forEach((child, i) => walk(child, `${path}/${i}`));
    for (const [slot, nodes] of Object.entries(node.slots ?? {})) nodes.forEach((child, i) => walk(child, `${path}/${slot}/${i}`));
  };
  for (const screen of document.screens) walk(screen, screen.props.id as string);
  return paths;
}

const PEOPLE = ["Ana Souza", "Bruno Lima", "Carla Dias", "Diego Rocha", "Elena Costa", "Felipe Alves", "Grace Kim", "Hugo Martin"];
const STATUSES = ["Active", "Pending", "Paid", "Failed"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A Table's rows: its `|` rows, or `rows=N` placeholder rows with cells guessed from the column names. */
export function tableRows(node: Node, path: string): string[][] {
  if (node.rows) return node.rows;
  const random = seeded(path);
  const pick = (xs: readonly string[]) => xs[Math.floor(random() * xs.length)]!;
  const first = Math.floor(random() * PEOPLE.length);
  return Array.from({ length: (node.props.rows as number | undefined) ?? 0 }, (_, i) => {
    // Stride 3 is coprime with the 8 people, so a Table repeats nobody until row 9.
    const person = PEOPLE[(first + i * 3) % PEOPLE.length]!;
    return (node.props.cols as string[]).map((col) => {
      const name = col.toLowerCase();
      if (name.includes("email")) return `${person.toLowerCase().replace(" ", ".")}@example.com`;
      if (name.includes("name")) return person;
      if (name.includes("date")) return `${pick(MONTHS)} ${1 + Math.floor(random() * 28)}, 2026`;
      if (name.includes("status")) return pick(STATUSES);
      if (name.includes("amount")) return `$${(5 + random() * 995).toFixed(2)}`;
      return `Item ${i + 1}`;
    });
  });
}

/** A List's items: `items`, or `rows=N` placeholders "Item 1" to "Item N". */
export const listItems = (node: Node) =>
  (node.props.items as string[] | undefined) ?? Array.from({ length: (node.props.rows as number | undefined) ?? 0 }, (_, i) => `Item ${i + 1}`);

const WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna " +
  "aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute " +
  "irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non " +
  "proident sunt culpa qui officia deserunt mollit anim id est laborum"
).split(" ");

/** Text lorem=N: `count` words of lorem ipsum, in sentences of 4 to 12 words. */
export function lorem(path: string, count: number): string {
  const random = seeded(path);
  const sentences: string[] = [];
  for (let left = count; left > 0; ) {
    const length = Math.min(left, 4 + Math.floor(random() * 9));
    const words = Array.from({ length }, () => WORDS[Math.floor(random() * WORDS.length)]!).join(" ");
    sentences.push(`${words.charAt(0).toUpperCase()}${words.slice(1)}.`);
    left -= length;
  }
  return sentences.join(" ");
}

/** Avatar initials: "Ana Souza" → "AS", "Carla Maria Dias" → "CD", "bruno" → "B". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words
    .filter((_, i) => i === 0 || i === words.length - 1)
    .map((word) => [...word][0]!.toUpperCase())
    .join("");
}

/** mulberry32 seeded with an FNV-1a hash of `seed`: the same floats in [0, 1) on every run. */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
