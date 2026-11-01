// Packs @jctosta/skizo as it would be published, installs the tarball into an empty project with npm and runs the
// installed bins there, away from the workspace: the package must carry core, the Guide and the assets itself.
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, expect, test } from "vitest";
import { tempDir } from "./helpers/run-cli";

const CLI = fileURLToPath(new URL("..", import.meta.url));
const EXAMPLE = fileURLToPath(new URL("./fixtures/spec-example/input.skz", import.meta.url));
let app: string;

beforeAll(() => {
  const packed = tempDir();
  // Bundle only, then pack without prepack: its full build would rewrite assets/ while other slow tests read them.
  // The test scripts build assets/ before any test runs.
  execFileSync("pnpm", ["exec", "tsdown"], { cwd: CLI, stdio: "pipe" });
  execFileSync("pnpm", ["pack", "--config.ignore-scripts=true", "--pack-destination", packed], { cwd: CLI, stdio: "pipe" });
  app = tempDir();
  writeFileSync(join(app, "package.json"), '{ "private": true }\n');
  // Offline: the package has no dependencies to fetch.
  const tarball = join(packed, readdirSync(packed)[0]!);
  execFileSync("npm", ["install", "--offline", "--no-audit", "--no-fund", tarball], { cwd: app, stdio: "pipe" });
  copyFileSync(EXAMPLE, join(app, "orders.skz"));
}, 60_000);

/** Runs an installed bin the way a user's shell would. */
const bin = (name: string, args: string[]) => spawnSync(join(app, "node_modules/.bin", name), args, { cwd: app, encoding: "utf8" });

test("the package provides skizo and skz and depends on nothing, so no unpublished package is needed", () => {
  const manifest = JSON.parse(readFileSync(join(app, "node_modules/@jctosta/skizo/package.json"), "utf8"));
  expect({ bin: manifest.bin, dependencies: manifest.dependencies, core: existsSync(join(app, "node_modules/@skizo")) }).toEqual({
    bin: { skizo: "dist/cli.mjs", skz: "dist/cli.mjs" },
    dependencies: undefined,
    core: false,
  });
});

test("skizo check runs from the installed package", () => {
  const { status, stdout, stderr } = bin("skizo", ["check", "orders.skz"]);
  expect({ status, stdout, stderr }).toEqual({ status: 0, stdout: "orders.skz: ok\n", stderr: "" });
});

test("skz guide prints the Guide shipped in the package", () => {
  const { status, stdout } = bin("skz", ["guide"]);
  expect({ status, stdout }).toEqual({ status: 0, stdout: readFileSync(join(CLI, "GUIDE.md"), "utf8") });
});

test("skizo preview inlines the CSS and icons shipped in the package", () => {
  const { status } = bin("skizo", ["preview", "orders.skz"]);
  const html = readFileSync(join(app, "orders.html"), "utf8");
  expect({ status, css: html.includes(readFileSync(join(CLI, "assets/preview.css"), "utf8")), icons: html.includes("<svg") }).toEqual({
    status: 0,
    css: true,
    icons: true,
  });
});
