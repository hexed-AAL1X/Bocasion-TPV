use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::Duration;

fn allowed_hosts() -> &'static HashSet<&'static str> {
  static HOSTS: OnceLock<HashSet<&'static str>> = OnceLock::new();
  HOSTS.get_or_init(|| {
    HashSet::from([
      "estadisticas.bcrp.gob.pe",
      "api.open-meteo.com",
      "geocoding-api.open-meteo.com",
      "ip-api.com",
      "consulta.rucpe.com",
      "bocasion.com",
      "dniruc.apisperu.com",
      "eldni.com",
    ])
  })
}

fn load_dotenv_files() {
  static LOADED: OnceLock<()> = OnceLock::new();
  LOADED.get_or_init(|| {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
      candidates.push(cwd.join(".env"));
      candidates.push(cwd.join("..").join(".env"));
    }
    if let Ok(exe) = std::env::current_exe() {
      if let Some(dir) = exe.parent() {
        candidates.push(dir.join(".env"));
        candidates.push(dir.join("..").join(".env"));
        candidates.push(dir.join("..").join("..").join(".env"));
      }
    }
    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join(".env"));

    for path in candidates {
      if path.is_file() {
        let _ = dotenvy::from_path(&path);
      }
    }
  });
}

fn env_key(name: &str) -> String {
  load_dotenv_files();
  std::env::var(name).unwrap_or_default().trim().to_string()
}

fn dni_api_base() -> String {
  let raw = env_key("VITE_API_BASE_URL");
  if !raw.is_empty() {
    return raw.trim_end_matches('/').to_string();
  }
  "https://bocasion.com/dni-api".to_string()
}

const DNI_API_FALLBACK: &str = "https://bocasion.com/dni-api";

fn api_base_host() -> Option<String> {
  url::Url::parse(&dni_api_base())
    .ok()
    .and_then(|u| u.host_str().map(|h| h.to_string()))
}

fn is_configured_api_host(host: &str) -> bool {
  api_base_host().as_deref() == Some(host)
}

/// Cliente HTTP compartido: reusa TCP/TLS (keep-alive) entre consultas.
fn shared_client() -> &'static reqwest::Client {
  static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
  CLIENT.get_or_init(|| {
    reqwest::Client::builder()
      .user_agent("BocaSoft/1.0 (Intranet Ventas)")
      .pool_idle_timeout(Duration::from_secs(90))
      .pool_max_idle_per_host(8)
      .tcp_keepalive(Duration::from_secs(30))
      .tcp_nodelay(true)
      .connect_timeout(Duration::from_secs(2))
      .timeout(Duration::from_secs(8))
      .build()
      .expect("reqwest client")
  })
}

fn pick_identity_name(data: &Value) -> String {
  let obj = match data.as_object() {
    Some(o) => o,
    None => return String::new(),
  };
  let keys = [
    "full_name",
    "nombre_completo",
    "nombreCompleto",
    "razon_social",
    "razonSocial",
    "nombre",
    "nombre_o_razon_social",
  ];
  for key in keys {
    if let Some(Value::String(s)) = obj.get(key) {
      let t = s.trim();
      if !t.is_empty() {
        return t.to_string();
      }
    }
  }
  let ap_pat = obj
    .get("apellido_paterno")
    .or_else(|| obj.get("apellidoPaterno"))
    .or_else(|| obj.get("first_last_name"));
  let ap_mat = obj
    .get("apellido_materno")
    .or_else(|| obj.get("apellidoMaterno"))
    .or_else(|| obj.get("second_last_name"));
  let nombres = obj.get("nombres").or_else(|| obj.get("first_name"));
  [ap_pat, ap_mat, nombres]
    .into_iter()
    .filter_map(|v| v.and_then(|x| x.as_str()))
    .map(str::trim)
    .filter(|s| !s.is_empty())
    .collect::<Vec<_>>()
    .join(" ")
}

fn parse_rucpe_buscar_html(html: &str, ruc: &str) -> Option<String> {
  let marker = format!("/ruc/{ruc}");
  let href_idx = html.find(&marker)?;
  let slice = &html[href_idx..html.len().min(href_idx + 1200)];
  let pattern = format!(r"{ruc}\s*</span>\s*<span[^>]*>([^<]+)</span>");
  let re = regex::Regex::new(&pattern).ok()?;
  let caps = re.captures(slice)?;
  let name = caps.get(1)?.as_str().trim();
  if name.is_empty() {
    None
  } else {
    Some(name.to_string())
  }
}

