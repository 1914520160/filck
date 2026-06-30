# Filck 自动更新体系 — 运维文档

> **面向 AI 开发工具 / 新接手开发者** — 读完本文档即可完全掌握版本更新体系。

---

## 一、体系概览

```
┌──────────────────────────────────────────────────────────┐
│  开发者推送 Tag → GitHub Actions 构建 → 签名 → 发布 Release  │
│                       ↓                                    │
│  用户启动应用 → 自动检查 updater.json → 下载 → 安装 → 重启   │
└──────────────────────────────────────────────────────────┘
```

| 项目 | 值 |
|------|-----|
| **更新服务器** | GitHub Releases（无需自建服务器） |
| **更新端点** | `https://github.com/1914520160/filck/releases/latest/download/updater.json` |
| **安装模式** | NSIS `passive`（静默安装，用户无感知） |
| **检查频率** | 启动时自动检查 + 每 24 小时定时检查 |
| **签名算法** | ECDSA P-256 (secp256r1) |

---

## 二、密钥管理

### 密钥对信息

| 项目 | 路径 / 存储位置 | 用途 |
|------|----------------|------|
| **私钥** | `%USERPROFILE%\.tauri\filck.key` | 签名安装包（构建机使用） |
| **私钥** | GitHub Secrets → `TAURI_SIGNING_PRIVATE_KEY` | Actions 自动签名 |
| **公钥** | `tauri.conf.json` → `plugins.updater.pubkey` | 客户端验证签名 |

### 公钥（当前）

```
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP90fRiyuwGHSjxu2kj72CTXKYZ7FruQTZsLRf1UHy4gF3tbPpnUUU9cYsHa0uiOs2TBzsyi8Qsy305yDLN7Hyg==
```

### 密钥生成命令

如果密钥丢失，用以下命令重新生成：

```powershell
node -e "
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'der' },
});
const pub = publicKey.toString('base64');
const pri = privateKey.toString('base64');
const fs = require('fs');
const home = process.env.USERPROFILE || process.env.HOME;
fs.mkdirSync(home + '/.tauri', { recursive: true });
fs.writeFileSync(home + '/.tauri/filck.key', pri);
console.log('新公钥: ' + pub);
console.log('私钥已保存到: ' + home + '/.tauri/filck.key');
"
```

⚠️ **更换密钥后必须同步更新**：
1. `tauri.conf.json` → `plugins.updater.pubkey`
2. GitHub Secrets → `TAURI_SIGNING_PRIVATE_KEY`
3. **旧版本客户端将无法验证新签名的安装包**（需要用户手动下载最新版）

---

## 三、发布新版本流程

### 3.1 更新版本号

需要同步修改 **2 个文件**：

```json
// tauri.conf.json
"version": "5.0.37"

// src-tauri/Cargo.toml
version = "5.0.37"
```

### 3.2 推送并打 Tag

```powershell
cd clipboard-manager-tauri

# 提交版本号变更
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to v5.0.37"

# 推送代码
git push origin master

# 创建并推送 Tag（触发 GitHub Actions 自动构建）
git tag v5.0.37
git push origin master --tags
```

### 3.3 自动构建流程（GitHub Actions）

推送 Tag 后，`.github/workflows/release.yml` 自动执行：

```
1. 检出代码
2. 安装 Node.js + Rust + 依赖
3. 写入签名私钥到文件
4. 构建前端 (npm run build)
5. 构建 NSIS 安装包 (tauri build)
6. 对安装包签名
7. 生成 updater.json
8. 创建 GitHub Release，上传安装包 + updater.json
9. 所有客户端下次检查时自动发现新版本
```

### 3.4 手动检查构建状态

打开 https://github.com/1914520160/filck/actions 查看工作流运行状态。

---

## 四、配置文件说明

### 4.1 tauri.conf.json（更新相关配置）

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/1914520160/filck/releases/latest/download/updater.json"
      ],
      "pubkey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...",
      "windows": {
        "installMode": "passive"
      },
      "active": true
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `endpoints` | updater.json 的下载地址，支持多个（容灾） |
| `pubkey` | 公钥，客户端用于验证安装包签名 |
| `windows.installMode` | `passive` = 静默安装，`basicUi` = 显示安装界面 |
| `active` | `true` = 启用更新，`false` = 禁用 |

### 4.2 capabilities/default.json（权限）

```json
"updater:default",
"updater:allow-check",
"updater:allow-download",
"updater:allow-install",
"updater:allow-download-and-install"
```

### 4.3 GitHub Actions 工作流 (.github/workflows/release.yml)

| 关键步骤 | 说明 |
|----------|------|
| `TAURI_SIGNING_PRIVATE_KEY` | 从 GitHub Secrets 读取签名私钥 |
| `--sign` | tauri build 签名参数 |
| `updater.json` | 自动生成，包含版本号、下载 URL、签名 |

