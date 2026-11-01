/**
 * The one nearest-match helper behind every "did you mean" hint (Element type, prop, flag, enum value, id).
 * Case-insensitive; a transposition counts as one edit. Returns undefined when nothing is close enough.
 */
export function nearest(word: string, candidates: Iterable<string>): string | undefined {
  const max = Math.max(1, Math.floor(word.length / 3));
  let best: string | undefined;
  let bestDistance = max + 1;
  for (const candidate of candidates) {
    const d = distance(word.toLowerCase(), candidate.toLowerCase());
    if (d < bestDistance) [best, bestDistance] = [candidate, d];
  }
  return best;
}

/** Optimal string alignment distance (Levenshtein plus adjacent transpositions). */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

/** ` — did you mean X?` or "" when nothing is close. */
export const didYouMean = (word: string, candidates: Iterable<string>) => {
  const match = nearest(word, candidates);
  return match === undefined ? "" : ` — did you mean ${match}?`;
};
