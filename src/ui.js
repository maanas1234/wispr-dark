// Tiny local web UI. Listens on 127.0.0.1 only; actions need a per-run token so other web pages can't trigger them.
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { exec } = require("child_process");
const core = require("./core");
const { asset } = require("./asset");

const BIN = path.join(__dirname, "..", "bin", "wispr-dark.js");
const PAGE = asset("index.html", path.join("..", "ui", "index.html"));

function startUi(noOpen) {
  const token = crypto.randomBytes(16).toString("hex");
  let port;
  const send = (res, code, body, type = "application/json") => {
    res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  };
  const state = () => ({ versions: core.status(), auto: core.autoEnabled() });

  const server = http.createServer(async (req, res) => {
    const host = req.headers.host;
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(res, 403, { error: "bad host" });
    if (req.method === "GET" && req.url === "/") return send(res, 200, PAGE.replace("__TOKEN__", token), "text/html; charset=utf-8");
    if (req.method === "GET" && req.url === "/api/status") return send(res, 200, state());
    if (req.method === "POST" && req.headers["x-token"] === token) {
      const lines = [];
      const log = (m) => lines.push(m);
      try {
        if (req.url === "/api/apply") await core.apply({ restart: true, log });
        else if (req.url === "/api/restore") core.restore({ restart: true, log });
        else if (req.url === "/api/auto-on") core.autoEnable(BIN);
        else if (req.url === "/api/auto-off") core.autoDisable();
        else return send(res, 404, { error: "not found" });
        return send(res, 200, { ...state(), log: lines });
      } catch (e) {
        return send(res, 500, { error: e.message });
      }
    }
    send(res, 403, { error: "forbidden" });
  });

  server.listen(0, "127.0.0.1", () => {
    port = server.address().port;
    const url = `http://127.0.0.1:${port}/`;
    console.log(`Wispr Dark is open in your browser: ${url}\nKeep this window open while you use it. Close it when you're done.`);
    if (!noOpen) exec(`start "" "${url}"`);
  });
}

module.exports = { startUi };
