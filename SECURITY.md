# Security policy

## Supported versions

Skizo is in alpha. Only the latest release tag gets security fixes.

## Report a vulnerability

Do not open a public issue for a security problem. Report it privately:

1. Open the **Security** tab of the repository.
2. Click **Report a vulnerability**.
3. Give the release tag, the steps to reproduce the problem and its effect.

The maintainer replies in the private advisory. The advisory becomes public after the fix is released.

## Scope

The scope is the `skizo` CLI and its output:

- The parser and the checks of `skizo check`.
- The HTML page that `skizo preview` writes, and the local server of `skizo preview --watch`.
- The React code that `skizo export` writes.
- The release flow: the `release` branch and the `v*` tags that users install from.
