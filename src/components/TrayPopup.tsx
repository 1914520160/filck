import { useState, useEffect, useCallback, useRef } from "react";
import { applyTheme, getCurrentTheme, ThemeKey, DEFAULT_THEME } from "@/lib/theme";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { pasteText } from "@/lib/api";

// ===== 数据类型 =====
interface RecentItem {
  id: string;
  type: string; // "text" | "image" | "file"
  preview: string;
  text: string;
}

interface StatsData {
  total: number;
  pinned: number;
  today: number;
  db_size_kb: number;
  max_size_mb: number;
}

interface PopupInitData {
  version: string;
  monitoring: boolean;
  recents: RecentItem[];
  stats?: StatsData;
}

// ===== 菜单项定义 =====
interface MenuItemDef {
  id: string;
  label: string;
  hint?: string;
  danger?: boolean;
  iconClass: string;
  iconSvg: React.ReactNode;
  onClick: () => void;
}

// ===== SVG 图标组件 =====
const SvgIcon: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 13 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

// 剪贴板图标
const IconClipboard = () => (
  <SvgIcon size={18}>
    <rect x="8" y="2" width="8" height="4" rx="1.5"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="M9 13h6"/>
  </SvgIcon>
);

// 日历图标（今日）
const IconCalendar = () => (
  <SvgIcon size={15}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </SvgIcon>
);

// 列表图标（总计）
const IconList = () => (
  <SvgIcon size={15}>
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </SvgIcon>
);

// 图钉图标（置顶）
const IconPin = () => (
  <SvgIcon size={15}>
    <line x1="12" y1="17" x2="12" y2="22"/>
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
  </SvgIcon>
);

// 时钟图标（最近复制标签）
const IconClock = () => (
  <SvgIcon size={11}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </SvgIcon>
);

// 侧边栏图标（显示主窗口）
const IconSidebar = () => (
  <SvgIcon size={13}>
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M9 3v18"/>
  </SvgIcon>
);

// 暂停图标
const IconPause = () => (
  <SvgIcon size={13}>
    <rect x="6" y="4" width="4" height="16" rx="1"/>
    <rect x="14" y="4" width="4" height="16" rx="1"/>
  </SvgIcon>
);

// 设置齿轮图标
const IconSettings = () => (
  <SvgIcon size={13}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </SvgIcon>
);

// 退出图标
const IconExit = () => (
  <SvgIcon size={13}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </SvgIcon>
);

// 活动曲线图标（底部状态栏）
const IconActivity = () => (
  <SvgIcon size={11}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </SvgIcon>
);

