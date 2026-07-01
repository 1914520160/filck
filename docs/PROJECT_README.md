# 剪贴板管理器 v4.4.0 — 项目文档

> **面向 AI 开发工具的上手指南** — 读完本文档即可直接开始开发。

---

## 一、项目概览

| 项目 | 说明 |
|------|------|
| **名称** | 剪贴板管理器 (Clipboard Manager) |
| **版本** | v5.0.36 |
| **架构** | Tauri 2 (桌面壳) + React 19 (前端) + Rust (后端) |
| **数据库** | SQLite (rusqlite, bundled 模式) |
| **平台** | Windows 10/11 (核心功能 Windows-only) |
| **语言** | 中文界面 |

**核心功能：**
- 剪贴板历史记录（文本/图片/文件），轮询监听 400ms
- 全局热键唤出窗口 (Ctrl+Shift+V)、依次粘贴 (Ctrl+Shift+B)、索引粘贴 (Ctrl+Alt+1~9)
- 文本粘贴到前台窗口（WM_PASTE 消息注入）
- **图片粘贴到前台窗口**（v4.4.0 新增）
- 工作区管理、标签筛选、拼音搜索
- 片段库（常用文本模板）
- 信息提取（电话号码、邮箱、URL 等）
- 局域网多播同步（文本/图片/文件，v4.4.0 扩展）
- 4 套主题（浅色/深色/蔚蓝/蔚蓝深色）
- 系统托盘、开机自启
- 数据导入/导出（JSON）
- **版本号动态获取**（v4.4.0 优化）

---

## 二、项目目录结构

```
clipboard-manager-tauri/          # ← 工作根目录
├── package.json                  # 前端依赖 (React/Zustand/Radix/Framer)
├── tsconfig.json                 # TypeScript 配置
├── tsconfig.node.json            # Node 端 TS 配置
├── vite.config.ts                # Vite 构建配置，端口 1420
├── index.html                    # SPA 入口
├── tailwind.config.ts            # Tailwind CSS 配置
│
├── src/                          # 前端源码
│   ├── main.tsx                  # React 入口
│   ├── App.tsx                   # 主应用组件（主题/键盘/失焦隐藏）
│   ├── vite-env.d.ts
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── CardList.tsx          # 卡片列表（核心组件，18KB）
│   │   ├── ContextMenu.tsx       # 右键菜单
│   │   ├── EditDialog.tsx        # 编辑对话框
│   │   ├── ExtractDialog.tsx     # 信息提取对话框
│   │   ├── FileDetailDialog.tsx  # 文件详情对话框
│   │   ├── HelpDialog.tsx        # 帮助对话框
│   │   ├── SettingsDialog.tsx    # 设置对话框（16KB）
│   │   ├── SnippetsDialog.tsx    # 片段管理对话框
│   │   ├── StatsBar.tsx          # 统计栏
│   │   ├── Toast.tsx             # Toast 通知
│   │   ├── TopBar.tsx            # 顶栏（搜索/过滤/设置按钮）
│   │   ├── UpdateBadge.tsx       # 更新徽章+横幅+进度条（v5.0.36 新增）
│   │   └── ui/                   # Radix UI 基础组件封装
│   ├── contexts/
│   │   └── UpdateContext.tsx     # 更新状态管理（v5.0.36 新增）
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts                # Tauri 后端 API 封装（核心桥梁）
│   │   ├── theme.ts              # 主题定义和切换
│   │   └── utils.ts              # 工具函数（时间/截断/类型检测）
│   ├── pages/
│   ├── stores/
│   │   └── appStore.ts           # Zustand 全局状态（5.97KB）
│   └── styles/
│       ├── app.css               # 应用样式（37KB，含主题变量）
│       └── globals.css           # 全局基础样式
│
├── src-tauri/                    # Rust 后端
│   ├── Cargo.toml                # Rust 依赖清单
│   ├── tauri.conf.json           # Tauri 应用配置
│   ├── build.rs                  # 构建脚本（标准 tauri_build）
│   ├── capabilities/
│   │   └── default.json          # 权限声明
│   ├── icons/                    # 应用图标（多尺寸）
│   └── src/
│       ├── main.rs               # Rust 入口（4 行）
│       ├── lib.rs                # 核心启动逻辑（153行）
│       ├── data_store.rs         # SQLite 数据层（403行）
│       ├── commands.rs           # Tauri Commands（283行，26个命令）
│       ├── clipboard_monitor.rs  # 剪贴板轮询监听（390行）
│       ├── paste_engine.rs       # 粘贴引擎（218行）
│       ├── hotkey_manager.rs     # 全局热键管理（149行）
│       ├── tray_manager.rs       # 系统托盘（52行）
│       └── lan_sync.rs           # 局域网同步（134行）
│
└── dist/                         # 前端构建产物（npm run build 输出）
```

