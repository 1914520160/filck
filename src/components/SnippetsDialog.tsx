import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Copy, Edit3, ClipboardList } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/lib/logger";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Snippet {
  id: string;
  name: string;
  content: string;
}

export function SnippetsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Snippet | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Snippet | null>(null);

  // 从后端加载片段
  const loadSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const items = await invoke<Snippet[]>("get_snippets");
      setSnippets(items);
    } catch (e) {
      logger.warn("加载片段失败", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开时从后端加载，同时也迁移 localStorage 旧数据
  useEffect(() => {
    if (!open) return;
    (async () => {
      // 迁移 localStorage 旧数据到后端
      try {
        const legacy = localStorage.getItem("snippets");
        if (legacy) {
          const oldSnippets: Snippet[] = JSON.parse(legacy);
          for (const s of oldSnippets) {
            await invoke("add_snippet", { name: s.name, content: s.content }).catch(() => {});
          }
          localStorage.removeItem("snippets");
        }
      } catch { logger.warn("迁移旧片段数据失败"); }
      await loadSnippets();
    })();
  }, [open, loadSnippets]);

  const filtered = snippets.filter((s) => {
    const kw = search.toLowerCase();
    return s.name.toLowerCase().includes(kw) ||
      s.content.toLowerCase().includes(kw);
  });

  const handleAdd = () => {
    setEditing({ id: "", name: "", content: "" });
  };

  const handleSaveEdit = async () => {
    if (!editing || !editing.name.trim()) return;
    try {
      if (editing.id) {
        // 更新已有片段
        await invoke("update_snippet", { id: editing.id, name: editing.name, content: editing.content });
      } else {
        // 新增片段
        await invoke("add_snippet", { name: editing.name, content: editing.content });
      }
      await loadSnippets();
    } catch (e) {
      logger.warn("保存片段失败", e);
    }
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoke("delete_snippet", { id: deleteTarget.id });
      await loadSnippets();
    } catch (e) {
      logger.warn("删除片段失败", e);
    }
    setDeleteTarget(null);
  };

  const handleCopy = async (content: string) => {
    try { await navigator.clipboard.writeText(content); } catch { logger.warn("复制片段失败"); }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ClipboardList size={16} style={{ color: "var(--primary)" }} />
                  <h2 className="dialog-title">片段库</h2>
                  <span className="version-label">{snippets.length}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button onClick={handleAdd} className="dialog-close"
                    style={{ color: "var(--primary)", background: "var(--primary-light)" }}>
                    <Plus size={15} />
                  </button>
                  <button onClick={onClose} className="dialog-close"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div style={{ padding: "8px 16px" }}>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索片段..."
                  className="snippet-search" />
              </div>

              {/* List */}
              <div className="dialog-body" style={{ padding: "0 16px 16px" }}>
                {loading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                    <p className="snippet-item-sub">加载中...</p>
                  </div>
                ) : editing ? (
                  <div className="snippet-edit-form">
                    <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      placeholder="片段名称"
                      className="snippet-edit-input" />
                    <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                      placeholder="片段内容..."
                      rows={4}
                      className="snippet-edit-textarea" />
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button onClick={() => setEditing(null)}
                        className="extract-btn-sm ghost">取消</button>
                      <button onClick={handleSaveEdit}
                        className="extract-btn-sm primary">保存</button>
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: "8px" }}>
                    <ClipboardList size={20} style={{ color: "var(--text-ter)" }} />
                    <p className="snippet-item-sub">{search ? "没有匹配的片段" : "暂无片段，点击 + 添加"}</p>
                  </div>
                ) : (
                  filtered.map((s) => (
                    <div key={s.id} className="snippet-item"
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--card)")}>
                      <div className="snippet-item-content">
                        <p className="snippet-item-title">{s.name}</p>
                        <p className="snippet-item-sub">{s.content}</p>
                      </div>
                      <div className="snippet-actions">
                        <button onClick={() => handleCopy(s.content)} className="snippet-action-btn"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                          <Copy size={13} />
                        </button>
                        <button onClick={() => setEditing(s)} className="snippet-action-btn"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="snippet-action-btn danger"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--danger) 10%, transparent)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* 删除确认弹窗 */}
          <ConfirmDialog
            open={!!deleteTarget}
            title="确认删除片段"
            message={`确定删除片段"${deleteTarget?.name}"？此操作不可撤销。`}
            confirmText="删除"
            variant="danger"
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        </>
      )}
    </AnimatePresence>
  );
}
