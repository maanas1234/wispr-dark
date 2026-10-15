// Reads bundled files: from the embedded blob inside Wispr-Dark.exe, or from disk when run with Node.
const fs = require("fs");
const path = require("path");

let sea = null;
try { sea = require("node:sea"); } catch {}
const inExe = !!(sea && sea.isSea());

const asset = (name, diskPath) => (inExe ? sea.getAsset(name, "utf8") : fs.readFileSync(path.join(__dirname, diskPath), "utf8"));

module.exports = { inExe, asset };
