# Development Guidelines

## Text Encoding

All source files, documentation, and project configuration must be UTF-8.

This project includes Chinese UI strings, so encoding mistakes can easily create mojibake such as `姝ｅ湪`, `鏃犳硶`, `鐢诲竷`, `瀵煎叆`, `鍒濆`, `鈫`, or `�`. Treat any such text in user-facing strings as a bug.

Editing rules:

- Use `apply_patch` for normal source edits.
- Do not use PowerShell as a text editor for source files. PowerShell is fine for running commands, tests, builds, and searches, but avoid `Set-Content`, shell redirection, or command-built replacement pipelines for files that may contain non-ASCII text.
- Do not paste large Chinese strings directly into shell commands.
- For bulk rewrites, use Node or Python and explicitly read/write UTF-8:

```ts
fs.readFileSync(path, 'utf8');
fs.writeFileSync(path, content, 'utf8');
```

```py
Path(path).read_text(encoding='utf-8')
Path(path).write_text(content, encoding='utf-8')
```

Verification:

- Run `npm run check:encoding` after changing user-facing text, translations, docs, import/export status strings, or notification messages.
- Run `npm run build` before handing off code changes.

## Confirmation UI

All user-facing confirmation prompts must use the shared `ConfirmDialog` component from `src/components/ConfirmDialog.tsx`.

Do not use browser-native dialogs such as `window.confirm`, `window.alert`, or `window.prompt` for product UI. Native dialogs do not match the app styling, cannot show structured context, and interrupt the browser in ways that feel inconsistent with the editor.

Use `ConfirmDialog` when an action needs explicit user choice, especially when it can change canvas size, overwrite data, delete content, switch modes, or discard work.

Recommended pattern:

```tsx
<ConfirmDialog
  isOpen={isOpen}
  isClosing={isClosing}
  title="Resize canvas?"
  message="The imported media size does not match the current canvas."
  cancelLabel="Keep current size"
  confirmLabel="Resize canvas"
  onCancel={handleCancel}
  onConfirm={handleConfirm}
>
  {/* Optional structured details can go here. */}
</ConfirmDialog>
```

If a confirmation needs custom content, pass it as `children` instead of creating a new modal shell. If it needs a different visual intent, use the `tone` prop or extend `ConfirmDialog` deliberately.

Small inline two-step confirmations, such as a button temporarily changing to "confirm", may still be used for low-risk repeated toolbar actions. Modal confirmation flows should use `ConfirmDialog`.
