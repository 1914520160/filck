use crate::data_store::{DataStore, HistoryItem, Snippet, Stats};
use crate::paste_engine::PasteEngine;
use tauri::{State, Manager, Emitter, Listener};

/// 应用版本号（与 Cargo.toml 保持一致）
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

/// 获取应用版本号
#[tauri::command]
pub fn get_app_version() -> String {
    APP_VERSION.to_string()
}

#[tauri::command]
pub fn get_history(
    store: State<DataStore>,
    workspace: String,
    filter: String,
    search: String,
    offset: u32,
    limit: u32,
) -> Result<Vec<HistoryItem>, String> {
    store.get_history(&workspace, &filter, &search, offset, limit)
}

#[tauri::command]
pub fn insert_history(
    store: State<DataStore>,
    item: HistoryItem,
) -> Result<(), String> {
    store.insert_history(&item)
}

/// 更新历史记录（编辑对话框用）
#[tauri::command]
pub fn update_history(
    store: State<DataStore>,
    id: String,
    text: String,
) -> Result<(), String> {
    store.update_history(&id, &text)
}

#[tauri::command]
pub fn delete_history(
    store: State<DataStore>,
    ids: Vec<String>,
) -> Result<u32, String> {
    store.delete_history(&ids)
}

#[tauri::command]
pub fn toggle_pin(
    store: State<DataStore>,
    id: String,
) -> Result<bool, String> {
    store.toggle_pin(&id)
}

#[tauri::command]
pub fn clear_history(
    store: State<DataStore>,
    workspace: String,
    before_days: Option<u32>,
) -> Result<serde_json::Value, String> {
    // 先获取即将被删除的记录（用于撤销）
    let deleted_items = store.get_history_before_cleanup(&workspace, before_days)?;
    let count = store.clear_history(&workspace, before_days)?;
    Ok(serde_json::json!({
        "count": count,
        "deleted_items": deleted_items,
    }))
}

#[tauri::command]
pub fn get_config(
    store: State<DataStore>,
) -> Result<serde_json::Value, String> {
    store.get_config()
}

#[tauri::command]
pub fn save_config(
    store: State<DataStore>,
    config: serde_json::Value,
    app: tauri::AppHandle,
) -> Result<(), String> {
    store.save_config(&config)?;

    // 刷新剪贴板监听器的 auto_strip 缓存，避免每次都锁数据库读取配置
    if let Some(monitor) = app.try_state::<crate::clipboard_monitor::ClipboardMonitor>() {
        let auto_strip = config.get("auto_strip").and_then(|v| v.as_bool()).unwrap_or(false);
        monitor.update_auto_strip_cache(auto_strip);
    }

    Ok(())
}

#[tauri::command]
pub fn get_stats(
    store: State<DataStore>,
    workspace: String,
) -> Result<Stats, String> {
    store.get_stats(&workspace)
}

// ===== 粘贴引擎命令 =====

/// 复制文本到剪贴板并执行粘贴（Ctrl+V）
#[tauri::command]
pub fn paste_text(
    engine: State<PasteEngine>,
    text: String,
) -> Result<(), String> {
    engine.execute_paste(Some(text))
}

/// 仅复制文本到剪贴板（不粘贴）
#[tauri::command]
pub fn copy_only(
    engine: State<PasteEngine>,
    text: String,
) -> Result<(), String> {
    engine.copy_only(&text)
}

/// 粘贴图片到目标窗口
#[tauri::command]
pub fn paste_image(
    engine: State<PasteEngine>,
    image_path: String,
) -> Result<(), String> {
    engine.execute_paste_image(&image_path)
}

/// 保存当前前台窗口句柄（在显示窗口之前调用）
#[tauri::command]
pub fn save_foreground(
    engine: State<PasteEngine>,
) -> Result<(), String> {
    engine.save_foreground_hwnd();
    Ok(())
}

/// 切换窗口显示/隐藏
#[tauri::command]
pub fn toggle_window(
    app: tauri::AppHandle,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            if let Err(e) = window.hide() {
                log::warn!("[Commands] 隐藏窗口失败: {}", e);
            }
        } else {
            // 显示窗口前保存前台窗口句柄，确保粘贴时能找到正确的目标
            if let Some(engine) = app.try_state::<crate::paste_engine::PasteEngine>() {
                engine.save_foreground_hwnd();
            }
            // 临时置顶确保窗口获得焦点，随后恢复（避免托盘弹窗关闭后焦点丢失）
            let _ = window.set_always_on_top(true);
            if let Err(e) = window.show() {
                log::warn!("[Commands] 显示窗口失败: {}", e);
            }
            window.set_focus().ok();
            // 延迟恢复置顶状态，确保焦点已稳定
            let w = window.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(150));
                let _ = w.set_always_on_top(false);
            });
        }
    }
    Ok(())
}

