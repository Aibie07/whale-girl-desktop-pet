// install-pet.cjs — build + install the dsh-pet desktop-pet plugin.
// Cross-platform: everything resolves relative to this script and $DSH_HOME.
// If the asset folders are missing, it downloads assets.tar.gz from a GitHub
// Release (override the URL with the DSH_PET_ASSETS_URL env var).
// Usage:  node install-pet.cjs
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const ROOT = __dirname;
const ASSET_DIR = path.join(ROOT, "素材");                    // skin GIFs
const REACTION_SRC_DIR = path.join(ROOT, "蓝色大肥鱼表情包");  // reaction GIFs
const SRC_DIR = path.join(ROOT, "pet-src");                    // plugin source

// Change this to your own Release asset URL (or set DSH_PET_ASSETS_URL).
const DEFAULT_ASSETS_URL = "https://github.com/Aibie07/-/releases/download/v1.0.0/assets.tar.gz";

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
const TARGET = path.join(DSH_HOME, "profiles", "node_modules", "dsh-pet");
const PATCH_FILES = [
  path.join(DSH_HOME, "profiles", "desktop", "cordis.patch.yml"),
  path.join(DSH_HOME, "profiles", "web", "cordis.patch.yml")
];

function fail(msg) {
  console.error("[pet] " + msg);
  process.exit(1);
}

function b64(file) {
  return fs.readFileSync(file).toString("base64");
}

// Role -> filename mapping. Each skin is a set of 5 GIFs with these names.
const ROLE_FILES = [
  ["idleA", "1.gif"],
  ["thinking", "2.gif"],
  ["idleB", "3.gif"],
  ["output", "4.gif"],
  ["done", "5.gif"]
];

function readSkin(dir) {
  const skin = {};
  for (const [role, file] of ROLE_FILES) {
    skin[role] = "data:image/gif;base64," + b64(path.join(dir, file));
  }
  return skin;
}

