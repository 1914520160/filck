import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Search } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { getAppVersion, getAppName } from "@/lib/api";

/** 将 "ctrl+shift+v" 格式化为胶囊 JSX */
function KeyCaps({ value }: { value: string }) {
  const parts = value.split("+").map((p) => {
    const t = p.trim();
    if (t.length === 1) return t.toUpperCase();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  });
  return (
    <span className="h-key">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="plus">+</span>}
          {p}
        </span>
      ))}
    </span>
  );
}

/** 静态快捷键胶囊 */
function StaticKey({ children }: { children: string }) {
  return <span className="h-key">{children}</span>;
}

/** 一条快捷键行 */
function KeyRow({ desc, value, isStatic, hidden }: { desc: string; value: string; isStatic?: boolean; hidden?: boolean }) {
  return (
    <div className={`h2-row${hidden ? " h2-hidden" : ""}`}>
      <span className="h2-desc">{desc}</span>
      {isStatic ? <StaticKey>{value}</StaticKey> : <KeyCaps value={value} />}
    </div>
  );
}

/** 子分组标题 */
function SubTitle({ children, hidden }: { children: string; hidden?: boolean }) {
  return <div className={`h2-sub-title${hidden ? " h2-hidden" : ""}`}>{children}</div>;
}

/** 功能指南卡片 */
function GuideCard({ icon, color, title, desc, hidden }: { icon: React.ReactNode; color: string; title: string; desc: string; hidden?: boolean }) {
  return (
    <div className={`h2-card${hidden ? " h2-hidden" : ""}`}>
      <div className="h2-card-icon" style={{ background: `${color}20`, color }}>{icon}</div>
      <div className="h2-card-body">
        <div className="h2-card-title">{title}</div>
        <div className="h2-card-desc">{desc}</div>
      </div>
    </div>
  );
}

/** 技巧提示条目 */
function TipItem({ children, hidden }: { children: React.ReactNode; hidden?: boolean }) {
  return <div className={`h2-tip${hidden ? " h2-hidden" : ""}`}>{children}</div>;
}

/** 搜索匹配：判断文本是否包含搜索词 */
function matches(q: string, ...texts: (string | undefined)[]) {
  if (!q) return false;
  const lower = q.toLowerCase();
  return texts.some(t => t?.toLowerCase().includes(lower));
}

