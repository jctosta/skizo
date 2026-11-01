# Contributing to Skizo

Thank you for your help. Skizo is in alpha, so the language can still change. Before you start a large change, open an issue and describe it.

## Set up

You need Node.js 22.18 or later and pnpm 12.

```sh
pnpm install
pnpm exec playwright install chromium   # once, for the slow tests
```

## Test

```sh
pnpm test          # fast tests, in process (about 1 second)
pnpm test:slow     # browser, type-check and package tests
pnpm typecheck
```

- The tests call the CLI in process. Test behavior through the CLI, not the internals of `packages/core`.
- Most tests compare the output with golden files in `packages/cli/test/fixtures/<case>/`. A new folder with an `input.skz` file is a new test.
- To write missing golden files, run `pnpm exec vitest run --project fast -u`. Read each new file before you commit it.
- A slow test needs a reason that a fast test cannot cover, for example a real browser.

## Add an Element type

Add one entry to each of these places:

1. `ELEMENTS` in `packages/core/src/elements.ts`: the schema that `skizo check` uses.
2. `CLASSES` in `packages/cli/src/classes.ts`: the Tailwind classes.
3. `EMITTERS` in `packages/cli/src/preview/elements.ts` and in `packages/cli/src/shadcn/elements.ts`.
4. The Elements table in `packages/cli/GUIDE.md`. A test fails if the Guide and the schemas do not agree.
5. An entry in `docs/content.mjs`. The docs build fails if an Element type has no entry.

Use the terms in [`GLOSSARY.md`](GLOSSARY.md) in code, tests and messages.

## Documentation

`docs/index.html` is generated. Do not edit it.

1. Edit `docs/content.mjs`, `examples/*.skz` or `scripts/docs.mjs`.
2. Run `pnpm build:docs`.
3. Commit `docs/index.html` with your change. CI fails if the committed page does not match its sources.

Write tutorials and instructions in [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/): short sentences, active voice, one instruction in each sentence.

## Pull requests

- Keep each pull request to one change.
- In the commit message, tell why you made the change.
- CI must pass: the type-check, all tests and the docs check.

Contributions are under the [MIT license](LICENSE) of the project.
