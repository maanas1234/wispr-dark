# Wispr Dark

Dark mode for [Wispr Flow](https://wisprflow.ai) on Windows. Download, double-click, one button.

> Unofficial. Not affiliated with or endorsed by Wispr. It edits Wispr Flow's local app files on your PC, so use it at your own risk. Your original files are backed up and one click restores them.

## How to use

1. Download **Wispr-Dark.exe** from the [Releases](../../releases) page.
2. Double-click it. A black window and a page in your browser open.
3. Click **Make Wispr dark**. Wispr Flow restarts and is dark.

That's it. Keep the black window open while you use the page, and close it when you're done.

Windows may say "Windows protected your PC" because the file isn't signed. Click **More info**, then **Run anyway**.

### The page

- **Make Wispr dark**: quits Wispr Flow, applies the theme, reopens it.
- **Restore original look**: puts the original files back.
- **Keep it dark after updates**: Wispr updates reset the theme. Turn this on and it is re-applied automatically (checked every 30 minutes while you're logged in). It keeps a copy of the app in `%LOCALAPPDATA%\WisprDark` and adds a Windows scheduled task named `WisprDarkPatch`. Turn the switch off to remove the task.

## How it works

Wispr Flow is an Electron app. Wispr Dark adds a small dark stylesheet to the app's own pages inside `app.asar`, so it is dark however you open Wispr. No debug ports, no background process. The original is kept next to it as `app.asar.orig`.

The theme inverts colours and flips images back, so it works without knowing Wispr's internals. It can look slightly off in places (for example, some photos or coloured artwork).

## Command line (optional)

For developers. Needs [Node.js](https://nodejs.org) 18+ if you run from source; the exe works without it.

```bash
Wispr-Dark.exe apply --restart     # make dark
Wispr-Dark.exe restore --restart   # original look
Wispr-Dark.exe status
Wispr-Dark.exe auto on             # or: auto off
```

From source:

```bash
npm install
node bin/wispr-dark.js ui
npm run build:exe                  # builds dist/Wispr-Dark.exe
```

## Uninstall

Click **Restore original look** and turn off **Keep it dark after updates**, then delete the exe (and `%LOCALAPPDATA%\WisprDark` if you used auto mode).

## License

MIT
