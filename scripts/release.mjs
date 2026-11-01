// Cuts a git release of the CLI: commits the built package (what `pnpm pack` ships, without scripts or
// devDependencies) to the `release` branch and tags it v<version>, the version in packages/cli/package.json.
// `pnpm add -g github:jctosta/skizo#v<version>` then installs it with no build step and no dependencies.
// Run `pnpm release` from a clean checkout. It fetches origin's release branch and tags, runs the full test suite,
// writes the release commit and tag locally, and installs the tag with npm to prove it works. It never pushes;
// it prints the push command.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
// stdio "inherit" returns null.
const run = (cmd, args, opts = {}) => (execFileSync(cmd, args, { cwd: root, encoding: "utf8", ...opts }) ?? "").trim();
const git = (...args) => run("git", args);
const resolve = (ref) => {
  try {
    return git("rev-parse", "--verify", "--quiet", ref);
  } catch {
    return undefined;
  }
};
const fail = (message) => {
  throw new Error(message);
};

const tmp = mkdtempSync(join(tmpdir(), "skizo-release-"));
try {
  const { version } = JSON.parse(readFileSync(join(root, "packages/cli/package.json"), "utf8"));
  const tag = `v${version}`;
  if (git("status", "--porcelain")) fail("the working tree has changes; commit them first so the release names its source commit");

  // Build on what origin already published, so the push is a fast-forward and no tag is reused.
  if (git("remote").split("\n").includes("origin")) {
    git("fetch", "--quiet", "--tags", "origin");
    try {
      git("fetch", "--quiet", "origin", "+refs/heads/release:refs/remotes/origin/release");
    } catch {
      // Nothing published yet.
    }
  }
  if (resolve(`refs/tags/${tag}`)) fail(`tag ${tag} already exists; bump the version in packages/cli/package.json`);
  const local = resolve("refs/heads/release");
  const published = resolve("refs/remotes/origin/release");
  if (local && published) {
    try {
      git("merge-base", "--is-ancestor", published, local);
    } catch {
      fail("the local release branch does not contain origin/release; run `git branch -f release origin/release` first");
    }
  }
  const parent = local ?? published;
  const source = git("rev-parse", "HEAD");

  try {
    run("pnpm", ["test:all"], { stdio: "inherit" });
  } catch {
    fail("the test suite failed; nothing was released");
  }

  // pnpm pack runs prepack (the build) and rewrites workspace: ranges, so the tarball is exactly what ships.
  run("pnpm", ["-F", "@jctosta/skizo", "pack", "--pack-destination", tmp], { stdio: "inherit" });
  const tarball = readdirSync(tmp).find((f) => f.endsWith(".tgz"));
  run("tar", ["-xzf", join(tmp, tarball), "-C", tmp]);
  const pkgDir = join(tmp, "package");
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  // Installed from git, any build script would run on the user's machine; the package is already built.
  delete pkg.scripts;
  delete pkg.devDependencies;
  writeFileSync(join(pkgDir, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);

  // Commit pkgDir as the next commit on `release` without touching this checkout or its index.
  // --force: a global gitignore must not drop dist/ or assets/ from the release.
  const env = { ...process.env, GIT_DIR: git("rev-parse", "--absolute-git-dir"), GIT_INDEX_FILE: join(tmp, "index"), GIT_WORK_TREE: pkgDir };
  run("git", ["add", "--all", "--force", "."], { cwd: pkgDir, env });
  const tree = run("git", ["write-tree"], { cwd: pkgDir, env });
  const commit = run("git", ["commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", `Release ${tag}\n\nBuilt from ${source}.`]);
  git("update-ref", "refs/heads/release", commit);
  git("tag", "-a", tag, commit, "-m", `Skizo ${tag}, built from ${source}`);

  // Install the tag the way users will, from git, and run it. On failure, take the release back.
  const smoke = join(tmp, "smoke");
  mkdirSync(smoke);
  try {
    run("npm", ["install", "--prefix", smoke, "--no-audit", "--no-fund", "--allow-git=all", `git+file://${root}#${tag}`]);
    const guide = run(join(smoke, "node_modules/.bin/skizo"), ["guide"]);
    if (!guide.startsWith("# Skizo Guide")) fail("the installed skizo guide printed something unexpected");
  } catch (error) {
    git("tag", "-d", tag);
    if (local) git("update-ref", "refs/heads/release", local);
    else git("update-ref", "-d", "refs/heads/release");
    fail(`${tag} does not install from git, so it was removed again:\n${error.message}`);
  }

  console.log(`\nrelease: ${tag} is commit ${commit} on branch release (built from ${source}).`);
  console.log(`It installs from git and runs. Publish it with: git push origin release ${tag}`);
} catch (error) {
  console.error(`release: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
