import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { runCli, withFiles } from "./helpers/run-cli";

const exportCells = async (source: string) => {
  const cwd = withFiles({ "customers.skz": source });
  await runCli(["export", "customers.skz", "--target", "shadcn"], cwd);
  const tsx = readFileSync(join(cwd, "customers.tsx"), "utf8");
  return [...tsx.matchAll(/<TableCell>(.*)<\/TableCell>/g)].map((m) => m[1]);
};

test("rows=N fills a Table with N rows whose cells are guessed from the column names", async () => {
  const row = (n: number) => [
    expect.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+$/),
    expect.stringMatching(/^[a-z]+\.[a-z]+@example\.com$/),
    expect.stringMatching(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/),
    expect.stringMatching(/^[A-Z][a-z]+$/),
    expect.stringMatching(/^\$\d+\.\d\d$/),
    `Item ${n}`,
  ];
  const cells = await exportCells(`Screen "Customers"\n  Table cols="Customer name,Email,Signup date,Status,Amount,Plan" rows=2\n`);
  expect(cells).toEqual([...row(1), ...row(2)]);
});

test("the Email cell belongs to the Name in the same row", async () => {
  const [name, email] = await exportCells(`Screen "Customers"\n  Table cols="Name,Email" rows=1\n`);
  expect(email).toBe(`${name!.toLowerCase().replace(" ", ".")}@example.com`);
});