---

## 三、技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.1.0 | UI 框架 |
| TypeScript | ~5.8.3 | 类型安全 |
| Vite | ^7.0.4 | 构建工具 |
| Tailwind CSS | v3 (via tailwind-merge) | 样式系统 |
| Zustand | ^5.0.14 | 状态管理 |
| Radix UI | ^2.x 系列 | 无障碍 UI 原语 |
| Framer Motion | ^12.40.0 | 动画 |
| Lucide React | ^1.21.0 | 图标库 |
| clsx + tailwind-merge | - | 类名合并 |

### Rust 后端

| 依赖 | 版本 | 用途 |
|------|------|------|
| tauri | 2 | 桌面框架 |
| rusqlite | 0.31 (bundled) | SQLite 数据库 |
| arboard | 3 (image-data) | 剪贴板读写 |
| tokio | 1 (full) | 异步运行时 |
| image | 0.25 | 图片处理/缩放 |
| md-5 | 0.10 | 内容哈希去重 |
| base64 | 0.22 | 图片 base64 编码 |
| uuid | 1 (v4) | 唯一 ID 生成 |
| chrono | 0.4 (serde) | 时间处理 |
| pinyin | 0.5 | 中文拼音首字母 |
| windows | 0.58 | Win32 API 调用 |
| winreg | 0.52 | 注册表（开机自启） |
| hostname | 0.4 | 主机名（LAN 同步） |

### Tauri 插件

- `tauri-plugin-opener` — 打开文件/URL
- `tauri-plugin-global-shortcut` — 全局热键
- `tauri-plugin-clipboard-manager` — 剪贴板
- `tauri-plugin-shell` — Shell 命令
- `tauri-plugin-dialog` — 文件对话框
- `tauri-plugin-fs` — 文件系统
- `tauri-plugin-updater` — 自动更新（v5.0.36 新增）

---

## 四、数据模型

### SQLite 数据库 (clipboard.db)

**history 表** — 剪贴板历史记录
```sql
CREATE TABLE history (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL DEFAULT '',
    time TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',  -- text/image/file
    content TEXT NOT NULL DEFAULT '',   -- 图片路径/文件路径JSON
    pinned INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT '',    -- 来源窗口标题
    workspace TEXT NOT NULL DEFAULT '默认',
    md5 TEXT,
    pinyin_initials TEXT
);
-- 索引: workspace, time, pinned
```

