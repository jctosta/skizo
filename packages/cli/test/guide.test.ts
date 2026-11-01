import { readFileSync } from "node:fs";
import { ELEMENTS } from "@skizo/core";
import { expect, test } from "vitest";
import { runCli, withFiles } from "./helpers/run-cli";

const GUIDE = readFileSync(new URL("../GUIDE.md", import.meta.url), "utf8");

test("guide prints the shipped Guide verbatim and exits 0", async () => {
  const { code, stdout, stderr } = await runCli(["guide"]);
  expect({ code, stdout, stderr }).toEqual({ code: 0, stdout: GUIDE, stderr: "" });
});

const commandsIn = (usage: string) => [...usage.matchAll(/^ {2}skizo (\w+)/gm)].map((m) => m[1]);

test("--help lists every command, points agents to skizo guide and exits 0", async () => {
  const { code, stdout } = await runCli(["--help"]);
  expect({ code, commands: commandsIn(stdout), pointer: /agents.*`skizo guide`/i.test(stdout) }).toEqual({
    code: 0,
    commands: ["guide", "check", "preview", "export"],
    pointer: true,
  });
});

test("guide given an argument is a usage error instead of ignoring it", async () => {
  const { code, stdout, stderr } = await runCli(["guide", "orders.skz"]);
  expect({ code, stdout, stderr }).toEqual({ code: 2, stdout: "", stderr: "skizo guide: takes no arguments\n" });
});

test("no arguments prints the same usage on stderr with exit code 2", async () => {
  const help = await runCli(["--help"]);
  const { code, stdout, stderr } = await runCli([]);
  expect({ code, stdout, stderr }).toEqual({ code: 2, stdout: "", stderr: help.stdout });
});

// The Guide's Elements table, one entry per row (a line indented under a row continues it).
const ROWS = (GUIDE.split("## Elements")[1]?.split("```")[1] ?? "").replace(/\n {2,}/g, " ").split("\n").filter(Boolean);
/** Element types a row names, outside quoted Labels: "Tabs > Tab", "(same for Switch)", "Item" all count. */
const typesIn = (row: string) => new Set(row.replace(/"[^"]*"/g, "").match(/\b[A-Z][a-z]\w*/g));
/** Every prop=value a row shows, e.g. ["level", "2|1|3|4"]. */
const valuesIn = (row: string) => [...row.matchAll(/([a-z][a-z-]*)=("[^"]*"|\S+?)(?=[;\s]|$)/g)].map((m) => [m[1]!, m[2]!] as const);
const NAMED = new Set(ROWS.flatMap((row) => [...typesIn(row)]));
/** The Guide's shared size/gap values: "`size` and `gap` are always `md|sm|lg`". */
const SIZES = GUIDE.match(/`size` and `gap` are always `([^`]+)`/)?.[1];
/** A type's props plus those its direct children may set (Grid's span): its row in the Guide names both. */
const propsOf = (type: string) => ({ ...ELEMENTS[type]?.props, ...ELEMENTS[type]?.childProps });

test("every Element type check accepts appears in the Guide's Elements table", () => {
  expect(Object.keys(ELEMENTS).filter((type) => !NAMED.has(type))).toEqual([]);
});

test("every Element type the Guide's Elements table names is one check accepts", () => {
  expect([...NAMED].filter((type) => !ELEMENTS[type])).toEqual([]);
});

test("every prop check accepts is named in a row of the Guide that names its Element type", () => {
  const missing = Object.keys(ELEMENTS).flatMap((type) =>
    Object.keys(propsOf(type))
      .filter((prop) => !ROWS.some((row) => typesIn(row).has(type) && row.split(/[^a-z0-9-]+/).includes(prop)))
      .map((prop) => `${type} ${prop}`),
  );
  expect(missing).toEqual([]);
});

test("every prop=value in the Guide is a prop of that row's Element types, with exactly the values check accepts", () => {
  const drift = ROWS.flatMap((row) =>
    valuesIn(row).flatMap(([prop, shown]) => {
      const spec = [...typesIn(row)].map((type) => propsOf(type)[prop]).find(Boolean);
      const range = shown.match(/^(\d+)\.\.(\d+)$/);
      if (!spec) return [`${row.split(/\s/)[0]}: ${prop} is no prop of ${[...typesIn(row)].join(", ")}`];
      if (shown.includes("|") && (spec.kind !== "enum" || spec.values.join("|") !== shown))
        return [`${prop}=${shown}, check: ${spec.kind === "enum" ? spec.values.join("|") : spec.kind}`];
      if (range && (spec.kind !== "number" || `${spec.min}..${spec.max}` !== shown))
        return [`${prop}=${shown}, check: ${spec.kind === "number" ? `${spec.min}..${spec.max}` : spec.kind}`];
      if (shown === "N" && spec.kind !== "number") return [`${prop}=N, check: ${spec.kind}`];
      if (shown === "W:H" && spec.kind !== "ratio") return [`${prop}=W:H, check: ${spec.kind}`];
      return [];
    }),
  );
  expect(drift).toEqual([]);
});

test("every enum check accepts is listed in the Guide with its values, default first", () => {
  const unlisted = Object.keys(ELEMENTS).flatMap((type) =>
    Object.entries(propsOf(type)).flatMap(([prop, p]) => {
      if (p.kind !== "enum") return [];
      const values = p.values.join("|");
      if (prop === "size" || prop === "gap") return values === SIZES ? [] : [`${type} ${prop}=${values}, Guide: ${SIZES}`];
      // A row may borrow another type's values by naming it: Menu "variant ... (as Button)".
      const kin = new Set(ROWS.filter((row) => typesIn(row).has(type)).flatMap((row) => [...typesIn(row)]));
      const shown = ROWS.some(
        (row) => [...typesIn(row)].some((t) => kin.has(t)) && valuesIn(row).some(([k, v]) => k === prop && v === values),
      );
      return shown ? [] : [`${type} ${prop}=${values}`];
    }),
  );
  expect(unlisted).toEqual([]);
});

test("every non-enum default check fills in is stated in the Guide, as prop=... (default X)", () => {
  const unstated = Object.entries(ELEMENTS).flatMap(([type, spec]) =>
    Object.entries(spec.props).flatMap(([prop, p]) => {
      if (!("default" in p) || p.default === undefined) return [];
      const stated = new RegExp(`\\b${prop}=\\S+ \\(default ${p.default}\\)`);
      return ROWS.some((row) => typesIn(row).has(type) && stated.test(row)) ? [] : [`${type} ${prop} (default ${p.default})`];
    }),
  );
  expect(unstated).toEqual([]);
});

test("the Guide's example passes check", async () => {
  const example = GUIDE.split("## Example")[1]?.split("```")[1]?.replace(/^\n/, "") ?? "";
  const { code, stdout } = await runCli(["check", "example.skz"], withFiles({ "example.skz": example }));
  expect({ code, stdout }).toEqual({ code: 0, stdout: "example.skz: ok\n" });
});
