// Core logic: patch / restore Wispr Flow's app.asar so its UI is dark. Windows only.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const asar = require("@electron/asar");
const { inExe, asset } = require("./asset");

const ROOT = path.join(process.env.LOCALAPPDATA || "", "WisprFlow");
const CSS = asset("dark.css", "dark.css");
const MARK = 'id="wispr-dark-style"';
const TAG = `<style ${MARK}>${CSS}</style>`;
const PROBE = path.join(".webpack", "renderer", "hub", "index.html");
const TASK = "WisprDarkPatch";

const asarOf = (dir) => path.join(dir, "resources", "app.asar");

function versions() {
  if (!fs.existsSync(ROOT)) throw new Error(`Wispr Flow not found at ${ROOT}`);
  return fs
    .readdirSync(ROOT)
    .filter((d) => /^app-\d/.test(d) && fs.existsSync(asarOf(path.join(ROOT, d))))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((d) => path.join(ROOT, d));
}

function runningExes() {
  try {
    const out = execFileSync(
      "powershell",
      ["-NoProfile", "-Command", "Get-Process 'Wispr Flow' -ErrorAction SilentlyContinue | ForEach-Object { $_.Path }"],
      { encoding: "utf8" }
    );
    return new Set(out.split(/\r?\n/).map((s) => s.trim().toLowerCase()).filter(Boolean));
  } catch {
    return new Set();
  }
}

const isRunning = (dir, running) => running.has(path.join(dir, "Wispr Flow.exe").toLowerCase());
// asar caches archive headers in memory; clear it so a long-running UI sees the file's current state.
const isPatched = (file) => {
  asar.uncacheAll();
  return asar.extractFile(file, PROBE).toString("utf8").includes(MARK);
};

function status() {
  const running = runningExes();
  return versions().map((dir) => ({
    version: path.basename(dir).replace("app-", ""),
    patched: isPatched(asarOf(dir)),
    running: isRunning(dir, running),
    hasBackup: fs.existsSync(asarOf(dir) + ".orig"),
  }));
}

function collect(header) {
  const unpacked = [];
  const html = [];
  (function walk(node, prefix) {
    for (const [name, n] of Object.entries(node.files || {})) {
      const full = prefix ? prefix + "/" + name : name;
      if (n.files) walk(n, full);
      else {
        if (n.unpacked) unpacked.push(name);
        if (/^\.webpack\/renderer\/[^/]+\/index\.html$/.test(full)) html.push(full);
      }
    }
  })(header, "");
  return { unpacked, html };
}

async function patchOne(dir) {
  const file = asarOf(dir);
  if (!fs.existsSync(file + ".orig")) fs.copyFileSync(file, file + ".orig");
  asar.uncacheAll();
  const { unpacked, html } = collect(asar.getRawHeader(file).header);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wispr-dark-"));
  const out = path.join(tmp, "app.asar");
  try {
    asar.extractAll(file, path.join(tmp, "src"));
    for (const rel of html) {
      const f = path.join(tmp, "src", rel);
      const s = fs.readFileSync(f, "utf8");
      fs.writeFileSync(f, /<\/head>/i.test(s) ? s.replace(/<\/head>/i, TAG + "</head>") : TAG + s);
    }
    await asar.createPackageWithOptions(path.join(tmp, "src"), out, {
      unpack: unpacked.length ? `{${unpacked.join(",")}}` : undefined,
    });
    if (!isPatched(out)) throw new Error("repacked archive is missing the theme; aborted, nothing changed");
    fs.copyFileSync(out, file);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function quitWispr() {
  try { execFileSync("taskkill", ["/F", "/IM", "Wispr Flow.exe"], { stdio: "ignore" }); } catch {}
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
}

function startWispr() {
  spawn(path.join(ROOT, "Wispr Flow.exe"), [], { detached: true, stdio: "ignore" }).unref();
}

// Patch every installed version that isn't patched yet. Running versions are skipped unless restart=true.
async function apply({ restart = false, log = () => {} } = {}) {
  const dirs = versions();
  if (restart) quitWispr();
  try {
    const running = runningExes();
    let changed = 0;
    for (const dir of dirs) {
      const name = path.basename(dir);
      if (isPatched(asarOf(dir))) { log(`${name}: already dark`); continue; }
      if (isRunning(dir, running)) { log(`${name}: Wispr is running, quit it first (or use restart)`); continue; }
      log(`${name}: patching...`);
      await patchOne(dir);
      log(`${name}: done`);
      changed++;
    }
    return changed;
  } finally {
    if (restart) startWispr();
  }
}

// Put the untouched original app.asar back.
function restore({ restart = false, log = () => {} } = {}) {
  const dirs = versions();
  if (restart) quitWispr();
  try {
    const running = runningExes();
    let changed = 0;
    for (const dir of dirs) {
      const name = path.basename(dir);
      const file = asarOf(dir);
      if (!isPatched(file)) { log(`${name}: not patched`); continue; }
      if (!fs.existsSync(file + ".orig")) { log(`${name}: no backup found, skipped`); continue; }
      if (isRunning(dir, running)) { log(`${name}: Wispr is running, quit it first (or use restart)`); continue; }
      fs.copyFileSync(file + ".orig", file);
      log(`${name}: restored`);
      changed++;
    }
    return changed;
  } finally {
    if (restart) startWispr();
  }
}

// Scheduled task: re-apply after Wispr auto-updates (every 30 min while logged in).
function autoEnabled() {
  try { execFileSync("schtasks", ["/Query", "/TN", TASK], { stdio: "ignore" }); return true; } catch { return false; }
}

// From the exe, keep a permanent copy so the task still works if the download is moved or deleted.
function autoEnable(binPath) {
  let cmd = `"${process.execPath}" "${binPath}"`;
  if (inExe) {
    const dir = path.join(process.env.LOCALAPPDATA, "WisprDark");
    const copy = path.join(dir, "Wispr-Dark.exe");
    fs.mkdirSync(dir, { recursive: true });
    if (path.resolve(process.execPath).toLowerCase() !== copy.toLowerCase()) fs.copyFileSync(process.execPath, copy);
    cmd = `"${copy}"`;
  }
  const run = `conhost.exe --headless ${cmd} apply --quiet`;
  execFileSync("schtasks", ["/Create", "/F", "/TN", TASK, "/SC", "MINUTE", "/MO", "30", "/TR", run], { stdio: "ignore" });
}

function autoDisable() {
  try { execFileSync("schtasks", ["/Delete", "/F", "/TN", TASK], { stdio: "ignore" }); } catch {}
}

module.exports = { status, apply, restore, autoEnabled, autoEnable, autoDisable };
