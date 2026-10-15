# wispr-dark

Dark mode for [Wispr Flow](https://wisprflow.ai) on Windows. One command, one small window.

> Unofficial. Not affiliated with or endorsed by Wispr. It edits Wispr Flow's local app files on your PC, so use it at your own risk. Your original files are backed up and one click restores them.

## Use it

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npx wispr-dark ui
```

A small page opens in your browser:

- **Make Wispr dark** quits Wispr Flow, applies the theme, and reopens it.
- **Restore original look** puts the original files back.
- **Keep it dark after updates** re-applies the theme in the background when Wispr updates itself (it does so by creating a Windows scheduled task; turn it off any time). For this, install once with `npm i -g wispr-dark` so the task points at a permanent copy.

Prefer the terminal?

```bash
npx wispr-dark apply --restart
npx wispr-dark restore --restart
npx wispr-dark status
```

## How it works

Wispr Flow is an Electron app. `wispr-dark` adds a small dark stylesheet to the app's own pages inside `app.asar`, so it is dark however you open Wispr. No debug ports, no background process. A copy of the original is kept next to it as `app.asar.orig`.

Wispr updates install a fresh folder, which drops the theme. Turn on "Keep it dark after updates" and it is re-applied within about 30 minutes (checked every 30 minutes while you are logged in), or just run `wispr-dark apply` again.

The theme inverts colours and flips images back, so it works without knowing Wispr's internals. It can look slightly off in places (for example, some photos or coloured artwork).

## Uninstall

```bash
wispr-dark restore --restart
wispr-dark auto off
```

## License

MIT
