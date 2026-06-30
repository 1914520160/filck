import { motion, AnimatePresence } from "framer-motion";
import { useUpdate } from "@/contexts/UpdateContext";
import { ArrowDown, Loader2, CheckCircle, AlertCircle, RotateCcw, ExternalLink } from "lucide-react";

/** TopBar 中显示的新版本提示徽章 */
export function UpdateBadge() {
  const { status, update, progress, downloadAndInstall, restart } = useUpdate();

  const handleClick = async () => {
    if (status === "available") {
      await downloadAndInstall();
    } else if (status === "ready" || status === "installed") {
      await restart();
    }
  };

  // 检查中：小转圈
  if (status === "checking") {
    return (
      <span className="update-badge" title="检查更新中…">
        <Loader2 size={10} className="spin-icon" />
      </span>
    );
  }

  // 有新版本：显示徽章
  if (status === "available") {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="update-badge update-badge-available"
        title={`发现新版本 v${update?.version}，点击下载更新`}
        onClick={handleClick}
      >
        <ArrowDown size={10} />
        <span>v{update?.version}</span>
      </motion.button>
    );
  }

  // 下载中：进度条
  if (status === "downloading") {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="update-badge update-badge-downloading"
        title={`下载中 ${progress}%`}
      >
        <Loader2 size={10} className="spin-icon" />
        <span>{progress}%</span>
      </motion.span>
    );
  }

  // 已就绪/已安装：点击重启
  if (status === "ready" || status === "installed") {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="update-badge update-badge-ready"
        title="更新已安装，点击重启"
        onClick={handleClick}
      >
        <RotateCcw size={10} />
        <span>重启</span>
      </motion.button>
    );
  }

  // 错误状态
  if (status === "error") {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="update-badge update-badge-error"
        title="更新检查失败"
      >
        <AlertCircle size={10} />
      </motion.span>
    );
  }

  // idle：不显示
  return null;
}

/** AboutDialog 中使用的更新横幅 + 下载进度 */
export function UpdateBanner() {
  const { status, update, progress, error, checkForUpdate, downloadAndInstall, restart, markInstalled } =
    useUpdate();

  switch (status) {
    case "checking":
      return (
        <div className="update-banner update-banner-checking">
          <Loader2 size={14} className="spin-icon" />
          <div>
            <div className="update-banner-title">检查更新中…</div>
          </div>
        </div>
      );

    case "available":
      return (
        <div className="update-banner update-banner-available">
          <div className="update-banner-icon">
            <ArrowDown size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="update-banner-title">发现新版本 v{update?.version}</div>
            <div className="update-banner-desc">{update?.body || "包含性能优化和 bug 修复"}</div>
          </div>
          <button className="update-banner-btn" onClick={downloadAndInstall}>
            <ArrowDown size={12} /> 下载更新
          </button>
        </div>
      );

    case "downloading":
      return (
        <div className="update-banner update-banner-downloading">
          <Loader2 size={14} className="spin-icon" />
          <div style={{ flex: 1 }}>
            <div className="update-banner-title">正在下载更新…</div>
            <div className="update-progress-bar">
              <div
                className="update-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="update-banner-desc">{progress}%</div>
          </div>
        </div>
      );

    case "ready":
      return (
        <div className="update-banner update-banner-ready">
          <CheckCircle size={16} style={{ color: "var(--accent)" }} />
          <div style={{ flex: 1 }}>
            <div className="update-banner-title">更新已下载完成</div>
            <div className="update-banner-desc">点击重启以应用更新</div>
          </div>
          <button
            className="update-banner-btn update-banner-btn-restart"
            onClick={async () => {
              markInstalled();
              await restart();
            }}
          >
            <RotateCcw size={12} /> 立即重启
          </button>
        </div>
      );

    case "installed":
      return (
        <div className="update-banner update-banner-ready">
          <CheckCircle size={16} style={{ color: "var(--accent)" }} />
          <div style={{ flex: 1 }}>
            <div className="update-banner-title">更新已安装</div>
            <div className="update-banner-desc">需要重启应用才能生效</div>
          </div>
          <button
            className="update-banner-btn update-banner-btn-restart"
            onClick={restart}
          >
            <RotateCcw size={12} /> 立即重启
          </button>
        </div>
      );

    case "error":
      return (
        <div className="update-banner update-banner-error">
          <AlertCircle size={16} style={{ color: "var(--danger)" }} />
          <div style={{ flex: 1 }}>
            <div className="update-banner-title">更新失败</div>
            <div className="update-banner-desc">{error || "未知错误，请重试"}</div>
          </div>
          <button className="update-banner-btn" onClick={checkForUpdate}>
            重试
          </button>
        </div>
      );

    case "idle":
    default:
      return (
        <div className="update-banner update-banner-idle">
          <CheckCircle size={14} style={{ color: "var(--accent)" }} />
          <div style={{ flex: 1 }}>
            <div className="update-banner-title">已是最新版本</div>
          </div>
          <button className="update-banner-btn" onClick={checkForUpdate}>
            检查更新
          </button>
        </div>
      );
  }
}
