# 剪贴板管理软件 — Bug 检查报告

**检查日期**: 2026-06-27  
**检查范围**: Rust 后端 + TypeScript 前端 + 配置文件  
**总计发现**: 13 个问题（1 个严重、5 个中等、7 个轻微）

---

## 一、严重问题 🔴

### 1. `prependItem` 不做去重，可能导致重复卡片显示

**文件**: `src/stores/appStore.ts:145`  
**问题**: `prependItem` 直接将新记录插入数组头部，不做任何去重检查。虽然后端 `clipboard-changed` 事件中通过 `findIndex` 做了去重判断（`api.ts:79`），但如果多个事件快速到达（比如 LAN 同步 + 本地剪贴板同时触发），竞态条件可能导致同一记录被插入两次。

```typescript
// appStore.ts:145
prependItem: (item) => set((s) => ({ history: [item, ...s.history] })),
```

**建议修复**:
```typescript
prependItem: (item) => set((s) => {
  if (s.history.some(h => h.id === item.id)) return s;
  return { history: [item, ...s.history] };
}),
```

---

## 二、中等问题 🟡

### 2. 设置弹框 `updateConfig` 参数类型不安全

**文件**: `src/components/SettingsDialog.tsx:28`  
**问题**: `updateConfig` 接受 `Partial<AppConfig>`，但调用方传入 `{ theme: t.key }`，其中 `t.key` 类型是 `ThemeKey`（字符串联合类型）。而 `AppConfig.theme` 类型为 `string`，类型不匹配但 TypeScript 不会报错，因为 `ThemeKey extends string`。但如果传入错误的值（如空字符串），会导致主题切换失败。

**建议**: 将 `AppConfig.theme` 类型改为 `ThemeKey`，确保类型安全。

---

### 3. 双击粘贴模式下 `navigator.clipboard.writeText` 只复制不粘贴

**文件**: `src/components/CardList.tsx:268-270`  
**问题**: 双击"粘贴到前台"模式下，实际只调用了 `navigator.clipboard.writeText(item.text)`，**没有调用后端的粘贴引擎**。这意味着文本被写入剪贴板，但并未实际发送 `WM_PASTE` 到目标窗口。与 `Enter` 键粘贴逻辑（`App.tsx:195` 调用 `pasteText`）不一致。

```typescript
// CardList.tsx:268-270 — 只复制，没有粘贴！
if (action === "paste") {
  setPastingId(item.id);
  try {
    await navigator.clipboard.writeText(item.text); // ❌ 只写入剪贴板
    toast("已粘贴到前台", "success"); // 提示文案误导
  }
}
```

**建议修复**: 改为调用 `pasteText(item.text)`。

---

### 4. 帮助弹框内快捷键显示使用静态字符串，不与实际配置同步

**文件**: `src/App.tsx:346-361`  
**问题**: `showShortcuts` 快捷键浮层中硬编码了 `Ctrl+Shift+V`、`Ctrl+Shift+B` 等字符串，当用户在设置中修改快捷键后，这里不会更新。虽然帮助弹框 (`HelpDialog`) 正确读取了配置，但 `?` 快捷键浮层没有。

**建议**: 浮层也读取 `config.hotkey` 和 `config.sequential_hotkey` 动态显示。

---

### 5. 图片预览 `previewScale`/`previewRotation` 等状态在组件卸载后未重置

**文件**: `src/components/CardList.tsx:27-33`  
**问题**: 预览状态保存在 `previewStateCache` ref 中，但缓存以 `content` 路径为 key。如果图片路径不变但内容变化（如覆盖写入同一路径），缓存会返回旧状态。

**建议**: 在 `closePreview` 时也应检查图片是否还存在（`getFileInfo`），不存在则清除缓存。

---

### 6. `handleDoubleClick` 中图片复制用 `fetch(dataUrl)` 可能失败

**文件**: `src/components/CardList.tsx:248-250`  
**问题**: 双击图片时，先通过 `getImageDataUrl` 获取 base64 data URL，再用 `fetch(dataUrl)` 转 blob。某些浏览器/WebView 环境下 `fetch("data:...")` 可能失败或很慢。更好的方式是直接解析 base64 为 `Uint8Array`，构造 blob。

**建议**: 
```typescript
const base64 = dataUrl.split(",")[1];
const byteChars = atob(base64);
const byteNums = new Uint8Array(byteChars.length);
for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
const blob = new Blob([byteNums], { type: "image/png" });
```

---

## 三、轻微问题 🟢

### 7. Rust 剪贴板监听线程中 `track_foreground_window` 失败时静默忽略

**文件**: `src-tauri/src/clipboard_monitor.rs:129-131`  
**问题**: 监听线程中调用 `engine.track_foreground_window()` 时用了 `if let`，如果 `PasteEngine` 状态获取失败则静默跳过。这导致某些情况下粘贴目标窗口跟踪中断，但没有日志。