/// 退出应用程序
#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// 导入历史记录
#[tauri::command]
pub fn import_history(
    store: State<DataStore>,
    items: Vec<HistoryItem>,
) -> Result<u32, String> {
    store.import_history(&items)
}

/// 添加片段
#[tauri::command]
pub fn add_snippet(
    store: State<DataStore>,
    name: String,
    content: String,
) -> Result<(), String> {
    store.add_snippet(&name, &content)
}

/// 获取所有片段
#[tauri::command]
pub fn get_snippets(
    store: State<DataStore>,
) -> Result<Vec<Snippet>, String> {
    store.get_snippets()
}

/// 更新片段
#[tauri::command]
pub fn update_snippet(
    store: State<DataStore>,
    id: String,
    name: String,
    content: String,
) -> Result<(), String> {
    store.update_snippet(&id, &name, &content)
}

/// 删除片段
#[tauri::command]
pub fn delete_snippet(
    store: State<DataStore>,
    id: String,
) -> Result<(), String> {
    store.delete_snippet(&id)
}

/// 获取全部历史记录（用于导出）
#[tauri::command]
pub fn get_all_history(
    store: State<DataStore>,
    workspace: String,
) -> Result<Vec<HistoryItem>, String> {
    store.get_all_history(&workspace)
}

/// 读取图片文件并返回 base64 data URL（原图，用于预览）
#[tauri::command]
pub fn get_image_data_url(path: String) -> Result<String, String> {
    use std::io::Read;

    const MAX_FILE_SIZE: u64 = 20 * 1024 * 1024;
    let metadata = std::fs::metadata(&path).map_err(|e| format!("无法读取文件信息: {}", e))?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err(format!("图片文件过大 ({}MB)，超过 20MB 限制", metadata.len() / 1024 / 1024));
    }

    let mut file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::with_capacity(metadata.len() as usize);
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
    let base64_str = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &buffer);
    let mime = get_mime_from_path(&path);
    Ok(format!("data:{};base64,{}", mime, base64_str))
}

/// 生成图片缩略图并返回 base64 data URL（最大宽度 300px，用于卡片列表）
#[tauri::command]
pub fn get_image_thumbnail(path: String) -> Result<String, String> {
    use std::io::Cursor;
    use image::GenericImageView;

    const MAX_WIDTH: u32 = 300;
    const MAX_FILE_SIZE: u64 = 20 * 1024 * 1024;

    let metadata = std::fs::metadata(&path).map_err(|e| format!("无法读取文件信息: {}", e))?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err(format!("图片文件过大 ({}MB)", metadata.len() / 1024 / 1024));
    }

    let img = image::open(&path).map_err(|e| format!("无法打开图片: {}", e))?;
    let (w, h) = img.dimensions();

    // 如果原图已经很小，直接返回原图
    if w <= MAX_WIDTH {
        let mut buf = Cursor::new(Vec::new());
        img.write_to(&mut buf, image::ImageFormat::Png).map_err(|e| e.to_string())?;
        let base64_str = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, buf.get_ref());
        return Ok(format!("data:image/png;base64,{}", base64_str));
    }

    // 等比缩放
    let ratio = MAX_WIDTH as f64 / w as f64;
    let new_h = (h as f64 * ratio) as u32;
    let thumbnail = img.resize_exact(MAX_WIDTH, new_h, image::imageops::FilterType::Lanczos3);

    let mut buf = Cursor::new(Vec::new());
    thumbnail.write_to(&mut buf, image::ImageFormat::Png).map_err(|e| e.to_string())?;
    let base64_str = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, buf.get_ref());
    Ok(format!("data:image/png;base64,{}", base64_str))
}