// Download + extract the asset pack when the local asset folders are missing.
async function ensureAssets() {
  if (fs.existsSync(ASSET_DIR) && fs.existsSync(REACTION_SRC_DIR)) return;

  const url = process.env.DSH_PET_ASSETS_URL || DEFAULT_ASSETS_URL;
  const archive = path.join(ROOT, "assets.tar.gz");
  console.log("[pet] 未找到素材目录，从 Release 下载素材包：");
  console.log("[pet] " + url);

  let res;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (e) {
    fail("下载素材失败（网络错误）：" + (e && e.message ? e.message : e) +
      "。可手动下载 " + url + " 并解压到项目目录。");
  }
  if (!res.ok) {
    fail("下载素材失败（HTTP " + res.status + "）。请确认已创建 Release 并上传 assets.tar.gz，URL：" + url);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(archive, buf);
  console.log("[pet] 下载完成（" + Math.round(buf.length / 1024 / 1024) + " MB），解压中……");

  try {
    execFileSync("tar", ["-xzf", archive, "-C", ROOT], { stdio: "inherit" });
  } catch (e) {
    fail("解压失败：请确认系统已安装 tar（Windows 10+ / macOS / Linux 自带），或手动解压 assets.tar.gz 到项目目录。");
  }
  try { fs.unlinkSync(archive); } catch (_) {}

  if (!fs.existsSync(ASSET_DIR) || !fs.existsSync(REACTION_SRC_DIR)) {
    fail("解压后仍未找到素材目录，请手动解压 assets.tar.gz 到项目目录。");
  }
  console.log("[pet] 素材准备完成。");
}

async function main() {
  await ensureAssets();

  // Skins: the GIFs directly inside ASSET_DIR are the "默认" skin; every
  // subdirectory that also contains the 5 GIFs becomes an extra skin.
  const SKINS = {};
  SKINS["默认"] = readSkin(ASSET_DIR);
  for (const entry of fs.readdirSync(ASSET_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(ASSET_DIR, entry.name);
    if (ROLE_FILES.every(([, file]) => fs.existsSync(path.join(dir, file)))) {
      SKINS[entry.name] = readSkin(dir);
      console.log("[pet] found skin:", entry.name);
    }
  }

  // Reaction GIFs: every .gif in REACTION_SRC_DIR, sorted. Copied into the
  // plugin dir so the installed plugin is self-contained.
  const REACTION_FILES = fs.readdirSync(REACTION_SRC_DIR)
    .filter((f) => f.toLowerCase().endsWith(".gif"))
    .sort();
  if (REACTION_FILES.length === 0) fail("表情包目录里没有 GIF: " + REACTION_SRC_DIR);
  console.log("[pet] reactions:", REACTION_FILES.length);

  // Build client.js (inject skins + reaction filenames).
  let clientJs = fs.readFileSync(path.join(SRC_DIR, "lib", "client.js"), "utf8");
  if (!clientJs.includes("__ASSETS__")) fail("client.js 缺少 __ASSETS__ 占位符");
  clientJs = clientJs.replace("__ASSETS__", JSON.stringify(SKINS));
  if (clientJs.includes("__REACTIONS__")) {
    clientJs = clientJs.replace("__REACTIONS__", JSON.stringify(REACTION_FILES));
  }

  // Build host index.js (inject the reaction filename whitelist).
  let indexJs = fs.readFileSync(path.join(SRC_DIR, "lib", "index.js"), "utf8");
  if (!indexJs.includes("__REACTION_FILES__")) fail("index.js 缺少 __REACTION_FILES__ 占位符");
  indexJs = indexJs.replace("__REACTION_FILES__", JSON.stringify(REACTION_FILES));

  // 1. write plugin files
  fs.mkdirSync(path.join(TARGET, "lib"), { recursive: true });
  fs.mkdirSync(path.join(TARGET, "reactions"), { recursive: true });
  fs.copyFileSync(path.join(SRC_DIR, "package.json"), path.join(TARGET, "package.json"));
  fs.writeFileSync(path.join(TARGET, "lib", "index.js"), indexJs, "utf8");
  fs.writeFileSync(path.join(TARGET, "lib", "client.js"), clientJs, "utf8");

  // 2. copy reaction GIFs into the plugin (self-contained)
  let copied = 0;
  for (const f of REACTION_FILES) {
    fs.copyFileSync(path.join(REACTION_SRC_DIR, f), path.join(TARGET, "reactions", f));
    copied++;
  }
  console.log("[pet] copied", copied, "reaction GIFs ->", path.join(TARGET, "reactions"));
  console.log("[pet] wrote", TARGET, "(client.js bytes:", clientJs.length + ")");

  // 3. patch cordis.patch.yml for each profile
  for (const file of PATCH_FILES) {
    if (!fs.existsSync(file)) {
      console.warn("[pet] 跳过（未找到配置）:", file);
      continue;
    }
    let text = fs.readFileSync(file, "utf8");
    if (text.includes("name: dsh-pet")) {
      console.log("[pet] already patched:", file);
      continue;
    }
    const lines = text.split(/\r?\n/);
    const anchor = lines.findIndex((l) => l.trim() === "name: dsh-wallpaper");
    if (anchor !== -1) {
      lines.splice(anchor + 1, 0, "    - id: pet", "      name: dsh-pet");
      fs.writeFileSync(file, lines.join("\n"), "utf8");
      console.log("[pet] patched (after wallpaper):", file);
      continue;
    }
    const insertIdx = lines.findIndex((l) => l.trim() === "- insert:");
    if (insertIdx === -1) {
      console.error("[pet] 找不到插入锚点（- insert:）:", file);
      process.exitCode = 1;
      continue;
    }
    lines.splice(insertIdx + 1, 0, "    - id: pet", "      name: dsh-pet");
    fs.writeFileSync(file, lines.join("\n"), "utf8");
    console.log("[pet] patched (first entry):", file);
  }
  console.log("[pet] done. 重启 DSH 后刷新页面即可看到桌宠。");
}

main().catch((e) => {
  console.error("[pet] 未捕获错误：" + (e && e.stack ? e.stack : e));
  process.exit(1);
});