**建议**: 添加 `else { log::warn!(...) }` 日志。

---

### 8. `sequentialPaste` 中 `seqPointer` 循环重置时机不对

**文件**: `src/lib/api.ts:143-153`  
**问题**: 当 `next >= textItems.length` 时，先判断是否循环再设置指针。但如果 `loop=true` 且 `idx >= textItems.length`（第 123 行已处理），第 145 行再判断一次 `next >= textItems.length` 会多跳一次。

**建议**: 简化逻辑，在循环模式下到达末尾后重置为 0，非循环模式下设为 `textItems.length`（表示已结束）。

---

### 9. 退出确认弹窗缺少关闭按钮

**文件**: `src/components/TopBar.tsx:136-161`  
**问题**: `quit-confirm-box` 没有 `X` 关闭按钮，只能通过点击背景或按钮关闭。对于无边框窗口，ESC 键也不会关闭它（因为退出弹窗不在 `dialogOpen` 变量中）。

**建议**: 添加关闭按钮或让 ESC 键也能关闭退出确认弹窗。

---

### 10. `toggle_monitor` 暂停监听后重启，不会恢复 `auto_strip` 缓存

**文件**: `src-tauri/src/commands.rs:496-510`  
**问题**: `toggle_monitor` 调用 `monitor.start()` 时，监听线程会重新开始，但 `cached_auto_strip` 缓存不会被重新设置。如果用户在暂停期间修改了 `auto_strip` 设置，重启后缓存值仍是旧的。

**现状分析**: 实际上 `save_config` 命令（`commands.rs:83-97`）会调用 `monitor.update_auto_strip_cache()`，所以只要用户在修改设置时点了保存，缓存就会更新。但暂停期间修改设置而不点保存（即时保存 `updateAndSave`），缓存会被正确更新。**无实际影响，仅理论风险。**

---

### 11. `searchKeyword` 防抖使用 `window` 全局属性存储 timer ID

**文件**: `src/stores/appStore.ts:197-208`  
**问题**: 用 `window["__search_debounce__"]` 存储防抖定时器 ID，类型转换 hacky 且可能与其它代码冲突。

**建议**: 使用模块级变量或 `useRef`（但 Zustand store 是模块级，无法用 hooks）。可以考虑用模块级 `let debounceTimer: number | undefined;`。

---

### 12. LAN 同步中图片同步后 `pinyin_initials` 未计算

**文件**: `src-tauri/src/lan_sync.rs:200-211`  
**问题**: 从局域网接收的文本记录，`pinyin_initials` 被设为 `None`，导致这些记录无法通过拼音搜索找到。

**建议**: 对文本类型记录计算拼音首字母并设置 `pinyin_initials`。

---

### 13. `update_history` 命令编辑后不更新 md5 和拼音

**文件**: `src-tauri/src/data_store.rs:210-222`  
**问题**: `update_history` 只更新 `text` 字段，不同步更新 `md5` 和 `pinyin_initials`。编辑后智能合并功能会基于旧的 md5 值工作，导致错误行为。

**建议**: 编辑时同时重新计算 md5 和拼音首字母并写入数据库。

---

## 四、无问题区域 ✅

以下模块经过检查未发现明显 bug：

| 模块 | 评价 |
|------|------|
| 粘贴引擎 (`paste_engine.rs`) | ✅ 锁机制、抑制机制、窗口追踪设计良好 |
| 数据存储 (`data_store.rs`) | ✅ SQL 查询安全，参数化查询无注入风险 |
| 热键管理 (`hotkey_manager.rs`) | ✅ 格式规范化、注册/注销逻辑正确 |
| 托盘管理 (`tray_manager.rs`) | ✅ 所有权处理正确，失焦关闭逻辑合理 |
| 剪贴板监听 (`clipboard_monitor.rs`) | ✅ 去重、抑制、智能合并逻辑正确 |
| 主题系统 (`theme.ts`) | ✅ 简洁清晰，无问题 |
| 工具函数 (`utils.ts`) | ✅ 时间格式化、文本截断、类型检测逻辑正确 |
| 配置文件 (`tauri.conf.json`) | ✅ 窗口配置、CSP、打包配置正确 |

---

## 五、修复优先级建议

| 优先级 | 问题编号 | 描述 |
|--------|---------|------|
| P0 (立即修复) | #3 | 双击粘贴只复制不粘贴 — 功能失效 |
| P1 (尽快修复) | #1 | prependItem 可能产生重复卡片 |
| P1 | #13 | 编辑记录不更新 md5，导致智能合并失效 |
| P2 (计划修复) | #2 | 类型安全改进 |
| P2 | #4 | 快捷键浮层不同步实际配置 |
| P2 | #12 | LAN 同步记录无法拼音搜索 |
| P3 (择机修复) | #5-#11 | 轻微体验问题 |