---

## 五、前端代码结构

### 5.1 文件清单

| 文件 | 职责 |
|------|------|
| `src/contexts/UpdateContext.tsx` | 核心逻辑：检查更新、下载、安装、重启 |
| `src/components/UpdateBadge.tsx` | UI 组件：TopBar 徽章 + AboutDialog 横幅 + 进度条 |
| `src/App.tsx` | 包裹 `<UpdateProvider>` |
| `src/components/TopBar.tsx` | 嵌入 `<UpdateBadge />` |
| `src/components/AboutDialog.tsx` | 嵌入 `<UpdateBanner />` |
| `src/styles/app.css` | 样式：update-badge / update-banner / progress-bar |

### 5.2 状态流转

```
IDLE → CHECKING → 有更新 → AVAILABLE → 用户点击下载 → DOWNLOADING
                                    ↓
                               下载完成 → READY → 用户点击重启 → relaunch()
                                    ↓
                               下载失败 → ERROR
```

### 5.3 UpdateContext 核心 API

```typescript
// 检查更新（自动去重：24h 内跳过）
checkForUpdate(): void

// 下载并安装更新
downloadAndInstall(): Promise<void>

// 重启应用
relaunchApp(): void

// 状态字段
updateStatus: "idle" | "checking" | "available" | "downloading" | "ready" | "error"
updateInfo: { version, body, date } | null
downloadProgress: { downloaded, total, percent } | null
errorMessage: string | null
```

### 5.4 UpdateBadge 组件

**TopBar 徽章**（版本号旁边）：
- `available`：蓝色脉动「vX.X.X」，点击触发下载
- `downloading`：蓝色浅底「下载中」
- `ready`：绿色脉动「点击重启」，点击 relaunch
- `error`：红色「更新失败」

**AboutDialog 横幅**：
- `idle`：灰色「已是最新版本」
- `checking`：加载中动画
- `available`：黄色「发现新版本」+ 下载按钮
- `downloading`：进度条 + 百分比
- `ready`：绿色「更新已安装」+ 重启按钮
- `error`：红色错误信息 + 重试按钮

---

## 六、故障排查

### 6.1 更新不生效

| 现象 | 可能原因 | 解决 |
|------|---------|------|
| 检查不到更新 | 24h 缓存未过期 | 重启应用或修改代码跳过缓存 |
| 下载失败 | 网络问题 / GitHub 被墙 | 检查网络代理 |
| 安装失败 | 签名验证失败 | 确认 pubkey 和私钥匹配 |
| Actions 构建失败 | Secret 未设置 | 检查 GitHub Secrets |
| updater.json 404 | Release 未发布 | 检查 Actions 运行日志 |

### 6.2 调试模式

在开发模式下 `checkForUpdate` 默认跳过（非构建版本）。如需调试：

1. 修改 `UpdateContext.tsx` 中检查逻辑，移除开发环境跳过
2. 或者直接 `npm run tauri build` 构建后测试

### 6.3 手动生成 updater.json

如果 Actions 构建成功但 Release 缺少 updater.json，可手动生成：

```json
{
  "version": "5.0.37",
  "notes": "更新说明",
  "pub_date": "2026-06-30T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "从构建日志中获取签名",
      "url": "https://github.com/1914520160/filck/releases/download/v5.0.37/剪贴板管理_5.0.37_x64-setup.exe"
    }
  }
}
```

---

## 七、仓库信息

| 项目 | 值 |
|------|-----|
| **GitHub 仓库** | `https://github.com/1914520160/filck` |
| **仓库可见性** | Private |
| **默认分支** | master |
| **Actions Secret** | `TAURI_SIGNING_PRIVATE_KEY` |
| **Git remote** | `origin https://github.com/1914520160/filck.git` |

### Git 认证

推送需要 GitHub 认证。如果 remote 使用了 token URL：

```powershell
# 设置带 token 的 remote（token 已脱敏，需替换 YOUR_TOKEN）
git remote set-url origin https://1914520160:YOUR_TOKEN@github.com/1914520160/filck.git
```

---

## 八、迁移检查清单

换机器或切换 AI 工具后，按以下顺序恢复：

- [ ] 1. 确认 Git remote 指向正确仓库
- [ ] 2. 确认 `%USERPROFILE%\.tauri\filck.key` 私钥文件存在
- [ ] 3. 确认 GitHub Secrets → `TAURI_SIGNING_PRIVATE_KEY` 已设置
- [ ] 4. 确认 `tauri.conf.json` 中 `pubkey` 与私钥匹配
- [ ] 5. 确认 `updater.active: true`
- [ ] 6. 推送测试 Tag 验证 Actions 工作流正常
- [ ] 7. 构建本地版本测试更新检测流程