**config 表** — 键值对配置
```sql
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

**snippets 表** — 片段库
```sql
CREATE TABLE snippets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL
);
```

### 前端 HistoryItem 接口
```typescript
interface HistoryItem {
  id: string;
  text: string;          // 显示文本
  time: string;          // ISO 时间
  type: "text" | "image" | "file";
  content: string;       // 空 | 图片路径 | 文件路径
  pinned: boolean;
  source: string;        // 来源窗口标题
  workspace: string;
  md5?: string;
  pinyin_initials?: string;
}
```

### 前端 AppConfig
```typescript
interface AppConfig {
  hotkey: string;              // "ctrl+shift+v"
  theme: string;               // "fluent-blue"
  auto_cleanup_days: number;   // 30
  auto_strip: boolean;
  sequential_loop: boolean;
  hide_on_focus_out: boolean;
  lan_sync_enabled: boolean;
  always_on_top: boolean;
  auto_startup: boolean;
  sequential_hotkey: string;   // "ctrl+shift+b"
  select_all_hotkey: string;   // "ctrl+a"
  current_workspace: string;
  workspaces: string[];
}
```

---

## 五、架构流程

### 5.1 启动流程 (lib.rs)

```
1. env_logger 初始化
2. 注册 6 个 Tauri 插件
3. 初始化 SQLite 数据库 → DataStore
4. 读取 LAN 同步配置和热键配置
5. 创建 PasteSuppress → PasteEngine → ClipboardMonitor
6. 启动剪贴板监听线程
7. 初始化系统托盘
8. 注册全局热键
9. 启动局域网同步（如启用）
10. 显示窗口 + DWM 圆角
11. 注册 26 个 Tauri 命令
```

### 5.2 剪贴板监听流程 (clipboard_monitor.rs)

```
后台线程 400ms 轮询:
  ├─ 检查粘贴抑制（PasteSuppress）
  ├─ 尝试读取文本
  │   ├─ MD5 去重
  │   ├─ 检查自写入 hash（跳过自身粘贴）
  │   ├─ 自动去除空白（按配置）
  │   ├─ 计算拼音首字母
  │   └─ 写入 SQLite + 推送 clipboard-changed 事件
  ├─ 尝试读取图片 (arboard get_image)
  │   ├─ 大小限制 50MB
  │   ├─ 缩放到 1080px 长边
  │   └─ 保存 PNG → 记录路径
  └─ 尝试读取文件 (CF_HDROP, Windows only)
      └─ 逐文件记录
```

### 5.3 粘贴流程 (paste_engine.rs)

```
前端调用 paste_text(text) 或 paste_image(path)
  ├─ 1. 设置 PasteSuppress（3秒 + content hash）
  ├─ 2. 写入文本/图片到剪贴板
  ├─ 3. 获取目标窗口句柄（手动 > 追踪 > 当前前台）
  ├─ 4. AttachThreadInput → 找焦点子控件
  └─ 5. SendMessageW(WM_PASTE) → 目标窗口
```

### 5.4 前端数据流

```
初始化 (App.tsx useEffect):
  └─ initBackend()
      ├─ invoke("get_history") → store.setHistory()
      ├─ invoke("get_config") → store.updateConfig()
      ├─ 自动清理过期记录
      └─ listen("clipboard-changed") → store.prependItem()
         listen("hotkey-sequential-paste") → sequentialPaste()
         listen("hotkey-index-paste") → indexPaste()

用户操作:
  CardList → 点击 → pasteText() / copyOnly() / togglePin() / deleteHistory()
  TopBar → 搜索/筛选/对话框
  SettingsDialog → saveConfig() → reregister_hotkeys()
  SnippetsDialog → addSnippet/getSnippets/updateSnippet/deleteSnippet