/// 获取图片信息（尺寸、文件大小）
#[tauri::command]
pub fn get_image_info(path: String) -> Result<serde_json::Value, String> {
    use image::GenericImageView;
    let metadata = std::fs::metadata(&path).map_err(|e| format!("无法读取文件信息: {}", e))?;
    let file_size = metadata.len();

    let (width, height) = image::open(&path)
        .map(|img| img.dimensions())
        .map_err(|e| format!("无法读取图片尺寸: {}", e))?;

    let file_name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("未知");

    let size_str = if file_size >= 1024 * 1024 {
        format!("{:.1} MB", file_size as f64 / 1024.0 / 1024.0)
    } else if file_size >= 1024 {
        format!("{:.1} KB", file_size as f64 / 1024.0)
    } else {
        format!("{} B", file_size)
    };

    Ok(serde_json::json!({
        "width": width,
        "height": height,
        "file_size": file_size,
        "size_str": size_str,
        "file_name": file_name,
        "path": path,
    }))
}

fn get_mime_from_path(path: &str) -> &'static str {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/png",
    }
}

/// 重新注册全局热键（前端保存设置后调用）
#[tauri::command]
pub fn reregister_hotkeys(app: tauri::AppHandle, store: State<DataStore>) -> Result<(), String> {
    let config = store.get_config()?;
    let show_window = config.get("hotkey")
        .and_then(|v| v.as_str())
        .unwrap_or("Ctrl+Shift+V")
        .to_string();
    let seq_paste = config.get("sequential_hotkey")
        .and_then(|v| v.as_str())
        .unwrap_or("Ctrl+Shift+B")
        .to_string();
    let hotkey_config = crate::hotkey_manager::HotkeyConfig {
        show_window,
        seq_paste,
        index_prefix: "Ctrl+Alt".to_string(),
    };
    crate::hotkey_manager::reregister_global_hotkeys(&app, &hotkey_config)
}

/// 获取文件信息（大小、是否存在）
#[tauri::command]
pub fn get_file_info(path: String) -> Result<serde_json::Value, String> {
    let metadata = std::fs::metadata(&path);
    match metadata {
        Ok(m) => Ok(serde_json::json!({
            "size": m.len(),
            "exists": true,
        })),
        Err(_) => Ok(serde_json::json!({
            "size": 0,
            "exists": false,
        })),
    }
}

/// 打开文件所在文件夹并选中文件
#[tauri::command]
pub fn open_file_location(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Err("不支持的平台".to_string())
    }
}

// ===== 局域网同步命令 =====

/// 获取局域网同步状态（是否启用）
#[tauri::command]
pub fn get_lan_status(
    store: State<DataStore>,
) -> Result<bool, String> {
    let config = store.get_config()?;
    Ok(config.get("lan_sync_enabled").and_then(|v| v.as_bool()).unwrap_or(false))
}

/// 切换局域网同步
#[tauri::command]
pub fn toggle_lan_sync(
    app: tauri::AppHandle,
    store: State<DataStore>,
    enable: bool,
) -> Result<(), String> {
    // 保存配置
    let mut config = store.get_config()?;
    if let Some(obj) = config.as_object_mut() {
        obj.insert("lan_sync_enabled".to_string(), serde_json::Value::Bool(enable));
    }
    store.save_config(&config)?;

    // 启动/停止 LAN 同步
    if let Some(lan_sync) = app.try_state::<crate::lan_sync::LanSync>() {
        if enable {
            lan_sync.start_listener(app.clone());
        } else {
            lan_sync.stop();
        }
    }
    Ok(())
}

/// 发送测试同步消息
#[tauri::command]
pub fn send_lan_test(
    app: tauri::AppHandle,
) -> Result<(), String> {
    if let Some(lan_sync) = app.try_state::<crate::lan_sync::LanSync>() {
        lan_sync.send("🔔 这是一条局域网同步测试消息");
    }
    Ok(())
}

/// 获取已发现的局域网设备列表
#[tauri::command]
pub fn get_lan_devices(
    app: tauri::AppHandle,
) -> Result<Vec<crate::lan_sync::LanDevice>, String> {
    if let Some(lan_sync) = app.try_state::<crate::lan_sync::LanSync>() {
        Ok(lan_sync.get_devices())
    } else {
        Ok(Vec::new())
    }
}

/// 设置开机自启
#[tauri::command]
pub fn set_startup(enable: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::RegKey;
        use winreg::enums::*;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let path = r"Software\Microsoft\Windows\CurrentVersion\Run";
        let (key, _) = hkcu.create_subkey(path).map_err(|e| e.to_string())?;
        if enable {
            let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
            key.set_value("ClipboardManager", &exe_path.to_string_lossy().to_string())
                .map_err(|e| e.to_string())?;
        } else {
            if let Err(e) = key.delete_value("ClipboardManager") {
                log::warn!("[Commands] 删除开机自启注册表失败: {}", e);
            }
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = enable;
        Ok(())
    }
}

