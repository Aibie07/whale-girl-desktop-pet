// dsh-pet host half — serves the balance proxy and the reaction GIFs so the
// browser never sees the API key and never carries the whole emoji pack.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const name = "dsh-pet";
const inject = ["webServer", "credentials"];

// Reactions live next to this plugin (copied by install-pet.cjs), located
// relative to this file so the installed plugin is relocatable.
const HERE = dirname(fileURLToPath(import.meta.url)); // .../dsh-pet/lib
const REACTION_DIR = join(HERE, "..", "reactions");    // .../dsh-pet/reactions

// Injected by install-pet.cjs: allowed reaction filenames.
const REACTION_FILES = __REACTION_FILES__;

async function fetchBalance(apiKey) {
  const res = await fetch("https://api.deepseek.com/user/balance", {
    headers: { authorization: "Bearer " + apiKey }
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error("DeepSeek 余额接口 HTTP " + res.status + (text ? "：" + text.slice(0, 200) : ""));
  }
  return JSON.parse(text);
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

function apply(ctx) {
  const webServer = ctx.webServer;
  const credentials = ctx.credentials;

  const disposeBalance = webServer.register({
    kind: "exact",
    path: "/api/pet/balance",
    handler: async (_req, res) => {
      try {
        let apiKey;
        if (credentials) {
          const hit = await credentials.resolve("DEEPSEEK_API_KEY");
          if (hit) apiKey = hit.value;
        }
        if (!apiKey) return sendJson(res, 500, { ok: false, error: "DEEPSEEK_API_KEY 未配置" });
        const data = await fetchBalance(apiKey);
        sendJson(res, 200, { ok: true, data });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err && err.message ? err.message : String(err) });
      }
    }
  });

  const disposeReactions = webServer.register({
    kind: "prefix",
    path: "/api/pet/reactions",
    handler: async (req, res) => {
      try {
        const pathname = (req.url || "/").split("?")[0];
        const prefix = "/api/pet/reactions/";
        if (!pathname.startsWith(prefix)) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        const file = decodeURIComponent(pathname.slice(prefix.length));
        if (!file || REACTION_FILES.indexOf(file) === -1) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        const data = await readFile(join(REACTION_DIR, file));
        res.writeHead(200, {
          "content-type": "image/gif",
          "cache-control": "public, max-age=86400"
        });
        res.end(data);
      } catch (_err) {
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("reaction error");
        }
      }
    }
  });

  ctx.effect(() => () => {
    disposeBalance();
    disposeReactions();
  }, "dsh-pet: routes");
}

export { apply, name, inject };
