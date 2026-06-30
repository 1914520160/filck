#!/usr/bin/env node
/**
 * generate-updater-json.mjs
 * 构建后自动生成 updater.json 用于 Tauri v2 自动更新。
 *
 * 用法：
 *   node scripts/generate-updater-json.mjs [version] [--platforms win,linux,mac]
 *
 * 环境变量：
 *   UPDATER_NOTES       - 更新日志 (可选)
 *   GITHUB_RELEASE_TAG  - GitHub Release tag (可选，默认 v{version})
 *
 * 输出：dist/updater.json
 *
 * 流程：
 *   1. 读取 src-tauri/target/release/bundle/{nsis,msi,appimage,macos}/ 下的 .sig 文件
 *   2. 拼接 GitHub Release 下载 URL
 *   3. 生成符合 Tauri v2 格式的 updater.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BUNDLE_DIR = path.join(ROOT, "src-tauri", "target", "release", "bundle");

// ─── 配置 ────────────────────────────────────────────────

const REPO_OWNER = "1914520160";
const REPO_NAME = "filck";
const GITHUB_RELEASE_BASE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download`;

// ─── 平台映射 ────────────────────────────────────────────

/**
 * 每个平台需要：
 *  - dir: bundle 子目录
 *  - filePattern: 文件名模式（正则）
 *  - ext: 最终上传的文件扩展名
 *  - platformKey: updater.json 中的平台键名
 */
const PLATFORM_CONFIGS = [
  {
    name: "windows-nsis",
    dir: "nsis",
    filePattern: /\.exe$/,
    ext: ".exe",
    platformKey: "windows-x86_64",
  },
  {
    name: "windows-msi",
    dir: "msi",
    filePattern: /\.msi$/,
    ext: ".msi",
    platformKey: "windows-x86_64",
  },
  {
    name: "linux-appimage",
    dir: "appimage",
    filePattern: /\.AppImage$/,
    ext: ".AppImage",
    platformKey: "linux-x86_64",
  },
  {
    name: "macos-dmg",
    dir: "dmg",
    filePattern: /\.dmg$/,
    ext: ".dmg",
    platformKey: "darwin-x86_64",
  },
];

// ─── 辅助函数 ────────────────────────────────────────────

function fail(msg) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`);
}

function info(msg) {
  console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`);
}

function success(msg) {
  console.log(`\x1b[32m[OK]\x1b[0m ${msg}`);
}

/** 查找 bundle 目录下的安装包和签名文件 */
function findArtifacts(config) {
  const dirPath = path.join(BUNDLE_DIR, config.dir);
  if (!fs.existsSync(dirPath)) return null;

  const files = fs.readdirSync(dirPath);

  // 找到安装包文件
  const pkgFile = files.find(
    (f) => config.filePattern.test(f) && !f.endsWith(".sig")
  );
  if (!pkgFile) return null;

  // 找到对应的签名文件
  const sigFile = files.find(
    (f) =>
      f === `${pkgFile}.sig` ||
      f === `${path.basename(pkgFile, config.ext)}${config.ext}.sig`
  );

  if (!sigFile) {
    warn(`${config.name}: 找到 ${pkgFile} 但没有 .sig 签名文件 → updater 将无法验证签名`);
    // 降级：签名文件缺失时仍返回空签名，确保 updater.json 能生成
    // 用户端会在验证签名时失败，但至少不会报 404
    return { fileName: pkgFile, signature: "" };
  }

  const sigPath = path.join(dirPath, sigFile);
  const signature = fs.readFileSync(sigPath, "utf-8").trim();
  if (!signature) {
    warn(`${config.name}: 签名文件为空 → updater 将无法验证签名`);
    return { fileName: pkgFile, signature: "" };
  }

  return { fileName: pkgFile, signature };
}

// ─── 主逻辑 ──────────────────────────────────────────────

/** 从 tauri.conf.json 读取版本号（唯一版本来源） */
function readVersionFromConf() {
  const confPath = path.join(ROOT, "src-tauri", "tauri.conf.json");
  if (!fs.existsSync(confPath)) {
    fail(`找不到 tauri.conf.json: ${confPath}`);
  }
  const conf = JSON.parse(fs.readFileSync(confPath, "utf-8"));
  const version = conf.version;
  if (!version) {
    fail("tauri.conf.json 中未找到 version 字段");
  }
  return version;
}

function main() {
  // 从 tauri.conf.json 读取版本号（唯一来源）
  const cleanVersion = readVersionFromConf();
  const tag = process.env.GITHUB_RELEASE_TAG || `v${cleanVersion}`;
  const notes = process.env.UPDATER_NOTES || "";

  info(`版本: ${cleanVersion}`);
  info(`Release Tag: ${tag}`);
  info(`扫描构建产物: ${BUNDLE_DIR}`);

  // 扫描各平台产物
  const platforms = {};

  for (const cfg of PLATFORM_CONFIGS) {
    const result = findArtifacts(cfg);
    if (!result) continue;

    const downloadUrl = `${GITHUB_RELEASE_BASE}/${tag}/${result.fileName}`;

    platforms[cfg.platformKey] = {
      signature: result.signature,
      url: downloadUrl,
    };

    success(`${cfg.name}: ${result.fileName}`);
  }

  if (Object.keys(platforms).length === 0) {
    fail(
      "未找到任何构建产物和签名文件。\n" +
        "请先运行 npx tauri build 构建应用。\n" +
        "确保 tauri.conf.json 中 bundle.createUpdaterArtifacts = true"
    );
  }

  // 构建 updater.json
  const updaterJson = {
    version: cleanVersion,
    notes: notes || `Filck v${cleanVersion}`,
    pub_date: new Date().toISOString(),
    platforms,
  };

  // 输出到 dist 目录（前端构建输出）
  const distDir = path.join(ROOT, "dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const outputPath = path.join(distDir, "updater.json");
  fs.writeFileSync(outputPath, JSON.stringify(updaterJson, null, 2), "utf-8");

  success(`已生成: ${outputPath}`);
  console.log("\n--- updater.json 内容预览 ---");
  console.log(JSON.stringify(updaterJson, null, 2));
  console.log("--- 预览结束 ---\n");

  info("接下来你需要：");
  info(
    `1. 创建 GitHub Release: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/new?tag=${tag}`
  );
  info(
    `2. 上传以下文件到 Release:`
  );
  for (const [key, p] of Object.entries(platforms)) {
    const fileName = path.basename(p.url);
    info(`   - ${fileName} (${key})`);
  }
  info(`   - updater.json (在 ${outputPath})`);
  info("3. 发布 Release");
}

main();
