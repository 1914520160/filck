import { memo, useState, useCallback, useContext, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppStore, HistoryItem } from "@/stores/appStore";
import { relativeTime, detectTextType } from "@/lib/utils";
import { createCardMenuItems, CtxMenuCtx, type MenuItem } from "@/components/ContextMenu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";
import { pasteText } from "@/lib/api";
import { Pin, ImageIcon, Link2, AtSign, Code2, Phone, FileText, Terminal, Type } from "lucide-react";

const PALETTE = ["#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#6366F1"];

export type ImgState = { status: "loading" | "loaded" | "error"; url?: string };

function hashColor(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

const ICONS: Record<string, { Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>; color: string }> = {
  text:  { Icon: Type,      color: "#6B7280" },
  link:  { Icon: Link2,     color: "#10B981" },
  email: { Icon: AtSign,    color: "#3B82F6" },
  code:  { Icon: Terminal,  color: "#8B5CF6" },
  phone: { Icon: Phone,     color: "#F59E0B" },
  image: { Icon: ImageIcon, color: "#EC4899" },
  file:  { Icon: FileText,  color: "#06B6D4" },
};

function cleanSource(source: string): string {
  if (!source) return "";
  if (/^[A-Z]:\\/i.test(source) || /^\//.test(source)) return "";
  const cleaned = source.split(/\s*[-–—]\s*/)[0].trim();
  if (cleaned.length > 20) return cleaned.slice(0, 18) + "…";
  return cleaned;
}

/** 搜索关键词高亮组件 */
export const HighlightText = memo(function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight || !highlight.trim()) return <>{text}</>;
  // 限制搜索词长度，防止过长正则导致性能问题
  const safeHighlight = highlight.trim().slice(0, 100);
  if (!safeHighlight) return <>{text}</>;
  const escaped = safeHighlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 不使用全局标志，避免 lastIndex 副作用；用 split 天然支持多段高亮
  const regex = new RegExp(`(${escaped})`, "i");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : <span key={i}>{part}</span>
      )}
    </>
  );
});

/** 卡片组件（纯展示） */
export const Card = memo(function Card({ item, selected, onClick, onDoubleClick, index, imageState, searchKeyword, onRetryImage, pasting, menuItems }: {
  item: HistoryItem; selected: boolean; onClick: (e: React.MouseEvent) => void; onDoubleClick: () => void; index: number; imageState?: ImgState; searchKeyword?: string; onRetryImage?: () => void; pasting?: boolean; menuItems?: MenuItem[];
}) {
  const [hovered, setHovered] = useState(false);
  const clickTimerRef = useRef<number | null>(null);
  const subType = item.type === "text" ? detectTextType(item.text) : item.type;
  const cfg = ICONS[subType] || ICONS.text;
  const Icon = cfg.Icon;
  const iconColor = subType === "text" ? hashColor(item.text || "") : cfg.color;
  const time = relativeTime(item.time);
  const title = item.type === "file" ? (item.content || "文件") : (item.text || "").replace(/\r?\n/g, " ").trim() || "(空)";
  const source = cleanSource(item.source);

  const typeClass = item.type === "image" ? "card-image"
    : item.type === "file" ? "card-file"
    : item.pinned ? "card-pinned"
    : subType === "code" ? "card-code"
    : "card-text";

  const iconBg = item.type === "image" ? "bg-pink"
    : item.type === "file" ? "bg-green"
    : subType === "code" ? "bg-purple"
    : "bg-blue";

  // ★ 通过 Context 获取 ContextMenu 的 trigger 函数，用原生 DOM 事件调用，
  //   完全不依赖 DOM 事件冒泡、dispatchEvent、React 合成事件。
  const ctxTrigger = useContext(CtxMenuCtx);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !ctxTrigger) return;
    const onCtxMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      ctxTrigger(e.clientX, e.clientY, menuItems || []);
    };
    el.addEventListener("contextmenu", onCtxMenu);
    return () => {
      el.removeEventListener("contextmenu", onCtxMenu);
    };
  }, [ctxTrigger, menuItems]);

  // 清理定时器，防止组件卸载后回调执行
  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };
  }, []);

  // 延迟区分单击/双击：200ms 内再次点击视为双击
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 只处理左键，右键留给 onContextMenu
    if (e.button !== 0) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onDoubleClick();
    } else {
      clickTimerRef.current = window.setTimeout(() => {
        onClick(e);
        clickTimerRef.current = null;
      }, 200);
    }
  }, [onClick, onDoubleClick]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 28, delay: Math.min(index * 0.003, 0.04) }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative" }}
      className={`card ${typeClass}${selected ? " selected" : ""}`}
      role="option"
      aria-selected={selected}
      aria-label={title.length > 80 ? title.slice(0, 80) + "…" : title}
      aria-posinset={index + 1}
      tabIndex={-1}>

      {/* 图标 */}
      {item.type === "image" ? (
        imageState?.status === "loaded" && imageState.url ? (
          <div className="card-icon card-img-thumb">
            <img src={imageState.url} alt="" />
          </div>
        ) : imageState?.status === "error" ? (
          <div className="card-icon card-img-error">
            <ImageIcon size={18} color="#EF4444" strokeWidth={2.2} />
            {onRetryImage && (
              <span className="card-img-retry" onClick={(e) => { e.stopPropagation(); onRetryImage(); }}>🔄</span>
            )}
          </div>
        ) : (
          <div className={`card-icon ${iconBg} card-img-loading`}>
            <div className="card-img-shimmer" />
          </div>
        )
      ) : (
        <div className={`card-icon ${iconBg}`}>
          <Icon size={18} color={iconColor} strokeWidth={2.2} />
        </div>
      )}

      {/* 内容 */}
      <div className="card-content">
        <p className="card-title">
          <HighlightText text={title} highlight={item.type === "text" ? (searchKeyword ?? "") : ""} />
        </p>
        <div className="card-sub">
          {item.pinned && (
            <span className="card-pin">
              <Pin size={7} /> 置顶
            </span>
          )}
          {source && <span className="card-source">{source}</span>}
        </div>
      </div>

      {/* 时间 / 复制中指示器 */}
      <span className="card-time">
        {pasting ? <span className="card-pasting">已复制 ✓</span> : time}
      </span>

      {/* 悬停预览 — 最多5行，用CSS截断，保留完整文本用于复制 */}
      {hovered && item.type === "text" && item.text && item.text.length > 80 && (
        <div className="card-preview-popover">
          <div className="card-preview-text">{item.text}</div>
        </div>
      )}
    </motion.div>
  );
});

