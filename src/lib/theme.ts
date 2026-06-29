/** 主题定义 — 6 套配色方案 */

export type ThemeKey = "ocean" | "midnight" | "forest" | "blossom" | "terminal" | "sunset";

export interface Theme {
  key: ThemeKey;
  displayName: string;
  /** 是否为暗色主题 */
  dark: boolean;
}

export const THEMES: Theme[] = [
  { key: "ocean",    displayName: "海洋", dark: false },
  { key: "midnight", displayName: "午夜", dark: true },
  { key: "forest",   displayName: "森林", dark: false },
  { key: "blossom",  displayName: "樱花", dark: false },
  { key: "terminal", displayName: "终端", dark: true },
  { key: "sunset",   displayName: "日落", dark: true },
];

export const DEFAULT_THEME: ThemeKey = "ocean";

/** 将主题应用到 document.documentElement */
export function applyTheme(themeKey: ThemeKey) {
  document.documentElement.setAttribute("data-theme", themeKey);
}

/** 获取当前主题 */
export function getCurrentTheme(): ThemeKey {
  return (document.documentElement.getAttribute("data-theme") as ThemeKey) || DEFAULT_THEME;
}