export function TrayPopup() {
  const [version, setVersion] = useState("");
  const [monitoring, setMonitoring] = useState(true);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [activeIdx, setActiveIdx] = useState(0); // 默认高亮第一项
  const [themeKey, setThemeKey] = useState<ThemeKey>(DEFAULT_THEME);
  const menuRef = useRef<HTMLDivElement>(null);

  // 监听初始化数据
  useEffect(() => {
    let unlisten1: UnlistenFn | null = null;
    let unlisten2: UnlistenFn | null = null;

    async function setup() {
      // 接收数据（Rust 端在窗口创建后直接发送）
      unlisten1 = await listen<PopupInitData>("tray-popup-init", (event) => {
        setVersion(event.payload.version);
        setMonitoring(event.payload.monitoring);
        setRecents(event.payload.recents);
        if (event.payload.stats) {
          setStats(event.payload.stats);
        }
      });
      // 监听状态变化
      unlisten2 = await listen<boolean>("monitor-status-changed", (event) => {
        setMonitoring(event.payload);
      });
    }
    setup();
    return () => {
      if (unlisten1) unlisten1();
      if (unlisten2) unlisten2();
    };
  }, []);

  // 全局鼠标按下监听 — 点击弹窗外任意位置时关闭（模拟原生右键菜单）
  // 用 mousedown 而非 click，因为 click 在失焦后可能不会被触发
  // 使用 ref 防重入：避免前端 mousedown invoke 与 Rust 失焦 hide 同时触发
  const hidingRef = useRef(false);
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (hidingRef.current) return; // 已在隐藏流程中
      // 如果点击的目标在弹窗内部，不处理
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      hidingRef.current = true;
      // 点击弹窗外部 → 关闭弹窗，通过 Rust 命令安全关闭
      invoke("hide_tray_popup").catch(() => {}).finally(() => {
        hidingRef.current = false;
      });
    };

    // 在捕获阶段监听，确保在 Tauri 窗口失焦之前捕获到事件
    window.addEventListener("mousedown", handleMouseDown, true);
    return () => window.removeEventListener("mousedown", handleMouseDown, true);
  }, []);

  // 读取并同步主题
  useEffect(() => {
    setThemeKey(getCurrentTheme());
    // 监听主窗口主题变化（通过 storage 事件或轮询 DOM）
    const observer = new MutationObserver(() => {
      const current = getCurrentTheme();
      setThemeKey((prev) => {
        if (current !== prev) {
          applyTheme(current);
          return current;
        }
        return prev;
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []); // 移除 themeKey 依赖，避免死循环

  // 操作函数
  const doShow = useCallback(async () => {
    try {
      await invoke("save_foreground");
      await invoke("toggle_window");
    } catch (e) { /* ignore */ }
    // 延迟隐藏弹窗，确保主窗口已获得焦点
    setTimeout(() => {
      getCurrentWindow().hide();
    }, 100);
  }, []);

  const doToggleMonitor = useCallback(async () => {
    try {
      await invoke("toggle_monitor");
    } catch (e) { /* ignore */ }
    // 模拟原生菜单：点击后立即关闭弹窗
    getCurrentWindow().hide();
  }, []);

  const doSettings = useCallback(async () => {
    try {
      await invoke("toggle_window");
    } catch (e) { /* ignore */ }
    // 先隐藏弹窗
    getCurrentWindow().hide();
    // 延迟发射事件，确保主窗口已显示
    setTimeout(async () => {
      try {
        const { emit } = await import("@tauri-apps/api/event");
        await emit("tray-open-settings", {});
      } catch (e) { /* ignore */ }
    }, 300);
  }, []);

  const doExit = useCallback(async () => {
    try {
      await invoke("exit_app");
    } catch (e) { /* ignore */ }
  }, []);

  const doPaste = useCallback(async (itemText: string) => {
    try {
      await invoke("save_foreground");
      await pasteText(itemText);
    } catch (e) { /* ignore */ }
    getCurrentWindow().hide();
  }, []);

  // 格式化数据库大小
  const formatDbSize = (kb: number): string => {
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // 计算内存占用百分比（使用配置的上限，默认100MB）
  const memPercent = stats ? Math.min((stats.db_size_kb / 1024 / stats.max_size_mb) * 100, 100) : 0;

  // 构建菜单项
  const menuItems: MenuItemDef[] = [
    {
      id: "show",
      iconClass: "icon-blue",
      iconSvg: <IconSidebar />,
      label: "显示主窗口",
      hint: "Ctrl+Shift+V",
      onClick: doShow,
    },
    {
      id: "toggle_monitor",
      iconClass: "icon-orange",
      iconSvg: <IconPause />,
      label: monitoring ? "暂停监听" : "恢复监听",
      onClick: doToggleMonitor,
    },
    {
      id: "settings",
      iconClass: "icon-purple",
      iconSvg: <IconSettings />,
      label: "设置…",
      hint: "Ctrl+S",
      onClick: doSettings,
    },
    {
      id: "exit",
      iconClass: "icon-red",
      iconSvg: <IconExit />,
      label: "退出",
      danger: true,
      onClick: doExit,
    },
  ];

  // 键盘导航
  const allItems = [...recents.map((r) => ({ id: r.id, type: "recent" as const })), ...menuItems.map((m) => ({ id: m.id, type: "action" as const }))];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < allItems.length) {
          const item = allItems[activeIdx];
          if (item.type === "recent") {
            const recent = recents.find((r) => r.id === item.id);
            if (recent) doPaste(recent.text);
          } else {
            const mi = menuItems.find((m) => m.id === item.id);
            mi?.onClick();
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        getCurrentWindow().hide();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIdx, allItems, recents, menuItems, doPaste]);

  return (
    <div
      ref={menuRef}
      className="tray-popup-root"
      data-theme={themeKey}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 头部信息 */}
      <div className="tray-popup-header">
        <div className="tray-popup-logo">
          <IconClipboard />
        </div>
        <div className="tray-popup-title">
          <span className="tray-popup-name">剪贴板管理</span>
          <span className="tray-popup-version">v{version}</span>
        </div>
        <span className={`tray-popup-status-dot ${monitoring ? "active" : ""}`} />
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="tray-popup-cards">
          <div className="tray-popup-card card-today">
            <div className="card-icon-slot">
              <IconCalendar />
            </div>
            <div className="card-value">{stats.today}</div>
            <div className="card-label">今日</div>
          </div>
          <div className="tray-popup-card card-total">
            <div className="card-icon-slot">
              <IconList />
            </div>
            <div className="card-value">{stats.total.toLocaleString()}</div>
            <div className="card-label">总计</div>
          </div>
          <div className="tray-popup-card card-pinned">
            <div className="card-icon-slot">
              <IconPin />
            </div>
            <div className="card-value">{stats.pinned}</div>
            <div className="card-label">置顶</div>
          </div>
        </div>
      )}

      <div className="tray-popup-divider" />

      {/* 最近记录区 */}
      {recents.length > 0 && (
        <>
          <div className="tray-popup-section-label">
            <span className="section-label-icon">
              <IconClock />
            </span>
            最近复制
          </div>
          <div className="tray-popup-recents">
            {recents.map((item, idx) => {
              const isActive = activeIdx === idx;
              const typeIcon = item.type === "image" ? "🖼" : item.type === "file" ? "📁" : "📝";
              const typeColor = item.type === "image" ? "icon-purple" : item.type === "file" ? "icon-orange" : "icon-blue";
              return (
                  <button
                    key={item.id}
                    className={`tray-popup-item${isActive ? " active" : ""}`}
                    onClick={() => doPaste(item.text)}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                  <span className={`tray-popup-item-icon ${typeColor}`}>{typeIcon}</span>
                  <span className="tray-popup-item-text">{item.preview}</span>
                  <span className="tray-popup-item-hint">粘贴</span>
                </button>
              );
            })}
          </div>
          <div className="tray-popup-divider" />
        </>
      )}

      {/* 操作区 */}
      <div className="tray-popup-actions">
        {menuItems.map((item) => {
          const idx = recents.length + menuItems.findIndex((m) => m.id === item.id);
          const isActive = activeIdx === idx;
          return (
            <button
              key={item.id}
              className={`tray-popup-item${isActive ? " active" : ""}${item.danger ? " danger" : ""}`}
              onClick={item.onClick}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              <span className={`tray-popup-item-icon ${item.iconClass}`}>{item.iconSvg}</span>
              <span className="tray-popup-item-text">{item.label}</span>
              {item.hint && <span className="tray-popup-item-hint">{item.hint}</span>}
            </button>
          );
        })}
      </div>

      {/* 底部状态栏 */}
      {stats && (
        <div className="tray-popup-footer">
          <span className="footer-icon">
            <IconActivity />
          </span>
          <span className="footer-info">{formatDbSize(stats.db_size_kb)} / {stats.max_size_mb.toFixed(0)} MB</span>
          <div className="footer-bar-wrap">
            <div className="footer-bar">
              <div className="footer-bar-fill" style={{ width: `${memPercent}%` }} />
            </div>
          </div>
          <span className="footer-text">{memPercent.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

export default TrayPopup;