/** 卡片上下文包装器（右键菜单 + 操作逻辑） */
export const CardWithContext = memo(function CardWithContext({ item, selected, onClick, onDoubleClick, index, imageState, searchKeyword, onRetryImage, pasting, onEdit }: {
  item: HistoryItem; selected: boolean; onClick: (e: React.MouseEvent) => void; onDoubleClick: () => void; index: number; imageState?: ImgState; searchKeyword?: string; onRetryImage?: () => void; pasting?: boolean; onEdit?: (item: HistoryItem) => void;
}) {
  const { toast } = useToast();
  const togglePin = useAppStore((s) => s.togglePin);
  const removeItems = useAppStore((s) => s.removeItems);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasUrl = /^https?:\/\//i.test(item.text || "");

  const handleAddSnippet = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("add_snippet", { name: item.text.slice(0, 30), content: item.text });
      toast("已添加到片段库", "success");
    } catch (e) { logger.warn("添加片段失败", e); }
  }, [item.text, toast]);

  const handleOpenUrl = useCallback(async () => {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(item.text);
    } catch (e) { logger.warn("打开URL失败", e); }
  }, [item.text]);

  const handlePasteTransform = useCallback(async (transform: string) => {
    let text = item.text || "";
    switch (transform) {
      case "upper": text = text.toUpperCase(); break;
      case "lower": text = text.toLowerCase(); break;
      case "strip": text = text.replace(/^\s+|\s+$/g, ""); break;
      case "strip_lines": text = text.split("\n").filter((l: string) => l.trim()).join("\n"); break;
      case "quote": text = `"${text}"`; break;
      case "md_link": text = `[${text.slice(0, 30)}](${text})`; break;
    }
    try { await pasteText(text); toast("已粘贴", "success"); } catch { toast("粘贴失败", "error"); }
  }, [item.text, toast]);

  const menuItems = createCardMenuItems({
    onEdit: item.type === "text" && onEdit ? () => onEdit(item) : undefined,
    onCopy: async () => {
      try { await navigator.clipboard.writeText(item.text); toast("已复制到剪贴板", "success"); } catch { toast("复制失败", "error"); }
    },
    onPaste: async () => {
      try { await pasteText(item.text); toast("已粘贴", "success"); } catch { toast("粘贴失败", "error"); }
    },
    onPasteTransform: handlePasteTransform,
    onPin: () => { togglePin(item.id); toast(item.pinned ? "已取消置顶" : "已置顶", "success"); },
    onDelete: () => setShowDeleteConfirm(true),
    onAddSnippet: handleAddSnippet,
    onOpenUrl: hasUrl ? handleOpenUrl : undefined,
    hasUrl,
    pinned: item.pinned,
  });

  return (
    <>
      <Card item={item} selected={selected} onClick={onClick} onDoubleClick={onDoubleClick} index={index} imageState={imageState} searchKeyword={searchKeyword} onRetryImage={onRetryImage} pasting={pasting} menuItems={menuItems} />
      <ConfirmDialog
        open={showDeleteConfirm}
        title="确认删除"
        message={`确定要删除这条记录吗？可通过 Ctrl+Z 撤销。\n\n"${item.text?.slice(0, 80)}"`}
        confirmText="删除"
        variant="danger"
        onConfirm={() => { removeItems([item.id]); toast("已删除", "success"); setShowDeleteConfirm(false); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
});
