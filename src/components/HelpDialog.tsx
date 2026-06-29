import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { getAppVersion } from "@/lib/api";

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

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = useAppStore((s) => s.config);
  const [appVersion, setAppVersion] = useState("?.?.?");

  useEffect(() => {
    if (open) {
      getAppVersion().then(setAppVersion);
    }
  }, [open]);

  // 从 config 读取动态快捷键，回退默认值
  const hotkeyShow = (config.hotkey as string) || "ctrl+shift+v";
  const hotkeySeq = (config.sequential_hotkey as string) || "ctrl+shift+b";
  const hotkeySelectAll = (config.select_all_hotkey as string) || "ctrl+a";

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
            className="dialog-box w480"
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="dialog-header">
              <h2 className="dialog-title">❓ 帮助与快捷键</h2>
              <button onClick={onClose} className="dialog-close"><X size={18} /></button>
            </div>

            {/* Body */}
            <div className="dialog-body" style={{ padding: 0, gap: 0 }}>

              {/* 基本操作 */}
              <div className="h-section-header">
                <span className="h-section-icon" style={{ background: "linear-gradient(135deg, #3B82F6, #0078D4)" }}>⌨</span>
                <span className="h-section-title">基本操作</span>
              </div>
              <div className="h-row"><span className="h-desc">唤出 / 隐藏窗口</span><KeyCaps value={hotkeyShow} /></div>
              <div className="h-row"><span className="h-desc">隐藏窗口</span><StaticKey>Esc</StaticKey></div>
              <div className="h-row"><span className="h-desc">上下导航记录</span><StaticKey>↑ / ↓</StaticKey></div>
              <div className="h-row"><span className="h-desc">粘贴选中记录</span><StaticKey>Enter</StaticKey></div>
              <div className="h-row"><span className="h-desc">删除选中记录</span><StaticKey>Delete</StaticKey></div>

              <div className="h-divider" />

              {/* 选择与操作 */}
              <div className="h-section-header">
                <span className="h-section-icon" style={{ background: "linear-gradient(135deg, #8B5CF6, #5856D6)" }}>🖱</span>
                <span className="h-section-title">选择与操作</span>
              </div>
              <div className="h-row"><span className="h-desc">全选</span><KeyCaps value={hotkeySelectAll} /></div>
              <div className="h-row"><span className="h-desc">置顶 / 取消置顶</span><KeyCaps value="ctrl+d" /></div>
              <div className="h-row"><span className="h-desc">撤销删除</span><KeyCaps value="ctrl+z" /></div>
              <div className="h-row"><span className="h-desc">多选</span><KeyCaps value="ctrl+click" /></div>
              <div className="h-row"><span className="h-desc">范围选择</span><KeyCaps value="shift+click" /></div>

              <div className="h-divider" />

              {/* 高级功能 */}
              <div className="h-section-header">
                <span className="h-section-icon" style={{ background: "linear-gradient(135deg, #F59E0B, #FF9500)" }}>🚀</span>
                <span className="h-section-title">高级功能</span>
              </div>
              <div className="h-row"><span className="h-desc">依次粘贴</span><KeyCaps value={hotkeySeq} /></div>
              <div className="h-row"><span className="h-desc">粘贴第 N 条</span><KeyCaps value="ctrl+alt+1~9" /></div>

              <div className="h-divider" />

              {/* 功能说明 */}
              <div className="h-section-header">
                <span className="h-section-icon" style={{ background: "linear-gradient(135deg, #10B981, #34C759)" }}>📖</span>
                <span className="h-section-title">功能说明</span>
              </div>
              <div className="h-feature"><span className="h-feature-dot" /><span className="h-feature-text"><strong>片段库</strong> — 保存常用文本模板，一键粘贴</span></div>
              <div className="h-feature"><span className="h-feature-dot" /><span className="h-feature-text"><strong>内容提取</strong> — 提取链接、邮箱、电话等信息</span></div>
              <div className="h-feature"><span className="h-feature-dot" /><span className="h-feature-text"><strong>局域网同步</strong> — 跨设备同步剪贴板历史</span></div>

            </div>

            {/* Footer */}
            <div className="h-footer">
              <button onClick={onClose} className="h-close-btn">我知道了</button>
              <span className="h-ver">剪贴板管理 v{appVersion}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
