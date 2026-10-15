// Builds dist/Wispr-Dark.exe: a single file with Node and all code/assets inside (Node single-executable app).
// Run: npm run build:exe
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const esbuild = require("esbuild");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const exe = path.join(dist, "Wispr-Dark.exe");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

esbuild.buildSync({
  entryPoints: [path.join(root, "bin", "wispr-dark.js")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: path.join(dist, "bundle.js"),
  // @electron/asar calls createRequire(import.meta.url), which is undefined in a CJS bundle.
  define: { "import.meta.url": "__importMetaUrl" },
  banner: { js: 'const __importMetaUrl = require("url").pathToFileURL(process.execPath).href;' },
});

fs.writeFileSync(
  path.join(dist, "sea-config.json"),
  JSON.stringify({
    main: "bundle.js",
    output: "sea.blob",
    disableExperimentalSEAWarning: true,
    assets: {
      "dark.css": path.join(root, "src", "dark.css"),
      "index.html": path.join(root, "ui", "index.html"),
    },
  })
);

const run = (cmd, args) => execFileSync(cmd, args, { cwd: dist, stdio: "inherit" });

(async () => {
  const { version } = require("../package.json");
  run(process.execPath, ["--experimental-sea-config", "sea-config.json"]);
  fs.copyFileSync(process.execPath, exe);

  // Replace node.exe's "Node.js" identity so the file shows as Wispr Dark in Properties and signing tools.
  const { rcedit } = await import("rcedit");
  await rcedit(exe, {
    "version-string": {
      ProductName: "Wispr Dark",
      FileDescription: "Wispr Dark - dark mode for Wispr Flow",
      CompanyName: "Maanas Tyagi",
      LegalCopyright: "Copyright (c) 2026 Maanas Tyagi. MIT License.",
      OriginalFilename: "Wispr-Dark.exe",
      InternalName: "wispr-dark",
    },
    "file-version": `${version}.0`,
    "product-version": `${version}.0`,
  });

  run(process.execPath, [
    path.join(root, "node_modules", "postject", "dist", "cli.js"),
    exe,
    "NODE_SEA_BLOB",
    "sea.blob",
    "--sentinel-fuse",
    "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  ]);

  for (const f of ["bundle.js", "sea-config.json", "sea.blob"]) fs.rmSync(path.join(dist, f));
  console.log(`built ${exe} (${(fs.statSync(exe).size / 1e6).toFixed(0)} MB)`);
})().catch((e) => { console.error(e); process.exit(1); });