/// 获取开机自启状态
#[tauri::command]
pub fn get_startup() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::RegKey;
        use winreg::enums::*;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let path = r"Software\Microsoft\Windows\CurrentVersion\Run";
        match hkcu.open_subkey(path) {
            Ok(key) => Ok(key.get_value::<String, _>("ClipboardManager").is_ok()),
            Err(_) => Ok(false),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

/// 切换剪贴板监听状态
#[tauri::command]
pub fn toggle_monitor(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(monitor) = app.try_state::<crate::clipboard_monitor::ClipboardMonitor>() {
        if monitor.is_running() {
            monitor.stop();
            Ok(false)
        } else {
            monitor.start();
            Ok(true)
        }
    } else {
        Err("监听器未初始化".to_string())
    }
}

/// 获取剪贴板监听状态
#[tauri::command]
pub fn get_monitor_status(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(monitor) = app.try_state::<crate::clipboard_monitor::ClipboardMonitor>() {
        Ok(monitor.is_running())
    } else {
        Err("监听器未初始化".to_string())
    }
}

// ===== OCR 图片文字识别 =====

/// OCR 识别结果 — 每个词的信息
#[derive(serde::Serialize, Clone)]
pub struct OcrWordInfo {
    pub text: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// OCR 识别结果 — 按行分组
#[derive(serde::Serialize, Clone)]
pub struct OcrLineInfo {
    pub text: String,
    pub words: Vec<OcrWordInfo>,
}

/// OCR 识别结果
#[derive(serde::Serialize, Clone)]
pub struct OcrResult {
    pub lines: Vec<OcrLineInfo>,
    pub full_text: String,
}

/// 对图片文件执行 OCR 文字识别（Windows OCR 引擎）
/// 使用 async + spawn_blocking 避免阻塞主线程导致 UI 卡死
#[tauri::command]
pub async fn ocr_image(path: String) -> Result<OcrResult, String> {
    tokio::task::spawn_blocking(move || ocr_image_impl(&path))
        .await
        .map_err(|e| format!("OCR 任务失败: {}", e))?
}

#[cfg(target_os = "windows")]
fn ocr_image_impl(path: &str) -> Result<OcrResult, String> {
    use windows::core::HSTRING;
    use windows::Globalization::Language;
    use windows::Graphics::Imaging::BitmapDecoder;
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::{FileAccessMode, StorageFile};

    // 1. 用 StorageFile 打开图片文件
    let file = StorageFile::GetFileFromPathAsync(&HSTRING::from(path))
        .map_err(|e| format!("打开文件失败: {}", e))?
        .get()
        .map_err(|e| format!("等待文件打开失败: {}", e))?;

    // 2. 打开文件流 (需要 Storage_Streams feature)
    let stream = file
        .OpenAsync(FileAccessMode::Read)
        .map_err(|e| format!("打开文件流失败: {}", e))?
        .get()
        .map_err(|e| format!("等待文件流失败: {}", e))?;

    // 3. 解码图片 (静态方法, 需要 Storage_Streams feature)
    let decoder = BitmapDecoder::CreateAsync(&stream)
        .map_err(|e| format!("创建解码器失败: {}", e))?
        .get()
        .map_err(|e| format!("解码图片失败: {}", e))?;

    let bitmap = decoder
        .GetSoftwareBitmapAsync()
        .map_err(|e| format!("获取位图失败: {}", e))?
        .get()
        .map_err(|e| format!("读取位图数据失败: {}", e))?;

    // 4. 创建 OCR 引擎（中文优先，回退英文）
    let language = Language::CreateLanguage(&HSTRING::from("zh-Hans"))
        .or_else(|_| Language::CreateLanguage(&HSTRING::from("en-US")))
        .map_err(|_| "无法创建语言对象".to_string())?;

    let engine = OcrEngine::TryCreateFromLanguage(&language)
        .map_err(|e| format!("创建 OCR 引擎失败: {}. 请确保系统已安装中文语言包", e))?;

    // 5. 执行 OCR
    let ocr_result = engine
        .RecognizeAsync(&bitmap)
        .map_err(|e| format!("OCR 识别失败: {}", e))?
        .get()
        .map_err(|e| format!("获取 OCR 结果失败: {}", e))?;

    // 6. 提取结果 (Lines/Words 需要 Foundation_Collections feature)
    let lines = {
        let ocr_lines = ocr_result
            .Lines()
            .map_err(|e| format!("获取 OCR 行失败: {}", e))?;
        let count = ocr_lines.Size().map_err(|e| format!("获取行数失败: {}", e))? as usize;
        let mut lines_vec = Vec::with_capacity(count);
        for i in 0..count {
            let line = ocr_lines
                .GetAt(i as u32)
                .map_err(|e| format!("获取第 {} 行失败: {}", i, e))?;
            let line_text = line.Text().unwrap_or_default().to_string();

            let words_iv = line
                .Words()
                .map_err(|e| format!("获取词列表失败: {}", e))?;
            let wcount = words_iv.Size().map_err(|e| format!("获取词数失败: {}", e))? as usize;
            let mut words = Vec::with_capacity(wcount);
            for j in 0..wcount {
                let word = words_iv
                    .GetAt(j as u32)
                    .map_err(|e| format!("获取第 {}-{} 个词失败: {}", i, j, e))?;
                let rect = word.BoundingRect().unwrap_or_default();
                words.push(OcrWordInfo {
                    text: word.Text().unwrap_or_default().to_string(),
                    x: rect.X,
                    y: rect.Y,
                    width: rect.Width,
                    height: rect.Height,
                });
            }
            lines_vec.push(OcrLineInfo {
                text: line_text,
                words,
            });
        }
        lines_vec
    };

    let full_text = lines
        .iter()
        .map(|l| l.text.as_str())
        .collect::<Vec<_>>()
        .join("\n");

    Ok(OcrResult { lines, full_text })
}

#[cfg(not(target_os = "windows"))]
fn ocr_image_impl(_path: &str) -> Result<OcrResult, String> {
    Err("OCR 功能仅支持 Windows 系统".to_string())
}

// ===== 置顶图片窗口 =====

/// 打开/切换置顶图片窗口
/// 流程：创建窗口 → 前端加载完发 pinned-image-ready → 后端收到后发 pinned-image-update 带图片路径
#[tauri::command]
pub fn open_pinned_image(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let label = "pinned-image";

    // 如果窗口已存在且可见，更新图片
    if let Some(window) = app.get_webview_window(label) {
        if window.is_visible().unwrap_or(false) {
            window
                .emit("pinned-image-update", path.clone())
                .map_err(|e| format!("发送事件失败: {}", e))?;
            window.set_focus().map_err(|e| format!("聚焦窗口失败: {}", e))?;
            return Ok(());
        }
        // 窗口被销毁后残留引用，先关闭再重建
        let _ = window.close();
    }

    let handle = app.clone();
    let path_clone = path.clone();

    // 创建新窗口
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        label,
        tauri::WebviewUrl::App("pinned-image.html".into()),
    )
    .title("置顶图片")
    .inner_size(400.0, 500.0)
    .min_inner_size(200.0, 150.0)
    .decorations(false)
    .always_on_top(true)
    .resizable(true)
    .visible(true)
    .center()
    .build()
    .map_err(|e| format!("创建置顶窗口失败: {}", e))?;

    // 监听前端就绪事件，收到后立即发送图片路径
    let handle2 = handle.clone();
    let path_clone2 = path_clone.clone();
    window.listen("pinned-image-ready", move |_| {
        if let Some(w) = handle2.get_webview_window(label) {
            let _ = w.emit("pinned-image-update", &path_clone2);
        }
    });

    // 兜底：如果前端事件因故未触发，500ms 后自动发送
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(800));
        if let Some(w) = handle.get_webview_window(label) {
            // 只发一次：如果已经发过（前端已显示图片），就不重复发了
            let _ = w.emit("pinned-image-update-fallback", &path_clone);
        }
    });

    Ok(())
}

/// 关闭置顶图片窗口
#[tauri::command]
pub fn close_pinned_image(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("pinned-image") {
        window.close().map_err(|e| format!("关闭窗口失败: {}", e))?;
    }
    Ok(())
}

/// 隐藏托盘弹窗（前端点击弹窗外部时调用）
#[tauri::command]
pub fn hide_tray_popup(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(popup) = app.get_webview_window("tray-popup") {
        if popup.is_visible().unwrap_or(false) {
            popup.hide().ok();
        }
    }
    Ok(())
}