```

---

## 六、26 个 Tauri Commands 清单

| 命令 | 参数 | 返回 | 用途 |
|------|------|------|------|
| `get_history` | workspace, filter, search, offset, limit | Vec\<HistoryItem\> | 分页查询 |
| `insert_history` | item: HistoryItem | () | 插入记录 |
| `delete_history` | ids: Vec\<String\> | u32 | 批量删除 |
| `toggle_pin` | id: String | bool | 切换置顶 |
| `clear_history` | workspace, before_days? | u32 | 清理历史 |
| `get_config` | — | Value | 读取配置 |
| `save_config` | config: Value | () | 保存配置 |
| `get_stats` | workspace | Stats | 统计信息 |
| `paste_text` | text: String | () | 粘贴到前台窗口 |
| `copy_only` | text: String | () | 仅复制不粘贴 |
| `save_foreground` | — | () | 保存前台窗口句柄 |
| `toggle_window` | — | () | 显示/隐藏窗口 |
| `import_history` | items: Vec\<HistoryItem\> | u32 | 导入历史 |
| `add_snippet` | name, content | () | 添加片段 |
| `get_snippets` | — | Vec\<Snippet\> | 获取片段列表 |
| `update_snippet` | id, name, content | () | 更新片段 |
| `delete_snippet` | id | () | 删除片段 |
| `get_all_history` | workspace | Vec\<HistoryItem\> | 全量导出 |
| `get_image_data_url` | path | String | 图片转 base64 |
| `reregister_hotkeys` | — | () | 重注册热键 |
| `get_file_info` | path | Value | 文件信息 |
| `open_file_location` | path | () | 打开文件位置 |
| `set_startup` | enable: bool | () | 开机自启 |
| `paste_image` | imagePath: String | () | 粘贴图片到前台窗口 (v4.4.0) |
| `get_image_thumbnail` | path | String | 图片缩略图 base64 |
| `get_image_info` | path | Value | 图片尺寸/大小信息 |
| `get_app_version` | — | String | 获取应用版本号 |
| `toggle_lan_sync` | enable: bool | () | 开关局域网同步 |
| `send_lan_test` | — | () | 发送测试消息 |
| `get_lan_devices` | — | Vec\<LanDevice\> | 获取已发现设备 |
| `get_lan_status` | — | bool | 局域网同步状态 |
| `set_startup` | enable: bool | () | 开机自启 |
| `get_startup` | — | bool | 开机自启状态 |
| `toggle_monitor` | — | bool | 切换剪贴板监听 |
| `get_monitor_status` | — | bool | 监听状态 |
| `exit_app` | — | () | 退出应用 |

---

## 七、开发环境搭建

### 前置依赖

1. **Rust** (≥1.70): https://rustup.rs
2. **Node.js** (≥20): https://nodejs.org
3. **Visual Studio 2022 Build Tools** (Windows):
   - 组件："使用 C++ 的桌面开发"
   - Windows 10/11 SDK

### 快速开始

```bash
# 进入项目目录
cd clipboard-manager-tauri

# 安装前端依赖
npm install

# 开发模式（Vite HMR + Tauri）
npm run tauri dev

# 仅前端构建
npm run build

# Rust 编译检查
cd src-tauri && cargo check

