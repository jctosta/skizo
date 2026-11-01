<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo/skizo-lockup-dark.svg">
    <img src="docs/assets/logo/skizo-lockup.svg" alt="Skizo" height="64">
  </picture>
</p>

<p align="center">A tiny, indentation-based language for agents to sketch UI mockups.</p>

Skizo (Esperanto for *sketch*) lets coding agents describe a screen in a few lines instead of writing full HTML. The `skizo` command checks the file, shows it as a clickable Preview page and exports it as shadcn React code.

```
Screen "Orders" subtitle="Track customer orders"
  actions
    Button "New order" icon=plus opens=new
  Table cols="Order,Customer,Amount" rows=3
  Dialog "New order" id=new
    Input "Customer"
    footer
      Button "Create"
```

## Install

```sh
pnpm add -g github:jctosta/skizo#v0.2.0-alpha.1
```

This installs two commands, `skizo` and its alias `skz`. Save the sketch above as `orders.skz`, then run:

```sh
skizo check orders.skz                                   # all errors in one run, each with a hint
skizo preview orders.skz --watch                         # Preview page that reloads on save
skizo export orders.skz --target shadcn --out src/screens
```

## Documentation

The full guide, the Element reference and live examples are in `docs/index.html`. Rebuild it with `pnpm build:docs`. The language spec is in [`docs/SPEC.md`](docs/SPEC.md).
