#!/usr/bin/env node
/**
 * sync-version.mjs
 * 构建前自动将 tauri.conf.json 的版本号同步到 Cargo.toml。
 *
 * 设计原则：tauri.conf.json 是版本号唯一来源。
 * 每次 `npm run tauri build` 前自动执行，确保编译进二进制的版本与 conf 一致。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CONF_PATH = path.join(ROOT, "src-tauri", "tauri.conf.json");
const CARGO_PATH = path.join(ROOT, "src-tauri", "Cargo.toml");

function fail(msg) {
  console.error(`\x1b[31m[SYNC-VERSION ERROR]\x1b[0m ${msg}`);
  process.exit(1);
}

function info(msg) {
  console.log(`\x1b[36m[SYNC-VERSION]\x1b[0m ${msg}`);
}

function success(msg) {
  console.log(`\x1b[32m[SYNC-VERSION OK]\x1b[0m ${msg}`);
}

// 1. 读取 tauri.conf.json 版本
if (!fs.existsSync(CONF_PATH)) {
  fail(`找不到 tauri.conf.json: ${CONF_PATH}`);
}
const conf = JSON.parse(fs.readFileSync(CONF_PATH, "utf-8"));
const confVersion = conf.version;
if (!confVersion) {
  fail("tauri.conf.json 中未找到 version 字段");
}

// 2. 读取 Cargo.toml 版本
if (!fs.existsSync(CARGO_PATH)) {
  fail(`找不到 Cargo.toml: ${CARGO_PATH}`);
}
let cargoContent = fs.readFileSync(CARGO_PATH, "utf-8");

// 匹配 [package] 块中的 version 字段
const versionRegex = /^version\s*=\s*"([^"]+)"/m;
const match = cargoContent.match(versionRegex);
if (!match) {
  fail("Cargo.toml 中未找到 [package] version 字段");
}

const cargoVersion = match[1];

// 3. 比较并同步
if (cargoVersion === confVersion) {
  success(`版本一致: ${confVersion}`);
} else {
  info(`版本不同步: tauri.conf.json=${confVersion}, Cargo.toml=${cargoVersion}`);
  cargoContent = cargoContent.replace(versionRegex, `version = "${confVersion}"`);
  fs.writeFileSync(CARGO_PATH, cargoContent, "utf-8");
  success(`已同步: Cargo.toml ${cargoVersion} → ${confVersion}`);
}
