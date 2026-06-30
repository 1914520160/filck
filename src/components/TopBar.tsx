import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, FilterType, TimeFilter, SourceFilter, HistoryItem } from "@/stores/appStore";
import { getAppVersion } from "@/lib/api";
import { UpdateBadge } from "@/components/UpdateBadge";
import { logger } from "@/lib/logger";
import { X, ChevronDown } from "lucide-react";

const TABS: { key: FilterType; label: string; icon: string }[] = [
  { key: "all",    label: "全部", icon: "📋" },
  { key: "text",   label: "文本", icon: "📝" },
  { key: "image",  label: "图片", icon: "📸" },
  { key: "file",   label: "文件", icon: "📁" },
  { key: "pinned", label: "收藏", icon: "⭐" },
];

const TIME_OPTIONS: { key: TimeFilter; label: string }[] = [
  { key: "all",   label: "全部时间" },
  { key: "today", label: "今天" },
  { key: "week",  label: "本周" },
  { key: "month", label: "本月" },
];

async function minimizeWin() {
  try { (await import("@tauri-apps/api/window")).getCurrentWindow().minimize(); } catch { logger.warn("窗口最小化失败"); }
}
async function hideWin() {
  try { (await import("@tauri-apps/api/window")).getCurrentWindow().hide(); } catch { logger.warn("窗口隐藏失败"); }
}
async function quitApp() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("exit_app");
  } catch { logger.warn("退出应用失败"); }
}

type TabStyle = "segmented" | "circle";

function getTabStyle(): TabStyle {
  try { return (localStorage.getItem("tabStyle") as TabStyle) || "segmented"; } catch { return "segmented"; }
}
function saveTabStyle(v: TabStyle) {
  try { localStorage.setItem("tabStyle", v); } catch { logger.warn("保存tab样式失败"); }
}

