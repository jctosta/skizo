import { readFileSync } from "node:fs";
import { ELEMENTS } from "@skizo/core";
import { expect, test } from "vitest";
import { runCli } from "./helpers/run-cli";

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

test("no arguments prints the same usage on stderr with exit code 2", async () => {
  const help = await runCli(["--help"]);
  const { code, stdout, stderr } = await runCli([]);
  expect({ code, stdout, stderr }).toEqual({ code: 2, stdout: "", stderr: help.stdout });
});

test("every Element type check accepts appears in the Guide's Elements table", async () => {
  const { stdout } = await runCli(["guide"]);
  const table = stdout.split("## Elements")[1]?.split("```")[1] ?? "";
  // Element types named in the table, outside quoted Labels: "Tabs > Tab", "(same for Switch)", "Item" all count.
  const named = new Set(table.replace(/"[^"]*"/g, "").match(/\b[A-Z][a-z]\w*/g));
  expect(Object.keys(ELEMENTS).filter((type) => !named.has(type))).toEqual([]);
});
