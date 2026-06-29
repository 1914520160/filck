import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind 类名，自动去重和解决冲突 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 相对时间格式化 */
export function relativeTime(timeStr: string): string {
  if (!timeStr) return "";
  const now = new Date();
  const date = new Date(timeStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay === 1) return "昨天";
  if (diffDay < 7) return `${diffDay}天前`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日 周${weekday}`;
}

/** 截断文本 */
export function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  const cleaned = text.replace(/\r/g, " ").replace(/\n/g, " ");
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + "..." : cleaned;
}

/** 检测文本类型 */
export function detectTextType(text: string): string {
  if (!text) return "text";
  const t = text.trim();
  // URL
  if (/^https?:\/\//.test(t)) return "link";
  // 邮箱
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t)) return "email";
  // 文件路径
  if (/^[A-Z]:\\/i.test(t) || /^\/[\w]/.test(t) || /^[.~]\//.test(t)) return "file";
  // 命令行 (npm, git, cargo, pip, python, node, curl, docker, kubectl...)
  if (/^(npm |npx |yarn |pnpm |git |cargo |pip |python |node |curl |docker |kubectl |make |cmake |go |rustc |java |gcc |ssh |cd |ls |cat |echo |export |source )/i.test(t)) return "code";
  // 代码片段（英文关键词）
  if (/^(def |class |function |import |const |let |var |#include |print\(|console\.|SELECT |INSERT |UPDATE |DELETE |public |private |static |return |if \(|for \(|while \(|try |catch |<\/?[a-z])/i.test(t)) return "code";
  // 代码片段（中文关键词）
  if (/^(函数 |类 |接口 |枚举 |导入 |导出 |定义 |声明 |模块 |组件 |配置 |方法 )/i.test(t)) return "code";
  // 中文代码/配置关键词（包含型检测）
  if (/[（(]\s*(函数|类|接口|枚举|方法|模块|组件|配置|对象)\s*[）)]/.test(t) || /^(import |export |from |require\(|module\.)/i.test(t) || /^\s*[a-zA-Z_$][\w$]*\s*[=:]\s*(function|class|new|=>|{)/.test(t)) return "code";
  // JSON / XML / HTML 检测
  if (/^\s*[\[{<]/.test(t) && /[\]}>]\s*$/.test(t)) return "code";
  // 错误日志
  if (/^\[?\d{4}-\d{2}-\d{2}/.test(t) || /ERROR|WARN|FATAL|Exception|Traceback/i.test(t) || /错误|异常|警告|失败|超时/.test(t)) return "code";
  // 电话号码
  if (/^(\+?86)?1[3-9]\d{9}$/.test(t.replace(/[- ]/g, ""))) return "phone";
  // 短码/版本号 (如 v1.0, 0.1.0, abc123)
  if (/^[a-z]?\d+(\.\d+){1,3}$/i.test(t) || /^[a-z][a-z0-9_-]{2,12}$/i.test(t) && t.length < 15) return "code";
  // 数字
  if (/^\d+$/.test(t)) return "code";
  // 多行文本
  if (t.includes("\n") && t.split("\n").length > 3) return "text";
  return "text";
}

/** 类型图标配置 */
export const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  text: { icon: "☰", color: "#9E9E9E" },
  link: { icon: "⛓", color: "#07C160" },
  email: { icon: "@", color: "#007AFF" },
  code: { icon: "</>", color: "#5856D6" },
  phone: { icon: "☎", color: "#FF9500" },
  image: { icon: "⬚", color: "#FF9500" },
  file: { icon: "☷", color: "#FFCC00" },
};

// ==================== 代码高亮 ====================

/**
 * 高亮代码并返回 HTML 字符串
 * 使用 highlight.js core + 按需注册语言，避免 tree-shaking 丢失语言模块
 */
let hljsCore: typeof import("highlight.js/lib/core").default | null = null;
let languagesRegistered = false;

async function getHljs() {
  if (!hljsCore) {
    hljsCore = (await import("highlight.js/lib/core")).default;
  }
  if (!languagesRegistered) {
    // 按需注册所有支持的语言（显式 import 确保不被 tree-shake）
    const langModules = await Promise.all([
      import("highlight.js/lib/languages/python"),
      import("highlight.js/lib/languages/javascript"),
      import("highlight.js/lib/languages/typescript"),
      import("highlight.js/lib/languages/rust"),
      import("highlight.js/lib/languages/go"),
      import("highlight.js/lib/languages/java"),
      import("highlight.js/lib/languages/cpp"),
      import("highlight.js/lib/languages/c"),
      import("highlight.js/lib/languages/sql"),
      import("highlight.js/lib/languages/bash"),
      import("highlight.js/lib/languages/json"),
      import("highlight.js/lib/languages/xml"),
      import("highlight.js/lib/languages/yaml"),
      import("highlight.js/lib/languages/css"),
      import("highlight.js/lib/languages/markdown"),
    ]);
    const langNames = [
      "python", "javascript", "typescript", "rust", "go", "java",
      "cpp", "c", "sql", "bash", "json", "xml", "yaml", "css", "markdown",
    ];
    langNames.forEach((name, i) => hljsCore!.registerLanguage(name, langModules[i].default));
    languagesRegistered = true;
  }
  return hljsCore;
}

export interface HighlightResult {
  html: string;
  language: string;
  relevance: number;
}

/** 语言名称 → 显示标签映射 */
const LANG_LABELS: Record<string, string> = {
  python: "Python", javascript: "JavaScript", typescript: "TypeScript",
  rust: "Rust", go: "Go", java: "Java", cpp: "C++", c: "C",
  sql: "SQL", bash: "Bash", json: "JSON", xml: "XML/HTML",
  yaml: "YAML", css: "CSS", markdown: "Markdown",
};

/** 错误日志关键词 */
const ERROR_KEYWORDS = /\b(ERROR|FATAL|Exception|Traceback|panic|stack trace|WARN)\b/i;

/**
 * 高亮代码并返回结构化结果
 * 使用 highlight.js highlightAuto 自动检测语言，根据 relevance 判断置信度
 */
export async function highlightCode(text: string): Promise<HighlightResult> {
  try {
    const hljs = await getHljs();

    // 先用 highlightAuto 检测语言并高亮
    const result = hljs.highlightAuto(text, [
      "python", "javascript", "typescript", "rust", "go", "java",
      "cpp", "c", "sql", "bash", "json", "xml", "yaml", "css", "markdown",
    ]);

    const relevance = result.relevance || 0;
    const language = result.language || "plain";

    // relevance ≥ 3 认为检测可信，返回高亮结果
    if (relevance >= 3 && language !== "plain") {
      // 检查是否错误日志：如果错误关键词密集，降级为 errorlog
      const errorMatches = (text.match(ERROR_KEYWORDS) || []).length;
      if (errorMatches >= 2 && text.length < 500) {
        return { html: "", language: "errorlog", relevance: 0 };
      }
      return { html: result.value, language, relevance };
    }

    // 低置信度：返回空 HTML，让 UI 显示原始文本
    return { html: "", language: "plain", relevance: 0 };
  } catch {
    return { html: "", language: "plain", relevance: 0 };
  }
}

/** 根据语言名获取显示标签 */
export function getLangLabel(language: string): string {
  return LANG_LABELS[language] || (language === "errorlog" ? "错误日志" : "文本");
}

/**
 * 同步高亮（用于已知语言的情况，避免异步开销）
 * 仅在语言明确且非 plain 时使用
 */
export function highlightCodeSync(text: string, language: string): string {
  try {
    // 动态导入在同步上下文不可用，使用简单转义回退
    // highlight.js 的同步 API 需要预先注册语言，这里采用懒加载
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  } catch {
    return text;
  }
}
