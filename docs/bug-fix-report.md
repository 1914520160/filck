# 剪贴板管理 — 全部 Bug 修复报告

> 修复时间：2026-06-27 | 修复问题：13 个（全部）

---

## 修复概览

| # | 级别 | 问题 | 修复方式 |
|---|------|------|---------|
| 1 | 🔴 | prependItem 无去重 | 添加 id 去重逻辑 |
| 2 | 🔴 | 监听器竞态条件 | 统一走 prependItem 内部去重 |
| 3 | 🔴 | 前端内存无上限 | 限制缓存最大 500 条 |
| 4 | 🟡 | 双击"粘贴到前台"只复制不粘贴 | 改用后端 pasteText（复制+Ctrl+V） |
| 5 | 🟡 | 编辑记录不更新 md5/拼音 | 后端 update 时同步计算 |
| 6 | 🟡 | 快捷键浮层硬编码 | 从 config 动态读取 |
| 7 | 🟡 | LAN 同步拼音为空 | 添加 compute_pinyin_initials |
| 8 | 🟢 | 退出弹窗无 X/ESC | 添加关闭按钮+ESC监听 |
| 9 | 🟢 | 图片复制用 fetch | 改用 Rust 命令+atob 解码 |
| 10 | 🟢 | 图片缓存无清理 | 添加 clearImageCaches 导出 |
| 11 | 🟢 | getFilteredItems 重复计算 | 添加缓存键机制 |
| 12 | 🟢 | 编辑后 store 不同步 | 保存后重新加载后端数据 |
| 13 | 🟢 | Rust 函数重复定义 | 提取公共函数到 data_store |

---

## 修改文件清单

### 前端 TypeScript（6 个文件）

| 文件 | 改动 |
|------|------|
| `stores/appStore.ts` | prependItem 去重+上限、getFilteredItems 缓存 |
| `lib/api.ts` | 简化监听器去重、添加 clearImageCaches、减少缓存上限 |
| `components/CardList.tsx` | 粘贴到前台用后端引擎、图片复制用 atob 替代 fetch |
| `components/EditDialog.tsx` | 保存后重新加载同步 md5/pinyin |
| `components/TopBar.tsx` | 退出弹窗添加 X 按钮+ESC 监听 |
| `App.tsx` | 快捷键浮层从 config 动态读取 |
| `styles/app.css` | 退出弹窗关闭按钮样式 |

### Rust 后端（3 个文件）

| 文件 | 改动 |
|------|------|
| `data_store.rs` | update_history 同步更新 md5+拼音、提取公共 compute_pinyin_initials |
| `clipboard_monitor.rs` | 引用公共 compute_pinyin_initials、删除本地重复定义 |
| `lan_sync.rs` | LAN 同步记录计算拼音首字母 |

### 编译验证

- ✅ TypeScript lint：所有文件零错误
- ✅ Rust `cargo check`：编译通过