fn host_allowed(url: &url::Url) -> bool {
  let host = match url.host_str() {
    Some(h) => h,
    None => return false,
  };
  let known = allowed_hosts().contains(host) || is_configured_api_host(host);
  if !known {
    return false;
  }
  match url.scheme() {
    "https" => true,
    // HTTP solo para ip-api y tu API privada (IP sin TLS).
    "http" => host == "ip-api.com" || is_configured_api_host(host),
    _ => false,
  }
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum FetchJsonArg {
  Url(String),
  Opts {
    url: String,
    #[serde(default)]
    headers: Option<std::collections::HashMap<String, String>>,
  },
}

impl FetchJsonArg {
  fn parts(self) -> (String, Option<std::collections::HashMap<String, String>>) {
    match self {
      FetchJsonArg::Url(url) => (url, None),
      FetchJsonArg::Opts { url, headers } => (url, headers),
    }
  }
}

#[tauri::command]
pub async fn get_platform() -> String {
  std::env::consts::OS.to_string()
}

async fn ping_url(client: &reqwest::Client, url: &str) {
  let _ = client
    .get(url)
    .header("Accept", "*/*")
    .timeout(Duration::from_secs(4))
    .send()
    .await;
}

/// Precalienta DNS + TLS hacia hosts críticos (DNI, RUC, BCRP, clima).
#[tauri::command]
pub async fn warmup_http() -> bool {
  let client = shared_client();
  let primary = format!("{}/", dni_api_base());
  let fallback = format!("{}/", DNI_API_FALLBACK);
  tokio::join!(
    ping_url(client, &primary),
    ping_url(client, &fallback),
    ping_url(client, "https://consulta.rucpe.com/"),
    ping_url(client, "https://estadisticas.bcrp.gob.pe/"),
  );
  true
}

#[tauri::command]
pub async fn fetch_json_url(url_or_opts: FetchJsonArg) -> Value {
  let (url, extra_headers) = url_or_opts.parts();
  let parsed = match url::Url::parse(&url) {
    Ok(u) => u,
    Err(_) => return Value::Null,
  };
  if !host_allowed(&parsed) {
    return Value::Null;
  }

  let client = shared_client();
  let mut req = client.get(parsed).header("Accept", "application/json");
  if let Some(ref headers) = extra_headers {
    for (k, v) in headers {
      if !v.trim().is_empty() {
        req = req.header(k, v.trim());
      }
    }
  }

  let response = match req.send().await {
    Ok(r) => r,
    Err(_) => return Value::Null,
  };
  let status = response.status();
  let text = match response.text().await {
    Ok(t) => t,
    Err(_) => return Value::Null,
  };
  let trimmed = text.trim_start();
  if trimmed.starts_with('<') {
    return Value::Null;
  }
  let json: Value = if text.is_empty() {
    Value::Null
  } else {
    match serde_json::from_str(&text) {
      Ok(v) => v,
      Err(_) => return Value::Null,
    }
  };

  if !status.is_success() {
    if extra_headers.is_some() {
      return json!({
        "__httpError": true,
        "status": status.as_u16(),
        "body": json
      });
    }
    return Value::Null;
  }
  json
}

#[derive(Debug, Deserialize)]
pub struct IdentityPayload {
  #[serde(rename = "type")]
  kind: String,
  value: String,
}

#[tauri::command]
pub async fn lookup_identity(payload: IdentityPayload) -> Result<Value, String> {
  let digits: String = payload.value.chars().filter(|c| c.is_ascii_digit()).collect();
  match payload.kind.as_str() {
    "ruc" => lookup_ruc(&digits).await,
    "dni" => lookup_dni(&digits).await,
    _ => Ok(json!({ "ok": false, "message": "Tipo de documento no soportado" })),
  }
}

async fn fetch_dni_from_base(
  client: &reqwest::Client,
  base: &str,
  value: &str,
  timeout: Duration,
) -> Option<(String, String)> {
  let url = format!("{base}/api/dni/{value}");
  let response = client
    .get(&url)
    .header("Accept", "application/json")
    .timeout(timeout)
    .send()
    .await
    .ok()?;
  if !response.status().is_success() {
    return None;
  }
  let json: Value = response.json().await.ok()?;
  if json.get("success") == Some(&Value::Bool(false)) {
    return None;
  }
  let data = json.get("data").unwrap_or(&json);
  let name = pick_identity_name(data);
  if name.is_empty() {
    None
  } else {
    Some((base.to_string(), name))
  }
}

async fn lookup_dni(value: &str) -> Result<Value, String> {
  if value.len() != 8 {
    return Ok(json!({ "ok": false, "message": "DNI inválido (8 dígitos)" }));
  }

  let client = shared_client();
  let primary = dni_api_base();
  let fallback = DNI_API_FALLBACK.to_string();

  // Carrera: tu servidor + fallback público → el más rápido gana.
  // Si el VPS está apagado, connect_timeout corta y gana bocasion.
  let mut primary_fut = Box::pin(fetch_dni_from_base(
    client,
    &primary,
    value,
    Duration::from_secs(5),
  ));
  let same = primary.trim_end_matches('/') == fallback.trim_end_matches('/');
  let mut fallback_fut = Box::pin(async {
    if same {
      None
    } else {
      fetch_dni_from_base(client, &fallback, value, Duration::from_secs(8)).await
    }
  });
  let mut primary_done = false;
  let mut fallback_done = false;

  loop {
    tokio::select! {
      res = &mut primary_fut, if !primary_done => {
        primary_done = true;
        if let Some((provider, name)) = res {
          return Ok(json!({
            "ok": true,
            "provider": provider,
            "result": { "document": value, "type": "dni", "name": name }
          }));
        }
      }
      res = &mut fallback_fut, if !fallback_done => {
        fallback_done = true;
        if let Some((provider, name)) = res {
          return Ok(json!({
            "ok": true,
            "provider": provider,
            "result": { "document": value, "type": "dni", "name": name }
          }));
        }
      }
      else => break,
    }
  }

  Ok(json!({ "ok": false, "message": "No se encontró nombre para ese DNI" }))
}

async fn lookup_ruc_api(client: &reqwest::Client, value: &str, key: &str) -> Option<(String, String)> {
  let url = format!("https://consulta.rucpe.com/api/v1/ruc/{value}");
  let response = client
    .get(&url)
    .header("Accept", "application/json")
    .header("X-API-Key", key)
    .timeout(Duration::from_secs(6))
    .send()
    .await
    .ok()?;
  if !response.status().is_success() {
    return None;
  }
  let body: Value = response.json().await.ok()?;
  let name = pick_identity_name(&body);
  if name.is_empty() {
    None
  } else {
    Some(("consulta.rucpe.com".to_string(), name))
  }
}

async fn lookup_ruc_buscar(client: &reqwest::Client, value: &str) -> Option<(String, String)> {
  let buscar_url = format!("https://consulta.rucpe.com/buscar?q={value}");
  let response = client
    .get(&buscar_url)
    .header("Accept", "text/html")
    .header("HX-Request", "true")
    .timeout(Duration::from_secs(8))
    .send()
    .await
    .ok()?;
  if !response.status().is_success() {
    return None;
  }
  let html = response.text().await.ok()?;
  parse_rucpe_buscar_html(&html, value).map(|name| {
    (
      "consulta.rucpe.com/buscar".to_string(),
      name,
    )
  })
}

async fn lookup_ruc(value: &str) -> Result<Value, String> {
  if value.len() != 11 {
    return Ok(json!({ "ok": false, "message": "RUC inválido (11 dígitos)" }));
  }

  let rucpe_key = {
    let a = env_key("RUCPE_API_KEY");
    if !a.is_empty() {
      a
    } else {
      env_key("VITE_RUCPE_API_KEY")
    }
  };

  let client = shared_client();

  // Carrera real: el primero que devuelva nombre gana (no espera al otro).
  let mut api_fut = Box::pin(async {
    if rucpe_key.is_empty() {
      None
    } else {
      lookup_ruc_api(client, value, &rucpe_key).await
    }
  });
  let mut buscar_fut = Box::pin(lookup_ruc_buscar(client, value));
  let mut api_done = false;
  let mut buscar_done = false;

  loop {
    tokio::select! {
      res = &mut api_fut, if !api_done => {
        api_done = true;
        if let Some((provider, name)) = res {
          return Ok(json!({
            "ok": true,
            "provider": provider,
            "result": { "document": value, "type": "ruc", "name": name }
          }));
        }
      }
      res = &mut buscar_fut, if !buscar_done => {
        buscar_done = true;
        if let Some((provider, name)) = res {
          return Ok(json!({
            "ok": true,
            "provider": provider,
            "result": { "document": value, "type": "ruc", "name": name }
          }));
        }
      }
      else => break,
    }
  }

  Ok(json!({ "ok": false, "message": "RUC no encontrado en consulta.rucpe.com" }))
}

pub fn ensure_env_loaded() {
  load_dotenv_files();
}
