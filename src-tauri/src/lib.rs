mod http_bridge;
mod sql_bridge;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  http_bridge::ensure_env_loaded();

  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      http_bridge::get_platform,
      http_bridge::fetch_json_url,
      http_bridge::lookup_identity,
      http_bridge::warmup_http,
      sql_bridge::list_nava_docs,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
