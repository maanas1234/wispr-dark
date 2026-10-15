#!/usr/bin/env node
const core = require("../src/core");
const { startUi } = require("../src/ui");
const { inExe } = require("../src/asset");

const HELP = `wispr-dark: dark mode for Wispr Flow (Windows)

  wispr-dark ui          open the simple window (recommended)
  wispr-dark apply       make Wispr Flow dark  [--restart quits and reopens Wispr]
  wispr-dark restore     put the original look back  [--restart]
  wispr-dark status      show what is installed and patched
  wispr-dark auto on     re-apply automatically after Wispr updates
  wispr-dark auto off    stop re-applying automatically
`;

const args = process.argv.slice(2);
if (inExe && args.length === 0) args.push("ui"); // double-click opens the window
const flag = (f) => args.includes(f);
const log = flag("--quiet") ? () => {} : (m) => console.log(m);

(async () => {
  if (process.platform !== "win32") throw new Error("wispr-dark only supports Windows.");
  switch (args[0]) {
    case "--version": case "-v": console.log(require("../package.json").version); return;
    case "ui": return startUi(flag("--no-open"));
    case "apply": await core.apply({ restart: flag("--restart"), log }); return;
    case "restore": core.restore({ restart: flag("--restart"), log }); return;
    case "status":
      for (const v of core.status())
        console.log(`${v.version}  ${v.patched ? "dark" : "original"}${v.running ? "  (running)" : ""}`);
      console.log(`auto re-apply: ${core.autoEnabled() ? "on" : "off"}`);
      return;
    case "auto":
      if (args[1] === "on") { core.autoEnable(__filename); log("auto re-apply on"); }
      else if (args[1] === "off") { core.autoDisable(); log("auto re-apply off"); }
      else console.log(HELP);
      return;
    default: console.log(HELP);
  }
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
