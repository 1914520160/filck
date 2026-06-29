import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderOpen, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/components/Toast";
import { relativeTime } from "@/lib/utils";
import { HistoryItem } from "@/stores/appStore";

export function FileDetailDialog({ item, onClose }: { item: HistoryItem; onClose: () => void }) {
  const { toast } = useToast();
  const [fileInfo, setFileInfo] = useState<{ size: number; exists: boolean } | null>(null);

  useEffect(() => {
    async function getInfo() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const info = await invoke<{ size: number; exists: boolean }>("get_file_info", { path: item.content });
        setFileInfo(info);
      } catch {
        setFileInfo({ size: 0, exists: false });
      }
    }
    if (item?.content) getInfo();
  }, [item]);

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      toast("路径已复制", "success");
    } catch { toast("复制失败", "error"); }
  };

  const handleOpenFile = async () => {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(item.content);
    } catch { toast("无法打开文件", "error"); }
  };

  const handleOpenFolder = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_file_location", { path: item.content });
    } catch { toast("无法打开文件夹", "error"); }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "未知";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const fileName = item.content?.split(/[\\/]/).pop() || "文件";
  const filePath = item.content || "";
  const time = relativeTime(item.time);

  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="dialog-backdrop" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="dialog-box w480"
          onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="dialog-header">
            <h2 className="dialog-title">📄 文件详情</h2>
            <button onClick={onClose} className="dialog-close"><X size={16} /></button>
          </div>

          {/* Body */}
          <div className="dialog-body" style={{ gap: 16 }}>
            {/* 文件图标 + 名称 */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "linear-gradient(135deg, #06B6D4, #0078D4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fileName}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {fileInfo ? (fileInfo.exists ? "文件存在" : "⚠ 文件不存在") : "检查中…"}
                </div>
              </div>
            </div>

            {/* 信息列表 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <InfoRow label="完整路径" value={filePath} mono />
              <InfoRow label="文件大小" value={fileInfo ? formatSize(fileInfo.size) : "…"} />
              <InfoRow label="复制时间" value={item.time || "未知"} />
              <InfoRow label="来源" value={item.source || "未知"} />
            </div>

            {/* 操作按钮 */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <FileActionBtn icon={<ExternalLink size={14} />} label="打开文件" onClick={handleOpenFile} primary />
              <FileActionBtn icon={<FolderOpen size={14} />} label="打开文件夹" onClick={handleOpenFolder} />
              <FileActionBtn icon={<Copy size={14} />} label="复制路径" onClick={handleCopyPath} />
            </div>
          </div>

          {/* Footer */}
          <div className="dialog-footer">
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{time}</span>
            <button className="btn-primary" onClick={onClose}>关闭</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0, minWidth: 60 }}>{label}</span>
      <span style={{
        fontSize: 12, color: "var(--text-primary)", textAlign: "right", wordBreak: "break-all",
        fontFamily: mono ? "'SF Mono', Consolas, monospace" : "inherit",
        lineHeight: 1.5,
      }}>{value}</span>
    </div>
  );
}

function FileActionBtn({ icon, label, onClick, primary }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
      border: primary ? "none" : "1px solid var(--border-color)",
      background: primary ? "var(--accent)" : "var(--card-bg)",
      color: primary ? "#fff" : "var(--text-secondary)",
      fontSize: 12, fontWeight: 600, cursor: "pointer",
      fontFamily: "inherit", transition: "all 0.15s",
      boxShadow: primary ? "0 2px 8px rgba(0,120,212,0.25)" : "none",
    }}>
      {icon}{label}
    </button>
  );
}
