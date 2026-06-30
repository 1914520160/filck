import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { getAppVersion } from "@/lib/api";
import { UpdateBanner } from "@/components/UpdateBadge";
import { useState, useEffect } from "react";

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    if (open) {
      getAppVersion().then(setAppVersion).catch(() => setAppVersion(""));
    }
  }, [open]);

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
            className="dialog-box w480" onClick={(e) => e.stopPropagation()}>


            <div className="dialog-header">
              <h2 className="dialog-title">ℹ️ 关于</h2>
              <button onClick={onClose} className="dialog-close"><X size={16} /></button>
            </div>

            <div className="dialog-body" style={{ alignItems: "center", textAlign: "center", padding: "32px 20px" }}>
              {/* 图标 */}
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg, #0078D4, #005A9E)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 32, color: "#fff",
              }}>📋</div>

              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Filck
              </div>
              <span style={{
                fontSize: 13, color: "var(--text-secondary)",
                background: "var(--section-bg)", borderRadius: 6, padding: "2px 10px",
              }}>v{appVersion}</span>

              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 16 }}>
                Tauri 2 · React 19 · Rust
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                © 2026 Filck
              </div>

              {/* 技术栈 */}
              <div style={{
                display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "center",
              }}>
                {[
                  { label: "Tauri 2", color: "#FFC131" },
                  { label: "React 19", color: "#61DAFB" },
                  { label: "TypeScript", color: "#3178C6" },
                  { label: "SQLite", color: "#003B57" },
                  { label: "Rust", color: "#DEA584" },
                  { label: "Vite", color: "#646CFF" },
                ].map((t) => (
                  <span key={t.label} style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 10px",
                    borderRadius: 8, border: `1px solid ${t.color}20`,
                    background: `${t.color}10`, color: "var(--text-primary)",
                  }}>{t.label}</span>
                ))}
              </div>

              {/* 更新横幅 */}
              <div style={{ marginTop: 24, width: "100%" }}>
                <UpdateBanner />
              </div>

              {/* 项目主页链接 */}
              <a
                href="https://github.com/1914520160/filck"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: 16, padding: "8px 18px", borderRadius: 10,
                  border: "1px solid var(--border-color)",
                  background: "var(--card-bg)", color: "var(--text-secondary)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontFamily: "inherit", textDecoration: "none",
                }}>
                项目主页 <ExternalLink size={12} />
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
