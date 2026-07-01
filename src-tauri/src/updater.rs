//! 绿色便携版自动更新模块
//!
//! 使用 self_update crate 从 GitHub Releases 下载 portable.zip 并原地替换 exe。
//! 安装版使用 Tauri 原生 updater 插件，绿色版使用此模块。

use self_update::backends::github::{Update, UpdateBuilder};
use std::sync::Mutex;
use serde::Serialize;

/// 更新检查结果
#[derive(Debug, Clone, Serialize)]
pub struct PortableUpdateInfo {
    /// 是否有可用更新
    pub available: bool,
    /// 当前版本
    pub current_version: String,
    /// 最新版本
    pub latest_version: String,
    /// 更新说明 (Release body)
    pub notes: String,
}

/// 下载进度
#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    /// 已下载字节数
    pub downloaded: u64,
    /// 总字节数（可能为 0 如果未知）
    pub total: u64,
    /// 百分比 0-100
    pub percentage: u32,
}

/// 更新状态（用于前端轮询/事件推送）
#[derive(Debug, Clone, Serialize)]
pub enum PortableUpdateStatus {
    Idle,
    Checking,
    Available(PortableUpdateInfo),
    Downloading(DownloadProgress),
    Ready,
    Error(String),
}

/// 全局更新状态
static UPDATE_STATUS: Mutex<Option<PortableUpdateStatus>> = Mutex::new(None);

/// 检测当前是否为绿色版（便携版）
///
/// 判断逻辑：检查当前 exe 所在目录是否包含 NSIS 卸载程序。
/// 如果有 `uninst.exe`，说明是安装版；否则是绿色版。
pub fn is_portable() -> bool {
    match std::env::current_exe() {
        Ok(exe_path) => {
            if let Some(dir) = exe_path.parent() {
                // NSIS 安装版会在安装目录生成 uninst.exe
                !dir.join("uninst.exe").exists()
            } else {
                true
            }
        }
        Err(_) => true,
    }
}

/// 获取当前版本号（从 tauri.conf.json 读取）
pub fn current_version() -> String {
    crate::commands::APP_VERSION.to_string()
}

/// 检查 GitHub Releases 是否有绿色版更新
///
/// 从 `https://github.com/lzlkyb/pastepanda/releases/latest`
/// 获取最新 Release 信息，查找 `*_portable.zip` 资产。
pub fn check_portable_update() -> Result<PortableUpdateInfo, String> {
    let status = PortableUpdateStatus::Checking;
    *UPDATE_STATUS.lock().unwrap() = Some(status);

    let current_ver = current_version();

    let builder = Update::configure()
        .repo_owner("lzlkyb")
        .repo_name("pastepanda")
        .bin_name("PastePanda")
        .current_version(&current_ver)
        .show_download_progress(false)
        .no_confirm(true)
        .show_output(false)
        .build()
        .map_err(|e| format!("构建更新检查器失败: {}", e))?;

    // 只获取最新 Release 信息，不下载
    let releases = builder
        .get_latest_release()
        .map_err(|e| format!("获取最新 Release 失败: {}", e))?;

    // 1.0.0-rc.1: get_latest_release() 返回 Releases，通过 .latest() 获取单个 Release
    let latest = releases
        .latest()
        .ok_or_else(|| "未找到任何 Release".to_string())?;

    let latest_ver = latest.version.to_string();
    let notes = latest.body.clone().unwrap_or_default();

    // 比较版本号（使用 semver 确保 latest > current 才算有更新）
    let available = semver::Version::parse(&latest_ver)
        .and_then(|lv| semver::Version::parse(&current_ver).map(|cv| lv > cv))
        .unwrap_or(latest_ver != current_ver);

    let info = PortableUpdateInfo {
        available,
        current_version: current_ver,
        latest_version: latest_ver,
        notes,
    };

    if available {
        *UPDATE_STATUS.lock().unwrap() = Some(PortableUpdateStatus::Available(info.clone()));
    } else {
        *UPDATE_STATUS.lock().unwrap() = Some(PortableUpdateStatus::Idle);
    }

    Ok(info)
}

/// 下载并安装绿色版更新
///
/// 从 GitHub Releases 下载 `PastePanda_*_portable.zip`，
/// 解压后通过 self_update 原地替换当前 exe。
/// 替换成功后需要手动重启应用。
pub fn download_and_install_portable() -> Result<(), String> {
    let current_ver = current_version();

    let status = UpdateBuilder::new()
        .repo_owner("lzlkyb")
        .repo_name("pastepanda")
        .bin_name("PastePanda")
        .current_version(&current_ver)
        .show_download_progress(true)
        .no_confirm(true)
        .show_output(true)
        .build()
        .map_err(|e| format!("构建更新器失败: {}", e))?;

    *UPDATE_STATUS.lock().unwrap() = Some(PortableUpdateStatus::Downloading(DownloadProgress {
        downloaded: 0,
        total: 0,
        percentage: 0,
    }));

    match status.update() {
        Ok(update_status) => {
            log::info!(
                "[PortableUpdater] 更新完成: {} -> {}",
                current_ver,
                update_status.version()
            );
            *UPDATE_STATUS.lock().unwrap() = Some(PortableUpdateStatus::Ready);
            Ok(())
        }
        Err(e) => {
            let msg = format!("更新失败: {}", e);
            log::error!("[PortableUpdater] {}", msg);
            *UPDATE_STATUS.lock().unwrap() = Some(PortableUpdateStatus::Error(msg.clone()));
            Err(msg)
        }
    }
}

/// 获取当前更新状态（供前端轮询）
pub fn get_update_status() -> PortableUpdateStatus {
    UPDATE_STATUS
        .lock()
        .unwrap()
        .clone()
        .unwrap_or(PortableUpdateStatus::Idle)
}
