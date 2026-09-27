# Echidna Header

Auto-generates and maintains the Echidna project header block on every file you create — project name, git branch, login, and created/updated timestamps. Comment style adapts to the file type (`/* */` for C-family languages, `#` for Python/shell, `<!-- -->` for HTML).

```
/* ************************************************************************ */
/* PROJECT NAME: echidna-net;                                               */
/* BRANCH: feature/greeting-handshake                                      */
/* LOGIN: the_nighthawk                                                    */
/* DIRECTORY_NAME(src)   CREATED: 24/5/2099(10:00 am)   UPDATED: 24/5/2099(10:30 pm) */
/* FILE_NAME(main.c)   CREATED: 24/5/2099(10:02 am)   UPDATED: 24/5/2099(10:30 pm) */
/*                                                                           */
/* ************************************************************************ */
```

## What it does

- **New file created** → header inserted automatically (toggle with `echidnaHeader.autoInsertOnCreate`)
- **File saved** → the `UPDATED` timestamps on both the directory and file lines refresh automatically (toggle with `echidnaHeader.autoUpdateOnSave`) — `CREATED` never changes
- **Branch** is read live from git (`git rev-parse --abbrev-ref HEAD`) in the file's directory
- **Project name** defaults to your workspace folder name, or set `echidnaHeader.projectName` to override
- Commands are also available manually: `Echidna: Insert Header` and `Echidna: Update Header Timestamp` (Cmd/Ctrl+Shift+P)
- **`Ctrl+H`** (`Cmd+H` on mac) inserts the header into the current file

### Heads up: Ctrl+H conflicts with VS Code's default Find & Replace

VS Code will likely ask which one should win the first time both are bound, or Find & Replace may keep taking priority. To make Ctrl+H fully yours:

1. `Ctrl/Cmd+Shift+P` → "Preferences: Open Keyboard Shortcuts"
2. Search `editor.action.startFindReplaceAction`
3. Click the shortcut, press the trash/remove icon to clear its `Ctrl+H` binding
4. Echidna's `Ctrl+H` now runs cleanly with no conflict

If you'd rather not touch VS Code's default at all, change the binding in `package.json` under `contributes.keybindings` to something unclaimed instead, e.g. `ctrl+alt+h`.

## Settings

| Setting | Default | Description |
|---|---|---|
| `echidnaHeader.login` | `the_nighthawk` | Login shown in the header |
| `echidnaHeader.projectName` | *(empty → workspace folder name)* | Project name override |
| `echidnaHeader.autoInsertOnCreate` | `true` | Auto-insert header on new files |
| `echidnaHeader.autoUpdateOnSave` | `true` | Auto-refresh UPDATED timestamps on save |
| `echidnaHeader.width` | `100` | Total character width of the header block |

## Running it locally (no publishing needed)

1. Open this folder in VS Code.
2. Press **F5** — this launches an "Extension Development Host" window with the extension active. Create or save a file there to see it work.

## Installing it as a real extension in your normal VS Code

You need `vsce` (the packaging tool) once:

```bash
npm install -g @vscode/vsce
```

Then, from this folder:

```bash
vsce package
```

This produces `echidna-header-0.1.0.vsix`. Install it with:

```bash
code --install-extension echidna-header-0.1.0.vsix
```

Reload VS Code and it's active in every workspace.

## Notes / known limits (put these in your own NOTES.md once this becomes an Echidna circle)

- [ ] Header detection is marker-based (`DIRECTORY_NAME(`) — a hand-edited header that removes this marker won't be recognized for updates.
- [ ] Git branch lookup shells out to `git`; it silently falls back to `none` if git isn't installed or the file isn't in a repo.
- [ ] No uninstall/re-header command yet if you want to change the header format after files already have one.
