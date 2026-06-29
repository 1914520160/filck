/**
 * 统一日志工具 — 替代裸 console 调用
 *
 * 使用方式：
 *   import { logger } from "@/lib/logger";
 *   logger.warn("加载失败", error);
 *   logger.error("初始化错误", error);
 *   logger.info("操作成功");
 *   logger.debug("调试信息");
 *
 * 生产环境下可通过设置 LOG_LEVEL 控制输出级别：
 *   - "silent": 不输出任何日志
 *   - "error": 仅输出 error
 *   - "warn":  输出 warn + error
 *   - "info":  输出 info + warn + error（默认）
 *   - "debug": 输出所有日志
 */

type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function getConfiguredLevel(): LogLevel {
  if (typeof window !== "undefined") {
    const stored = (window as unknown as Record<string, unknown>).__LOG_LEVEL__ as string | undefined;
    if (stored && stored in LEVEL_ORDER) return stored as LogLevel;
  }
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[getConfiguredLevel()];
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): void {
  const prefix = `[${level.toUpperCase()}]`;
  const timestamp = new Date().toISOString().slice(11, 23);

  switch (level) {
    case "error":
      console.error(`${timestamp} ${prefix} ${message}`, ...args);
      break;
    case "warn":
      console.warn(`${timestamp} ${prefix} ${message}`, ...args);
      break;
    case "info":
      console.info(`${timestamp} ${prefix} ${message}`, ...args);
      break;
    case "debug":
      console.debug(`${timestamp} ${prefix} ${message}`, ...args);
      break;
  }
}

export const logger = {
  error(message: string, ...args: unknown[]) {
    if (shouldLog("error")) formatMessage("error", message, ...args);
  },
  warn(message: string, ...args: unknown[]) {
    if (shouldLog("warn")) formatMessage("warn", message, ...args);
  },
  info(message: string, ...args: unknown[]) {
    if (shouldLog("info")) formatMessage("info", message, ...args);
  },
  debug(message: string, ...args: unknown[]) {
    if (shouldLog("debug")) formatMessage("debug", message, ...args);
  },

  /** 设置日志级别（运行时动态调整） */
  setLevel(level: LogLevel) {
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__LOG_LEVEL__ = level;
    }
  },

  /** 获取当前日志级别 */
  getLevel(): LogLevel {
    return getConfiguredLevel();
  },
};
