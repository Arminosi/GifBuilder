# Agent Guidelines

This project contains Chinese UI text and must be edited as UTF-8.

Before changing code, read `docs/DEVELOPMENT_GUIDELINES.md`.

## Encoding Rules

- Treat all source, docs, and config files as UTF-8.
- Use `apply_patch` for manual source edits.
- Do not use PowerShell, shell redirection, `Set-Content`, or ad-hoc terminal text pipelines to write source files that may contain non-ASCII text.
- If a bulk rewrite is needed, use a Node or Python script with explicit UTF-8 reads and writes.
- Do not paste large Chinese strings directly into shell commands. Put them in a patch or a UTF-8 source file.
- After editing user-facing text, run `npm run check:encoding`.
- Before finishing code changes, run `npm run build`.

These rules exist to prevent mojibake and replacement characters from entering the UI.
