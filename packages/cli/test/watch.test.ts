import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { runCli, startCli, withFiles } from "./helpers/run-cli";

const VALID = `Screen "Orders"\n  Heading "Recent orders"\n`;

/** Starts `preview orders.skz --watch` in `cwd` and waits for the URL it prints. Stopped when the test ends. */
async function watchPreview(cwd: string) {
  const cli = startCli(["preview", "orders.skz", "--watch"], cwd);
  const url = await vi.waitUntil(() => cli.out.stdout.match(/^Preview: (http:\S+)$/m)?.[1]);
  return { cli, url };
}

const page = async (url: string) => (await fetch(url)).text();

test("preview --watch writes <name>.html, serves the Preview and prints its URL", async () => {
  const cwd = withFiles({ "orders.skz": VALID });
  const { url } = await watchPreview(cwd);
  expect({ written: existsSync(join(cwd, "orders.html")), served: await page(url) }).toEqual({
    written: true,
    served: expect.stringContaining("Recent orders"),
  });
});

test("only the served page listens for reloads; the written file stays offline", async () => {
  const cwd = withFiles({ "orders.skz": VALID });
  const { url } = await watchPreview(cwd);
  expect({ served: await page(url), written: readFileSync(join(cwd, "orders.html"), "utf8") }).toEqual({
    served: expect.stringContaining("EventSource"),
    written: expect.not.stringContaining("EventSource"),
  });
});

test("saving the source rebuilds the Preview it serves and writes", async () => {
  const cwd = withFiles({ "orders.skz": VALID });
  const { url } = await watchPreview(cwd);
  writeFileSync(join(cwd, "orders.skz"), `Screen "Invoices"\n`);
  await expect.poll(() => page(url)).toContain("Invoices");
  expect(readFileSync(join(cwd, "orders.html"), "utf8")).toContain("Invoices");
});

test("watching survives an atomic save (temp file renamed over the source)", async () => {
  const cwd = withFiles({ "orders.skz": VALID });
  const { url } = await watchPreview(cwd);
  writeFileSync(join(cwd, ".orders.skz.tmp"), `Screen "Invoices"\n`);
  renameSync(join(cwd, ".orders.skz.tmp"), join(cwd, "orders.skz"));
  await expect.poll(() => page(url)).toContain("Invoices");
  writeFileSync(join(cwd, "orders.skz"), `Screen "Payments"\n`);
  await expect.poll(() => page(url)).toContain("Payments");
});

test("a save that fails check prints its errors and keeps serving the last good Preview", async () => {
  const BROKEN = `Screen "Orders"\n  Headng "Totals"\n`;
  const checked = await runCli(["check", "orders.skz"], withFiles({ "orders.skz": BROKEN }));
  const cwd = withFiles({ "orders.skz": VALID });
  const { cli, url } = await watchPreview(cwd);
  writeFileSync(join(cwd, "orders.skz"), BROKEN);
  await vi.waitUntil(() => cli.out.stderr);
  const written = readFileSync(join(cwd, "orders.html"), "utf8");
  expect({ stderr: cli.out.stderr, served: await page(url), written }).toEqual({
    stderr: checked.stdout,
    served: expect.stringContaining("Recent orders"),
    written: expect.stringContaining("Recent orders"),
  });
});

test("preview --watch refuses to start on a file that fails check", async () => {
  const cwd = withFiles({ "orders.skz": `Headng "x"\n` });
  const { code, stderr } = await runCli(["preview", "orders.skz", "--watch"], cwd);
  expect({ code, stderr }).toEqual({ code: 1, stderr: expect.stringContaining("Headng") });
});

test("a request with a foreign Host gets 403, so a DNS-rebinding page cannot read the Preview", async () => {
  const { url } = await watchPreview(withFiles({ "orders.skz": VALID }));
  const status = await new Promise((done, failed) =>
    get(url, { headers: { host: "evil.example" } }, (res) => (res.resume(), done(res.statusCode))).on("error", failed),
  );
  expect(status).toBe(403);
});

test("Ctrl-C stops the server and exits 0", async () => {
  const { cli, url } = await watchPreview(withFiles({ "orders.skz": VALID }));
  const code = await cli.stop();
  expect({ code, served: await fetch(url).then(() => true, () => false) }).toEqual({ code: 0, served: false });
});