# 生产构建
npm run tauri build
```

### 构建配置

- **Cargo.toml** 中二进制名称：`剪贴板管理`
- **tauri.conf.json** 窗口大小：400×640，最小 380×500
- 开发服务器端口：1420
- 数据库位置：`%APPDATA%/com.clipboard-manager.app/clipboard.db`
- 图片存储：`%APPDATA%/com.clipboard-manager.app/images/`

---

## 八、关键设计决策

1. **剪贴板轮询而非事件监听**：Windows 剪贴板 API 无原生变化事件，使用 400ms 间隔轮询 + MD5 去重。

2. **粘贴抑制机制**：自身写入剪贴板后设置 3 秒抑制期 + content hash 匹配，防止粘贴操作被记录为新的历史条目。

3. **窗口句柄追踪**：PasteEngine 使用三层策略获取粘贴目标——手动保存（窗口显示前） > 持续追踪（轮询线程每 400ms） > 当前前台窗口。通过 `AttachThreadInput` + `GetFocus` 找到真正的输入控件。

4. **图片处理**：剪贴板图片以 RGBA 格式读取，缩放到最长边 1080px 后保存 PNG。读取时转 base64 data URL 传递给前端，带内存缓存。

5. **拼音搜索**：记录写入时计算拼音首字母存入 `pinyin_initials` 列，前端搜索时同时匹配原文和拼音首字母。

6. **配置存储**：使用 key-value 表存储 JSON 配置，而非 JSON 文件。支持任意嵌套 JSON 值。

7. **前端分页**：每次加载 50 条，上限 500 条。全量导出使用独立的 `get_all_history` 命令。

---

## 九、待改进/已知问题

1. **`index.html` 标题**仍为 "Tauri + React + Typescript"，应改为 "剪贴板管理"
2. **窗口隐藏时**剪贴板监听仍然运行，没有暂停选项
3. ~~**图片粘贴**仅支持文本的 WM_PASTE，不支持粘贴图片到目标窗口~~ ✅ v4.4.0 已修复
4. ~~**LAN 同步**目前仅支持文本，不支持图片/文件同步~~ ✅ v4.4.0 已修复
5. **`tray_manager.rs`** 的"极简模式"菜单项未实现功能
6. ~~**无自动更新机制**~~ ✅ v5.0.36 已实现（GitHub Actions + updater 插件）
7. **日志文件**没有自动清理机制
8. ~~**版本号硬编码**~~ ✅ v4.4.0 改为动态获取

---

## 十、v4.4.0 更新日志

1. **图片粘贴支持** — `paste_engine.rs` 新增 `execute_paste_image()` 方法，支持将图片写入剪贴板并发送 WM_PASTE 到目标窗口
2. **LAN 同步扩展** — 支持图片（≤2MB base64 编码）和文件路径的局域网同步，接收端自动保存图片到本地
3. **版本号动态获取** — SettingsDialog/HelpDialog 通过 `getAppVersion()` 命令动态获取，不再硬编码
4. **前端按类型粘贴** — App.tsx Enter 键处理按 item.type 分发到 `pasteText`/`pasteImage`
5. **文档更新** — 命令清单、AppConfig 接口、粘贴流程说明已同步至 v4.4.0

---

## 十三、v5.0.36 更新日志（自动更新体系）

1. **签名密钥** — 生成 ECDSA P-256 密钥对，公钥写入 tauri.conf.json，私钥存入 GitHub Secrets
2. **updater 配置** — 端点指向 GitHub Releases，NSIS passive 静默安装模式
3. **UpdateContext** — 启动时自动检查 + 每 24h 定时检查 + 下载/安装/重启完整流程
4. **UpdateBadge** — TopBar 版本号旁显示更新提示徽章（新版本/下载中/就绪/错误）
5. **UpdateBanner** — AboutDialog 完整更新横幅（检查/下载进度条/安装/重启）
6. **GitHub Actions** — Tag 推送自动构建 NSIS → 签名 → 发布 Release → 生成 updater.json
7. **权限配置** — capabilities 添加 updater 全部权限

> 📖 完整运维文档：[docs/AUTO_UPDATE.md](docs/AUTO_UPDATE.md)

---

## 十一、文件大小参考

| 文件 | 大小 | 说明 |
|------|------|------|
| `app.css` | 37.82 KB | 最大前端文件，含完整主题变量 |
| `CardList.tsx` | 18.83 KB | 最复杂前端组件 |
| `SettingsDialog.tsx` | 16.63 KB | 设置界面 |
| `clipboard_monitor.rs` | 16.35 KB | 最复杂 Rust 模块 |
| `data_store.rs` | 13.85 KB | SQLite CRUD |
| `App.tsx` | 8.85 KB | 主组件 |
| `paste_engine.rs` | 8.14 KB | 粘贴逻辑 |
| `api.ts` | 6.44 KB | 前后端桥接 |

---

## 十二、给 AI 开发工具的提示

### 开发新功能的标准流程

1. **添加数据库字段** → 修改 `data_store.rs` 的 `HistoryItem` 结构体 + 建表 SQL + 迁移逻辑
2. **添加 Rust 命令** → 在 `commands.rs` 添加 `#[tauri::command]` 函数 + 在 `lib.rs` 注册
3. **添加前端 API** → 在 `api.ts` 添加 `invoke()` 封装函数
4. **添加状态** → 在 `appStore.ts` 添加字段和操作
5. **添加 UI** → 在 `components/` 创建 React 组件

### 修改热键
- 前端设置保存 → `api.ts` 调用 `reregister_hotkeys` → Rust 端 `hotkey_manager.rs` 注销并重注册

### 修改主题
- `theme.ts` 添加 ThemeKey → `app.css` 添加 `[data-theme="xxx"]` CSS 变量块

### 调试技巧
- 后端日志：`env_logger` 输出到控制台 + `clipboard-debug.log` 文件
- 前端调试：Tauri dev 模式自动打开 devtools
- Rust 编译检查：`cd src-tauri && cargo check`
