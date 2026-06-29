import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, AtSign, Phone, Code2, Hash, Copy, CheckSquare, LucideIcon } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { logger } from "@/lib/logger";

type ExtractType = "url" | "email" | "phone" | "ip" | "code";

const EXTRACT_CONFIGS: { key: ExtractType; label: string; Icon: LucideIcon; regex: RegExp }[] = [
  { key: "url",   label: "链接",  Icon: Link2,  regex: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g },
  { key: "email", label: "邮箱",  Icon: AtSign, regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { key: "phone", label: "电话",  Icon: Phone,  regex: /(?:\+?86)?1[3-9]\d{9}/g },
  { key: "ip",    label: "IP",    Icon: Hash,   regex: /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g },
  { key: "code",  label: "代码块", Icon: Code2, regex: /```[\s\S]*?```/g },
];

export function ExtractDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const history = useAppStore((s) => s.history);
  const ws = useAppStore((s) => s.config.current_workspace);
  const [type, setType] = useState<ExtractType>("url");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const results = useMemo(() => {
    const cfg = EXTRACT_CONFIGS.find((c) => c.key === type)!;
    const allText = history
      .filter((h) => h.workspace === ws && h.type === "text")
      .map((h) => h.text)
      .join("\n");
    const matches = allText.match(cfg.regex) || [];
    // 去重
    return [...new Set(matches)].map((m) => m.trim()).filter(Boolean);
  }, [history, ws, type]);

  const toggleSelect = (item: string) => {
    const next = new Set(selected);
    if (next.has(item)) next.delete(item); else next.add(item);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results));
  };

  const copySelected = async () => {
    const text = [...selected].join("\n");
    try { await navigator.clipboard.writeText(text); } catch { logger.warn("复制选中内容失败"); }
  };

  const copyAll = async () => {
    try { await navigator.clipboard.writeText(results.join("\n")); } catch { logger.warn("复制全部内容失败"); }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="dialog-backdrop"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="dialog-box w480"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="dialog-header">
              <h2 className="dialog-title">内容提取</h2>
              <button onClick={onClose} className="dialog-close"
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <X size={16} />
              </button>
            </div>

            {/* Type selector */}
            <div className="extract-types">
              {EXTRACT_CONFIGS.map((cfg) => {
                const active = type === cfg.key;
                const Icon = cfg.Icon;
                return (
                  <button key={cfg.key} onClick={() => { setType(cfg.key); setSelected(new Set()); }}
                    className={`extract-type-btn${active ? " active" : ""}`}
                    style={{
                      color: active ? "var(--primary)" : "var(--text-sec)",
                      background: active ? "var(--primary-light)" : "transparent",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--hover)"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                    <Icon size={13} /> {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Results count + actions */}
            <div className="extract-actions">
              <span className="snippet-item-sub">找到 <b className="snippet-item-title" style={{ fontWeight: 600 }}>{results.length}</b> 个结果</span>
              <div className="extract-btn-group">
                <button onClick={selectAll}
                  className="extract-btn-sm primary-light">
                  {selected.size === results.length ? "取消全选" : "全选"}
                </button>
                {selected.size > 0 && (
                  <button onClick={copySelected}
                    className="extract-btn-sm primary">
                    <Copy size={10} /> 复制 {selected.size} 项
                  </button>
                )}
                <button onClick={copyAll}
                  className="extract-btn-sm ghost">
                  复制全部
                </button>
              </div>
            </div>

            {/* Results list */}
            <div className="dialog-body" style={{ padding: "0 16px 16px", gap: "4px" }}>
              {results.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: "8px" }}>
                  <p className="snippet-item-sub">未找到匹配的内容</p>
                </div>
              ) : (
                results.map((item, i) => {
                  const isSel = selected.has(item);
                  return (
                    <div key={i} onClick={() => toggleSelect(item)}
                      className={`extract-result${isSel ? " selected" : ""}`}
                      style={{
                        background: isSel ? "var(--primary-light)" : "var(--card)",
                        border: `1px solid ${isSel ? "var(--primary)" : "var(--border)"}`,
                      }}
                      onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--hover)"; }}
                      onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "var(--card)"; }}>
                      <div className={`extract-checkbox${isSel ? " checked" : ""}`}
                        style={{
                          background: isSel ? "var(--primary)" : "transparent",
                          border: `1.5px solid ${isSel ? "var(--primary)" : "var(--border)"}`,
                        }}>
                        {isSel && <CheckSquare size={10} color="#fff" />}
                      </div>
                      <span className="extract-result-text">{item}</span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
