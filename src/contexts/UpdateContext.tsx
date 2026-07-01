import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { logger } from "@/lib/logger";

// ─── 类型定义 ───────────────────────────────────────────

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error" | "installed";

export interface UpdateState {
  status: UpdateStatus;
  /** 更新信息（available / downloading / ready 时有值） */
  update: Update | null;
  /** 下载进度 0-100 */
  progress: number;
  /** 错误信息 */
  error: string | null;
  /** 手动触发检查更新 */
  checkForUpdate: () => Promise<void>;
  /** 下载并安装更新 */
  downloadAndInstall: () => Promise<void>;
  /** 立即重启应用 */
  restart: () => Promise<void>;
  /** 标记已安装（重启前显示提示） */
  markInstalled: () => void;
}

// ─── Context ────────────────────────────────────────────

const UpdateContext = createContext<UpdateState | null>(null);

export function useUpdate() {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error("useUpdate 必须在 UpdateProvider 内使用");
  return ctx;
}

// ─── 常量 ──────────────────────────────────────────────

/** 自动检查间隔：24 小时 */
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = "pastepanda_last_update_check";

// ─── Provider ───────────────────────────────────────────

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── 启动时自动检查 ──────────────────────────────────

  useEffect(() => {
    const doStartupCheck = async () => {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      const now = Date.now();

      // 如果上次检查在 24 小时内，跳过（可选：仍检查但标记为 background）
      if (lastCheck) {
        const elapsed = now - Number(lastCheck);
        if (elapsed < CHECK_INTERVAL_MS) {
          // 不到 24 小时，但仍然静默检查一次（有新版本也不弹窗，只设置状态）
          await silentCheck();
          return;
        }
      }

      await checkForUpdate();
    };

    doStartupCheck();

    // 定时检查（每 24 小时）
    timerRef.current = setInterval(() => {
      checkForUpdate();
    }, CHECK_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── 静默检查（不改变 UI 状态，仅内部记录）─────────

  const silentCheck = useCallback(async () => {
    try {
      const update = await check();
      if (update) {
        setStatus("available");
        setUpdate(update);
      }
    } catch {
      // 静默检查失败不处理
    }
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  }, []);

  // ─── 检查更新 ─────────────────────────────────────────

  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    setStatus("checking");
    setError(null);

    try {
      const update = await check();
      if (update) {
        setStatus("available");
        setUpdate(update);
      } else {
        setStatus("idle");
        setUpdate(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("[Update] 检查更新失败:", msg);
      setError(msg);
      setStatus("error");
    } finally {
      checkingRef.current = false;
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    }
  }, []);

  // ─── 下载并安装 ──────────────────────────────────────

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;

    setStatus("downloading");
    setProgress(0);
    setError(null);

    try {
      let contentLength = 0;
      let downloaded = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started": {
            contentLength = event.data.contentLength ?? 0;
            break;
          }
          case "Progress": {
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const pct = Math.round((downloaded / contentLength) * 100);
              setProgress(pct);
            }
            break;
          }
          case "Finished": {
            setProgress(100);
            break;
          }
        }
      });

      setStatus("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("[Update] 下载安装失败:", msg);
      setError(msg);
      setStatus("error");
    }
  }, [update]);

  // ─── 重启应用 ────────────────────────────────────────

  const restart = useCallback(async () => {
    try {
      await relaunch();
    } catch (e) {
      logger.error("[Update] 重启失败:", e);
    }
  }, []);

  // ─── 标记已安装 ──────────────────────────────────────

  const markInstalled = useCallback(() => {
    setStatus("installed");
  }, []);

  return (
    <UpdateContext.Provider
      value={{
        status,
        update,
        progress,
        error,
        checkForUpdate,
        downloadAndInstall,
        restart,
        markInstalled,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}
