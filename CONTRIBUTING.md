# Contributing to git-precommit-checks

We want publish consistent contents, that's why we're trying to follow as much as possible the open source guidelines.

Because they are well written and fully detailled, we encourage you to read and follow the [semantic-release guidelines](https://github.com/semantic-release/semantic-release/blob/caribou/CONTRIBUTING.md).

## Tooling

The project comes with its toolbelt for devs automation:

- ESLint + StandardJS / Prettier, for JS rules and formatting
- CommitLint + Commitizen + conventional changelog, for commit message validations
- Husky, in order to manage git hooks inside `package.json`
- PreciseCommit, for pre-commit lint and formatting
- SemanticRelease, for release automation
