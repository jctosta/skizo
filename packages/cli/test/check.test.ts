import { expect, test } from "vitest";
import { runCli, withFiles } from "./helpers/run-cli";

const VALID = `Screen "Orders"\n  Heading "Recent orders"\n  "Nothing yet."\n`;

test("a valid file passes check with exit code 0", async () => {
  const { code, stdout, stderr } = await runCli(["check", "orders.skz"], withFiles({ "orders.skz": VALID }));
  expect({ code, stdout, stderr }).toEqual({ code: 0, stdout: "orders.skz: ok\n", stderr: "" });
});

test("a file with errors fails check with exit code 1", async () => {
  const { code } = await runCli(["check", "orders.skz"], withFiles({ "orders.skz": `Screen "Orders"\n\tHeading "x"\n` }));
  expect(code).toBe(1);
});
