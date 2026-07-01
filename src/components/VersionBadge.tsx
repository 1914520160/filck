import { type FC } from "react";

/**
 * 统一版本徽章组件
 *
 * 方案 1「渐变微光」：蓝紫渐变 + 投影阴影
 * 所有位置统一使用此组件显示版本号
 *
 * Props:
 * - version: 版本号字符串（不含 v 前缀），如 "5.0.73"
 * - compact: 紧凑模式，用于内联文本场景（如设置页脚）
 * - className: 额外样式
 */

export interface VersionBadgeProps {
  version: string;
  compact?: boolean;
  className?: string;
}

export const VersionBadge: FC<VersionBadgeProps> = ({
  version,
  compact = false,
  className = "",
}) => {
  return (
    <span
      className={`version-badge${compact ? " version-badge--compact" : ""}${className ? ` ${className}` : ""}`}
    >
      v{version}
    </span>
  );
};

export default VersionBadge;