/** 可折叠板块 */
function Section({
  icon, iconBg, title, defaultExpanded, forceExpand, hasMatch, children
}: {
  icon: React.ReactNode; iconBg: string; title: string; defaultExpanded?: boolean; forceExpand: boolean; hasMatch: boolean; children: React.ReactNode;
}) {
  const [manualExpanded, setManualExpanded] = useState(defaultExpanded ?? false);
  const expanded = forceExpand ? true : manualExpanded;

  if (forceExpand && !hasMatch) return null;

  return (
    <div className={`h2-section${expanded ? " expanded" : ""}`}>
      <div className="h2-section-header" onClick={() => !forceExpand && setManualExpanded(!manualExpanded)}>
        <span className="h2-section-icon" style={{ background: iconBg }}>{icon}</span>
        <span className="h2-section-title">{title}</span>
        <ChevronRight size={12} className="h2-arrow" />
      </div>
      <div className="h2-section-content">
        <div className="h2-section-inner">{children}</div>
      </div>
    </div>
  );
}

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = useAppStore((s) => s.config);
  const [appName, setAppName] = useState("PastePanda");
  const [appVersion, setAppVersion] = useState("?.?.?");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      getAppVersion().then(setAppVersion);
      getAppName().then(setAppName).catch(() => setAppName("PastePanda"));
      setQuery("");
      // Auto-focus search on open
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  const hotkeyShow = (config.hotkey as string) || "ctrl+shift+v";
  const hotkeySeq = (config.sequential_hotkey as string) || "ctrl+q";
  const hotkeySelectAll = (config.select_all_hotkey as string) || "ctrl+a";

  const q = query.trim();
  const searching = q.length > 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="dialog-backdrop" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="dialog-box w460"
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="dialog-header">
              <div className="dialog-header-left">
                <span style={{ fontSize: 15 }}>📖</span>
                <h2 className="dialog-title">帮助中心</h2>
                <span className="dialog-version-badge">v{appVersion}</span>
              </div>
              <button onClick={onClose} className="dialog-close"><X size={16} /></button>
            </div>

            {/* Search bar */}
            <div className="h2-search-bar">
              <div className="h2-search-wrap">
                <Search size={13} className="h2-search-icon" />
                <input
                  ref={searchRef}
                  type="text"
                  className="h2-search-input"
                  placeholder="搜索快捷键、功能…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
                />
                {searching && (
                  <button className="h2-search-clear" onClick={() => { setQuery(""); searchRef.current?.focus(); }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="dialog-body h2-body">

              {/* 1. 快捷键速查 — 默认展开 */}
              <Section icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 12h.01M18 12h.01M6 16h12"/></svg>} iconBg="linear-gradient(135deg, #3B82F6, #0078D4)" title="快捷键速查" defaultExpanded
                forceExpand={searching} hasMatch={!searching || matches(q, "唤出 隐藏 窗口", "隐藏 Esc", "设置 ctrl+s", "帮助 ctrl+h", "片段库 ctrl+b", "内容提取 ctrl+e", "导航 上下 ↑ ↓", "顶部 底部 Home End", "粘贴 Enter", "预览 Space", "删除 Delete", "右键 Shift F10", "全选 ctrl+a", "置顶 ctrl+d", "撤销 ctrl+z", "多选 ctrl click", "范围 shift click", "依次粘贴 ctrl+q", "粘贴第N ctrl alt 1 9")}>
                <SubTitle hidden={searching && !matches(q, "唤出 隐藏 窗口", "隐藏 Esc", "设置 ctrl+s", "帮助 ctrl+h", "片段库 ctrl+b", "内容提取 ctrl+e")}>全局操作</SubTitle>
                <KeyRow desc="唤出 / 隐藏窗口" value={hotkeyShow} hidden={searching && !matches(q, "唤出 隐藏 窗口", hotkeyShow)} />
                <KeyRow desc="隐藏窗口" value="Esc" isStatic hidden={searching && !matches(q, "隐藏 Esc", "窗口")} />
                <KeyRow desc="打开设置" value="ctrl+s" hidden={searching && !matches(q, "设置 ctrl+s")} />
                <KeyRow desc="打开帮助" value="ctrl+h" hidden={searching && !matches(q, "帮助 ctrl+h")} />
                <KeyRow desc="打开片段库" value="ctrl+b" hidden={searching && !matches(q, "片段库 ctrl+b")} />
                <KeyRow desc="打开内容提取" value="ctrl+e" hidden={searching && !matches(q, "内容提取 ctrl+e")} />

                <SubTitle hidden={searching && !matches(q, "导航 上下 ↑ ↓", "顶部 底部 Home End", "粘贴 Enter", "预览 Space", "删除 Delete", "右键 Shift F10", "全选 ctrl+a", "置顶 ctrl+d", "撤销 ctrl+z")}>列表操作</SubTitle>
                <KeyRow desc="上下导航记录" value="↑ / ↓" isStatic hidden={searching && !matches(q, "导航 上下 ↑ ↓")} />
                <KeyRow desc="跳到顶部 / 底部" value="Home / End" isStatic hidden={searching && !matches(q, "顶部 底部 Home End")} />
                <KeyRow desc="粘贴选中记录" value="Enter" isStatic hidden={searching && !matches(q, "粘贴 Enter 选中")} />
                <KeyRow desc="快速预览内容" value="Space" isStatic hidden={searching && !matches(q, "预览 Space 内容")} />
                <KeyRow desc="删除选中记录" value="Delete" isStatic hidden={searching && !matches(q, "删除 Delete")} />
                <KeyRow desc="打开右键菜单" value="Shift + F10" isStatic hidden={searching && !matches(q, "右键 Shift F10 菜单")} />
                <KeyRow desc="全选" value={hotkeySelectAll} hidden={searching && !matches(q, "全选 ctrl+a", hotkeySelectAll)} />
                <KeyRow desc="置顶 / 取消置顶" value="ctrl+d" hidden={searching && !matches(q, "置顶 ctrl+d")} />
                <KeyRow desc="撤销删除" value="ctrl+z" hidden={searching && !matches(q, "撤销 ctrl+z")} />

                <SubTitle hidden={searching && !matches(q, "多选 ctrl click", "范围 shift click")}>多选操作</SubTitle>
                <KeyRow desc="逐个多选" value="ctrl+click" hidden={searching && !matches(q, "多选 ctrl click")} />
                <KeyRow desc="范围选择" value="shift+click" hidden={searching && !matches(q, "范围 shift click")} />

                <SubTitle hidden={searching && !matches(q, "依次粘贴 ctrl+q", "粘贴第N ctrl alt 1 9")}>高级功能</SubTitle>
                <KeyRow desc="依次粘贴模式" value={hotkeySeq} hidden={searching && !matches(q, "依次粘贴", hotkeySeq)} />
                <KeyRow desc="粘贴第 N 条" value="ctrl+alt+1~9" hidden={searching && !matches(q, "粘贴第N ctrl alt 1 9")} />
              </Section>

              {/* 2. 功能指南 */}
              <Section icon="🧩" iconBg="linear-gradient(135deg, #8B5CF6, #5856D6)" title="功能指南"
                forceExpand={searching} hasMatch={!searching || matches(q, "剪贴板 历史", "片段库 模板", "内容 提取 链接 邮箱", "工作 空间", "图片 处理 OCR", "局域网 同步", "粘贴 变换", "数据 管理 导入 导出", "托盘 菜单", "依次 粘贴 批量")}>
                <GuideCard icon="📋" color="#4f8cff" title="剪贴板历史"
                  desc="自动记录文本/图片/文件/颜色等所有剪贴板内容，支持搜索筛选、标签分类、置顶收藏"
                  hidden={searching && !matches(q, "剪贴板 历史 记录", "文本 图片 文件 颜色", "搜索 筛选 标签 置顶")} />
                <GuideCard icon="📦" color="#8b5cf6" title="片段库"
                  desc="保存常用文本模板（API、SQL、配置等），一键粘贴。支持批量管理、导入导出"
                  hidden={searching && !matches(q, "片段库 模板", "API SQL 配置", "导入 导出")} />
                <GuideCard icon="🔍" color="#34d399" title="内容提取"
                  desc="一键提取剪贴板中的链接、邮箱、电话号码、代码块、颜色值等信息"
                  hidden={searching && !matches(q, "内容 提取", "链接 邮箱 电话 代码 颜色")} />
                <GuideCard icon="🗂" color="#fbbf24" title="工作空间"
                  desc="隔离不同场景的剪贴板历史（如工作/个人/项目），切换空间即切换记录视图"
                  hidden={searching && !matches(q, "工作 空间", "场景 隔离 切换", "工作 个人 项目")} />
                <GuideCard icon="🖼" color="#f87171" title="图片处理"
                  desc="图片预览、OCR 文字识别、图片置顶悬浮窗，右键菜单快速操作"
                  hidden={searching && !matches(q, "图片 处理", "预览 OCR 识别 悬浮窗")} />
                <GuideCard icon="🔄" color="#a78bfa" title="局域网同步"
                  desc="同一局域网下多设备实时同步剪贴板历史，无需登录账号"
                  hidden={searching && !matches(q, "局域网 同步", "多设备 实时")} />
                <GuideCard icon="📎" color="#60a5fa" title="粘贴变换"
                  desc="右键菜单支持：纯文本粘贴、去除空格、大小写转换、Base64 编解码等"
                  hidden={searching && !matches(q, "粘贴 变换", "纯文本 空格 大小写 Base64")} />
                <GuideCard icon="📤" color="#34d399" title="数据管理"
                  desc="支持导入导出剪贴板历史、自动清理过期记录、统计面板查看使用数据"
                  hidden={searching && !matches(q, "数据 管理", "导入 导出 清理 统计")} />
                <GuideCard icon="📌" color="#fb923c" title="托盘菜单"
                  desc="系统托盘常驻，右键快速查看最近记录、打开主窗口、退出程序"
                  hidden={searching && !matches(q, "托盘 菜单", "系统 常驻 最近 记录")} />
                <GuideCard icon="⚡" color="#4ade80" title="依次粘贴"
                  desc="批量粘贴模式，按顺序逐条粘贴选中记录，适合填写表单、批量输入场景"
                  hidden={searching && !matches(q, "依次 粘贴", "批量 表单 输入")} />
              </Section>

              {/* 3. 设置说明 */}
              <Section icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>} iconBg="linear-gradient(135deg, #F59E0B, #FF9500)" title="设置说明"
                forceExpand={searching} hasMatch={!searching || matches(q, "主题 切换 深色 浅色", "自动 清理 过期", "窗口 行为 置顶 自启", "自定义 热键")}>
                <SubTitle hidden={searching && !matches(q, "主题 切换 深色 浅色")}>外观</SubTitle>
                <GuideCard icon="🎨" color="#4f8cff" title="主题切换"
                  desc="支持深色/浅色/跟随系统三种模式，标签样式可选圆角/直角"
                  hidden={searching && !matches(q, "主题 切换", "深色 浅色 系统", "标签 圆角 直角")} />

                <SubTitle hidden={searching && !matches(q, "自动 清理 过期", "窗口 行为 置顶 自启")}>通用</SubTitle>
                <GuideCard icon="🗑" color="#fbbf24" title="自动清理"
                  desc="设置自动清理 N 天前的旧记录、过滤空白内容、限制最大记录数"
                  hidden={searching && !matches(q, "自动 清理", "过期 旧记录", "过滤 空白 限制")} />
                <GuideCard icon="📌" color="#a78bfa" title="窗口行为"
                  desc="窗口置顶、开机自启、隐藏时自动粘贴等行为配置"
                  hidden={searching && !matches(q, "窗口 行为", "置顶 自启 自动粘贴")} />

                <SubTitle hidden={searching && !matches(q, "自定义 热键")}>快捷键</SubTitle>
                <GuideCard icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 12h.01M18 12h.01M6 16h12"/></svg>} color="#f87171" title="自定义热键"
                  desc="可自定义：全局唤出热键、依次粘贴热键、全选热键等"
                  hidden={searching && !matches(q, "自定义 热键", "全局 唤出 全选")} />
              </Section>

              {/* 4. 技巧提示 */}
              <Section icon="💡" iconBg="linear-gradient(135deg, #10B981, #34C759)" title="技巧提示"
                forceExpand={searching} hasMatch={!searching || matches(q, "Ctrl Click 多选", "Shift Click 范围", "Space 预览", "双击 卡片 配置", "Ctrl Z 撤销", "Ctrl Alt 1 9", "置顶 固定", "搜索 过滤")}>
                <TipItem hidden={searching && !matches(q, "Ctrl Click 多选", "批量 删除")}>
                  <span className="h2-tip-bulb">💡</span>
                  <span className="h2-tip-text"><strong>Ctrl + Click</strong> 可逐个多选记录，然后批量删除或操作</span>
                </TipItem>
                <TipItem hidden={searching && !matches(q, "Shift Click 范围", "选择")}>
                  <span className="h2-tip-bulb">💡</span>
                  <span className="h2-tip-text"><strong>Shift + Click</strong> 可范围选择，从当前到点击位置全部选中</span>
                </TipItem>
                <TipItem hidden={searching && !matches(q, "Space 预览", "内容")}>
                  <span className="h2-tip-bulb">💡</span>
                  <span className="h2-tip-text">按 <strong>Space</strong> 快速预览选中内容，无需打开详情</span>
                </TipItem>
                <TipItem hidden={searching && !matches(q, "双击 卡片", "配置")}>
                  <span className="h2-tip-bulb">💡</span>
                  <span className="h2-tip-text">双击卡片行为可在设置中配置（粘贴/预览/复制）</span>
                </TipItem>
                <TipItem hidden={searching && !matches(q, "Ctrl Z 撤销", "误删 恢复")}>
                  <span className="h2-tip-bulb">💡</span>
                  <span className="h2-tip-text">误删记录可按 <strong>Ctrl + Z</strong> 立即撤销恢复</span>
                </TipItem>
                <TipItem hidden={searching && !matches(q, "Ctrl Alt 1 9", "序号 粘贴")}>
                  <span className="h2-tip-bulb">💡</span>
                  <span className="h2-tip-text"><strong>Ctrl + Alt + 1~9</strong> 直接粘贴对应序号的记录，无需打开窗口</span>
                </TipItem>
                <TipItem hidden={searching && !matches(q, "置顶 固定", "常用")}>
                  <span className="h2-tip-bulb">💡</span>
                  <span className="h2-tip-text">置顶记录会始终显示在列表顶部，适合固定常用内容</span>
                </TipItem>
                <TipItem hidden={searching && !matches(q, "搜索 过滤", "关键词 类型")}>
                  <span className="h2-tip-bulb">💡</span>
                  <span className="h2-tip-text">搜索框支持关键词过滤，输入即搜，支持类型筛选</span>
                </TipItem>
              </Section>

              {/* No results message */}
              {searching && (
                <div className="h2-no-results">未找到匹配内容</div>
              )}

            </div>

            {/* Footer */}
            <div className="h-footer">
              <button onClick={onClose} className="h-close-btn">我知道了</button>
              <span className="h-ver">{appName} v{appVersion}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
