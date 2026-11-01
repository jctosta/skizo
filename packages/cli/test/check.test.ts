import { expect, test } from "vitest";
import { runCli, withFiles } from "./helpers/run-cli";

const VALID = `Screen "Orders"\n  Heading "Recent orders"\n  "Nothing yet."\n`;

test("a valid file passes check with exit code 0", async () => {
  const { code, stdout, stderr } = await runCli(["check", "orders.skz"], withFiles({ "orders.skz": VALID }));
  expect({ code, stdout, stderr }).toEqual({ code: 0, stdout: "orders.skz: ok\n", stderr: "" });
});

test("--json emits the same errors machine-readably", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Text "x" size=xl\n  Headng "Totals"\n` });
  const { code, stdout } = await runCli(["check", "orders.skz", "--json"], cwd);
  expect({ code, json: JSON.parse(stdout) }).toEqual({
    code: 1,
    json: {
      errors: [
        { file: "orders.skz", line: 2, type: "Text", message: 'unknown size "xl" (expected: md, sm, lg)' },
        { file: "orders.skz", line: 3, type: "Headng", message: 'unknown Element type "Headng" — did you mean Heading?' },
      ],
    },
  });
});

test("--json on a valid file emits no errors and exits 0", async () => {
  const { code, stdout } = await runCli(["check", "--json", "orders.skz"], withFiles({ "orders.skz": VALID }));
  expect({ code, json: JSON.parse(stdout) }).toEqual({ code: 0, json: { errors: [] } });
});

test("a missing file is reported on stderr with exit code 2", async () => {
  const { code, stderr } = await runCli(["check", "missing.skz"]);
  expect({ code, stderr }).toEqual({ code: 2, stderr: "skizo: cannot read missing.skz\n" });
});

test("an unknown command gets a nearest-match hint and exit code 2", async () => {
  const { code, stderr } = await runCli(["chek", "orders.skz"]);
  expect({ code, stderr }).toEqual({ code: 2, stderr: 'skizo: unknown command "chek" — did you mean check?\n' });
});

test("a command named after an Object method is an unknown command, not a crash", async () => {
  const { code, stderr } = await runCli(["toString", "orders.skz"]);
  expect({ code, stderr }).toEqual({ code: 2, stderr: 'skizo: unknown command "toString"\n' });
});

test("a file with errors fails check with exit code 1", async () => {
  const { code } = await runCli(["check", "orders.skz"], withFiles({ "orders.skz": `Screen "Orders"\n\tHeading "x"\n` }));
  expect(code).toBe(1);
});
