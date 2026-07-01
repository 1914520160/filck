import { memo } from "react";

export interface AppIconProps {
  /** 尺寸，默认 24 */
  size?: number;
  /** 额外的 className */
  className?: string;
}

/**
 * 统一的应用图标组件。
 * 图标来源：public/icon.png（与 src-tauri/icons/icon.png 保持一致）。
 * 所有 Logo 显示位置都通过此组件引用，换图标只需替换 public/icon.png。
 */
export const AppIcon = memo(function AppIcon({ size = 24, className }: AppIconProps) {
  return (
    <img
      src="/icon.png"
      alt="PastePanda"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0 }}
      draggable={false}
    />
  );
});

export default AppIcon;