export function TopBar({ onSettings, onHelp, onSnippets, onExtract, onAbout }: {
  onSettings?: () => void; onHelp?: () => void; onSnippets?: () => void; onExtract?: () => void; onAbout?: () => void;
}) {
  const filterType = useAppStore((s) => s.filterType);
  const setFilterType = useAppStore((s) => s.setFilterType);
  const timeFilter = useAppStore((s) => s.timeFilter);
  const setTimeFilter = useAppStore((s) => s.setTimeFilter);
  const sourceFilter = useAppStore((s) => s.sourceFilter);
  const setSourceFilter = useAppStore((s) => s.setSourceFilter);
  const searchKeyword = useAppStore((s) => s.searchKeyword);
  const setSearchKeyword = useAppStore((s) => s.setSearchKeyword);
  const searchHistory = useAppStore((s) => s.searchHistory);
  const addSearchHistory = useAppStore((s) => s.addSearchHistory);
  const removeSearchHistory = useAppStore((s) => s.removeSearchHistory);
  const clearSearchHistory = useAppStore((s) => s.clearSearchHistory);
  const history = useAppStore((s) => s.history);
  const ws = useAppStore((s) => s.config.current_workspace);
  const [focused, setFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [tabStyle, setTabStyle] = useState<TabStyle>(getTabStyle);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [appVersion, setAppVersion] = useState("...");

  // ESC 关闭退出确认弹窗
  useEffect(() => {
    if (!showQuitConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowQuitConfirm(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showQuitConfirm]);

  useEffect(() => {
    getAppVersion().then(setAppVersion).catch(() => setAppVersion("?.?.?"));
  }, []);

  // 监听 localStorage 变化（SettingsDialog 更新 tabStyle 时触发）
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "tabStyle" && e.newValue) {
        setTabStyle(e.newValue as TabStyle);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // 点击外部关闭搜索历史下拉
  useEffect(() => {
    if (!showHistory) return;
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHistory]);

  const handleSearchSubmit = useCallback((kw: string) => {
    setSearchKeyword(kw);
    if (kw.trim()) {
      addSearchHistory(kw.trim());
    }
    setShowHistory(false);
  }, [setSearchKeyword, addSearchHistory]);

  const counts = useMemo(() => {
    const items = history.filter((h) => h.workspace === ws);
    return {
      all: items.length,
      text: items.filter((h) => h.type === "text").length,
      image: items.filter((h) => h.type === "image").length,
      file: items.filter((h) => h.type === "file").length,
      pinned: items.filter((h) => h.pinned).length,
    };
  }, [history, ws]);

  return (
    <div className="header" data-tauri-drag-region role="banner">
      {/* 标题行 */}
      <div className="header-top" data-tauri-drag-region>
        <div className="header-title">
          <span className="header-title-icon">📋</span>
          <span className="header-title-text">Filck</span>
          <span className="header-badge">v{appVersion}</span>
          <UpdateBadge />
        </div>
        <div className="header-icons" data-tauri-drag-region="false">
          <IconBtn icon="📝" tip="片段库" onClick={onSnippets} />
          <IconBtn icon="🧲" tip="内容提取" onClick={onExtract} />
          <IconBtn icon="⚙" tip="设置" onClick={onSettings} />
          <IconBtn icon="❓" tip="帮助" onClick={onHelp} />
          <IconBtn icon="ℹ" tip="关于" onClick={onAbout} />
          <IconBtn icon="—" tip="最小化到任务栏" onClick={minimizeWin} />
          <IconBtn icon="✕" tip="退出程序" danger onClick={() => setShowQuitConfirm(true)} />
        </div>
      </div>

      {/* 退出确认弹窗 */}
      <AnimatePresence>
        {showQuitConfirm && (
          <div className="dialog-backdrop" style={{ zIndex: 9999 }} onClick={() => setShowQuitConfirm(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="quit-confirm-box" onClick={(e) => e.stopPropagation()}>
              <button className="quit-confirm-close" onClick={() => setShowQuitConfirm(false)} aria-label="关闭"><X size={16} /></button>
              <div className="quit-confirm-icon">⚠️</div>
              <h3 className="quit-confirm-title">退出 Filck</h3>
              <p className="quit-confirm-desc">
                退出后剪贴板监听将停止，托盘图标也会消失。<br />
                如果只想让窗口在后台运行，请选择<b>「隐藏窗口」</b>，托盘图标仍会保留。
              </p>
              <div className="quit-confirm-actions">
                <button className="quit-btn-secondary" onClick={() => setShowQuitConfirm(false)}>取消</button>
                <button className="quit-btn-tray" onClick={() => { hideWin(); setShowQuitConfirm(false); }}>
                  👁 隐藏窗口
                </button>
                <button className="quit-btn-danger" onClick={quitApp}>
                  <X size={14} /> 确认退出
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 搜索框 + Tab 在同一个容器内，保证宽度完全一致 */}
      <div className="header-controls">
        <div ref={searchBoxRef} className={`search-box${focused ? " focused" : ""}${showHistory ? " has-history" : ""}`} data-tauri-drag-region="false" style={{ position: "relative" }}>
          <span className="search-icon">🔍</span>
          <input type="text" value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              if (!e.target.value) setShowHistory(true);
            }}
            onFocus={() => { setFocused(true); setShowHistory(searchHistory.length > 0 && !searchKeyword); }}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchSubmit((e.target as HTMLInputElement).value);
              }
            }}
            placeholder="搜索剪贴板... (Enter 搜索)"
            className="search-input"
            aria-label="搜索剪贴板内容"
            aria-description="支持拼音首字母搜索" />
          {searchKeyword && (
            <button onClick={() => { setSearchKeyword(""); setShowHistory(searchHistory.length > 0); }} className="search-clear">
              ✕
            </button>
          )}
          {/* 搜索历史下拉 */}
          {showHistory && searchHistory.length > 0 && (
            <div className="search-history-dropdown">
              <div className="search-history-header">
                <span>最近搜索</span>
                <button onClick={(e) => { e.stopPropagation(); clearSearchHistory(); setShowHistory(false); }} className="search-history-clear-all">清除全部</button>
              </div>
              {searchHistory.map((kw, i) => (
                <div key={i} className="search-history-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSearchSubmit(kw);
                  }}>
                  <span className="search-history-icon">🕐</span>
                  <span className="search-history-text">{kw}</span>
                  <button className="search-history-remove"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeSearchHistory(kw); }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab 区域 */}
        <div className="tabs-area" data-tauri-drag-region="false">
          <AnimatePresence mode="wait">
            {tabStyle === "segmented" ? (
              <motion.div key="seg" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}>
                <SegmentedTabs filterType={filterType} setFilterType={setFilterType} counts={counts} />
              </motion.div>
            ) : (
              <motion.div key="circle" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}>
                <CircleTabs filterType={filterType} setFilterType={setFilterType} counts={counts} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 时间 + 来源筛选行 */}
        <div className="filter-bar" data-tauri-drag-region="false">
          <FilterDropdown
            label="时间"
            value={timeFilter}
            options={TIME_OPTIONS}
            onChange={(v) => setTimeFilter(v as TimeFilter)}
          />
          <SourceFilterDropdown
            value={sourceFilter}
            onChange={setSourceFilter}
            history={history}
            workspace={ws}
          />
        </div>
      </div>
    </div>
  );
}

/* ===== 方案 B：iOS 分段控件 ===== */
function SegmentedTabs({ filterType, setFilterType, counts }: {
  filterType: FilterType; setFilterType: (f: FilterType) => void; counts: Record<string, number>;
}) {
  return (
    <div className="segmented">
      {TABS.map((tab) => {
        const active = filterType === tab.key;
        const count = counts[tab.key];
        return (
          <button key={tab.key} onClick={() => setFilterType(tab.key)}
            className={`seg-item${active ? " active" : ""}`}
            style={{ position: "relative" }}>
            {active && (
              <motion.div
                layoutId="seg-active"
                className="seg-active-indicator"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="seg-icon">{tab.icon}</span>
            <span>{tab.label}</span>
            {count > 0 && <span className={`seg-count${active ? " active" : ""}`}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ===== 方案 C：圆形图标 Tab ===== */
function CircleTabs({ filterType, setFilterType, counts }: {
  filterType: FilterType; setFilterType: (f: FilterType) => void; counts: Record<string, number>;
}) {
  return (
    <div className="tabs-circle">
      {TABS.map((tab) => {
        const active = filterType === tab.key;
        const count = counts[tab.key];
        return (
          <button key={tab.key} onClick={() => setFilterType(tab.key)}
            className={`circle-tab${active ? " active" : ""}`}>
            <div className="circle-icon">
              <span style={{ fontSize: 22 }}>{tab.icon}</span>
            </div>
            <span className="circle-label">{tab.label}</span>
            {count > 0 && <span className="circle-badge">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function IconBtn({ icon, tip, danger, onClick, ariaLabel }: {
  icon: React.ReactNode; tip: string; danger?: boolean; onClick?: () => void; ariaLabel?: string;
}) {
  return (
    <button title={tip} aria-label={ariaLabel || tip} onClick={onClick}
      className={`icon-btn${danger ? " danger" : ""}`}>
      {icon}
    </button>
  );
}

/* ===== 筛选下拉组件 ===== */
function FilterDropdown<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { key: T; label: string }[]; onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLabel = options.find((o) => o.key === value)?.label || label;

  return (
    <div className="filter-dropdown" ref={ref}>
      <button className="filter-dropdown-btn" onClick={() => setOpen(!open)}>
        <span>{activeLabel}</span>
        <ChevronDown size={12} style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      {open && (
        <div className="filter-dropdown-menu">
          {options.map((opt) => (
            <button key={opt.key}
              className={`filter-dropdown-item${opt.key === value ? " active" : ""}`}
              onClick={() => { onChange(opt.key); setOpen(false); }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== 来源筛选下拉 ===== */
function SourceFilterDropdown({ value, onChange, history, workspace }: {
  value: SourceFilter; onChange: (v: SourceFilter) => void; history: HistoryItem[]; workspace: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 收集当前工作空间下的所有来源应用
  const sources = useMemo(() => {
    const set = new Set<string>();
    history.filter((h) => h.workspace === workspace && h.source).forEach((h) => set.add(h.source));
    return Array.from(set).sort();
  }, [history, workspace]);

  return (
    <div className="filter-dropdown" ref={ref}>
      <button className="filter-dropdown-btn" onClick={() => setOpen(!open)}>
        <span>{value || "来源应用"}</span>
        <ChevronDown size={12} style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      {open && (
        <div className="filter-dropdown-menu">
          <button className={`filter-dropdown-item${!value ? " active" : ""}`}
            onClick={() => { onChange(""); setOpen(false); }}>
            全部来源
          </button>
          {sources.map((src) => (
            <button key={src}
              className={`filter-dropdown-item${src === value ? " active" : ""}`}
              onClick={() => { onChange(src); setOpen(false); }}>
              {src}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
