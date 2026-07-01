# PastePanda 项目开发规则

## 1. 先出方案再动手
修改代码前先出方案让用户确认，至少提供 2-3 个方案对比（含优缺点分析），让用户选择。

## 2. 每次修改更新版本号
在 `src-tauri/tauri.conf.json` 中递增版本号（版本号唯一来源）。同时同步更新 `src-tauri/Cargo.toml` 中的 `version` 字段，保持两处版本号一致。

## 3. 构建 exe 前要询问用户
用户确认后才执行 `npx tauri build`。

## 4. 改动 UI 要先出 HTML 设计稿
涉及 UI 变更时先生成 HTML 预览让用户确认效果。

## 5. 更新版本号后等用户验证确认再提交 git
不要自动提交，等用户说"提交"或"commit"再操作。

## 6. 预览测试用 Tauri dev 后台运行
启动命令用 `Start-Process` 后台方式，不阻塞终端。改代码支持热更新无需反复重启。

## 7. 方案设计需考虑代码架构
模块化、可维护性、扩展性，遵循项目已有的架构模式。

## 8. 方案设计需考虑性能
内存占用、加载速度、渲染效率、缓存策略。

## 9. 方案设计需考虑用户体验
交互流畅度、反馈及时性、边界状态处理（加载中/空状态/错误）。

---

## 发版流程
每次更新 `tauri.conf.json` 中的版本号后，必须：
1. `git add` + `git commit` 版本号变更
2. `git tag v{version}` 打 tag
3. `git push origin v{version}` 推送 tag
推送 tag 会自动触发 GitHub Actions 构建并发布 Release。
