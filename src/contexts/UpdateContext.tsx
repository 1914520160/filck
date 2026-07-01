import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
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

      if (lastCheck) {
        const elapsed = now - Number(lastCheck);
        if (elapsed < CHECK_INTERVAL_MS) {
          await silentCheck();
          return;
        }
      }

      await checkForUpdate();
    };

    doStartupCheck();

    timerRef.current = setInterval(() => {
      checkForUpdate();
    }, CHECK_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── 静默检查（不改变 UI 状态，仅内部记录）─────────

  const silentCheck = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const update = await check();
      if (update) {
        setStatus("available");
        setUpdate(update);
      }
    } catch {
      // 静默检查失败不处理
    } finally {
      checkingRef.current = false;
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    }
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

  // ─── 下载并安装（后台线程，不阻塞 UI）────────────

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;

    // 启动后台下载（Rust 侧 spawn 线程，通过 event 推送状态）
    invoke("start_update").catch((e) => {
      logger.error("[Update] start_update invoke 失败:", e);
      setError(String(e));
      setStatus("error");
    });
  }, [update]);

  // ─── 监听后台更新事件 ──────────────────────────────

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setupListeners = async () => {
      unlisteners.push(
        await listen("update:checking", () => {
          setStatus("checking");
          setError(null);
        }),
      );

      unlisteners.push(
        await listen<{ version: string; body: string | null }>("update:available", (e) => {
          setStatus("available");
          setUpdate({
            version: e.payload.version,
            body: e.payload.body,
          } as Update);
        }),
      );

      unlisteners.push(
        await listen("update:downloading", () => {
          setStatus("downloading");
          setProgress(0);
        }),
      );

      unlisteners.push(
        await listen<{ downloaded: number; total: number | null }>("update:progress", (e) => {
          const { downloaded, total } = e.payload;
          if (total) {
            const pct = Math.round((downloaded / total) * 100);
            setProgress(pct);
          }
        }),
      );

      unlisteners.push(
        await listen("update:ready", () => {
          setProgress(100);
          setStatus("ready");
        }),
      );

      unlisteners.push(
        await listen<{ message: string }>("update:error", (e) => {
          logger.error("[Update] 更新失败:", e.payload.message);
          setError(e.payload.message);
          setStatus("error");
        }),
      );

      unlisteners.push(
        await listen("update:uptodate", () => {
          setStatus("idle");
          setUpdate(null);
        }),
      );
    };

    setupListeners();

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, []);

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
