# Development Guidelines

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
