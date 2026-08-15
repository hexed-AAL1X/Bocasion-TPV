use serde::Serialize;
use std::time::Duration;
use tiberius::{AuthMethod, Client, Config, Query};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;

use crate::http_bridge;

fn env_key(name: &str) -> String {
  http_bridge::ensure_env_loaded();
  std::env::var(name).unwrap_or_default().trim().to_string()
}

fn mssql_config() -> Result<Config, String> {
  let host = env_key("MSSQL_HOST");
  if host.is_empty() {
    return Err("Falta MSSQL_HOST en .env (ej. 100.87.28.27)".into());
  }
  let user = env_key("MSSQL_USER");
  let pass = env_key("MSSQL_PASSWORD");
  if user.is_empty() || pass.is_empty() {
    return Err("Falta MSSQL_USER / MSSQL_PASSWORD (login SQL, no Windows)".into());
  }
  let db = {
    let d = env_key("MSSQL_DATABASE");
    if d.is_empty() {
      "Bdnava02".to_string()
    } else {
      d
    }
  };
  let port: u16 = env_key("MSSQL_PORT").parse().unwrap_or(1433);

  let mut config = Config::new();
  config.host(host);
  config.port(port);
  config.database(db);
  config.authentication(AuthMethod::sql_server(user, pass));
  config.trust_cert();
  Ok(config)
}

async fn mssql_client() -> Result<Client<tokio_util::compat::Compat<TcpStream>>, String> {
  let config = mssql_config()?;
  let addr = config.get_addr();
  let tcp = tokio::time::timeout(Duration::from_secs(8), TcpStream::connect(&addr))
    .await
    .map_err(|_| format!("Timeout al conectar a {addr}"))?
    .map_err(|e| format!("No se pudo conectar a {addr}: {e}"))?;
  tcp.set_nodelay(true).map_err(|e| e.to_string())?;
  Client::connect(config, tcp.compat_write())
    .await
    .map_err(|e| format!("Login SQL falló: {e}"))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NavaDocRow {
  fecha: String,
  cdocu: String,
  ndocu: String,
  nomcli: String,
  ruccli: String,
  totn: f64,
  tota: f64,
  toti: f64,
  mone: String,
  efactinfo: String,
  nrocomanda: String,
  codven: String,
  efectivo: f64,
  tarjeta: f64,
  banco: f64,
  flag: String,
  tcam: f64,
  monrecib: f64,
  monvuelto: f64,
}

#[derive(Debug, serde::Deserialize)]
pub struct ListNavaDocsPayload {
  /// "01" factura · "03" boleta · "all" ambos
  #[serde(default)]
  cdocu: String,
  #[serde(default)]
  limit: Option<i32>,
  /// YYYY-MM-DD
  #[serde(default)]
  fecha: Option<String>,
}

fn trim_cell(v: Option<&str>) -> String {
  v.unwrap_or("").trim().to_string()
}

fn f64_cell(row: &tiberius::Row, i: usize) -> f64 {
  row.get::<f64, _>(i).unwrap_or(0.0)
}

const SELECT_COLS: &str = "\
       CONVERT(varchar(19), fecha, 120) AS fecha, \
       LTRIM(RTRIM(cdocu)) AS cdocu, \
       LTRIM(RTRIM(ndocu)) AS ndocu, \
       LTRIM(RTRIM(nomcli)) AS nomcli, \
       LTRIM(RTRIM(ruccli)) AS ruccli, \
       totn, tota, toti, \
       LTRIM(RTRIM(mone)) AS mone, \
       LTRIM(RTRIM(ISNULL(efactinfo, ''))) AS efactinfo, \
       LTRIM(RTRIM(ISNULL(nrocomanda, ''))) AS nrocomanda, \
       LTRIM(RTRIM(ISNULL(codven, ''))) AS codven, \
       efectivo, tarjeta, banco, \
       LTRIM(RTRIM(CONVERT(varchar(20), flag))) AS flag, \
       tcam, monrecib, monvuelto";

fn map_row(row: tiberius::Row) -> NavaDocRow {
  NavaDocRow {
    fecha: trim_cell(row.get(0)),
    cdocu: trim_cell(row.get(1)),
    ndocu: trim_cell(row.get(2)),
    nomcli: trim_cell(row.get(3)),
    ruccli: trim_cell(row.get(4)),
    totn: f64_cell(&row, 5),
    tota: f64_cell(&row, 6),
    toti: f64_cell(&row, 7),
    mone: trim_cell(row.get(8)),
    efactinfo: trim_cell(row.get(9)),
    nrocomanda: trim_cell(row.get(10)),
    codven: trim_cell(row.get(11)),
    efectivo: f64_cell(&row, 12),
    tarjeta: f64_cell(&row, 13),
    banco: f64_cell(&row, 14),
    flag: trim_cell(row.get(15)),
    tcam: f64_cell(&row, 16),
    monrecib: f64_cell(&row, 17),
    monvuelto: f64_cell(&row, 18),
  }
}

#[tauri::command]
pub async fn list_nava_docs(payload: ListNavaDocsPayload) -> Result<Vec<NavaDocRow>, String> {
  let cdocu = payload.cdocu.trim().to_string();
  if cdocu != "01" && cdocu != "03" && cdocu != "all" && !cdocu.is_empty() {
    return Err("Solo se listan facturas (01) y boletas (03)".into());
  }
  let kind = if cdocu.is_empty() || cdocu == "all" {
    "all".to_string()
  } else {
    cdocu
  };
  let fecha = payload
    .fecha
    .as_deref()
    .unwrap_or("")
    .trim()
    .chars()
    .take(10)
    .collect::<String>();
  let limit = payload.limit.unwrap_or(if fecha.is_empty() { 150 } else { 500 }).clamp(1, 2000);

  let sql = if fecha.is_empty() {
    format!(
      "SELECT TOP (@P1) {SELECT_COLS} FROM mst01fac \
       WHERE RTRIM(cdocu) IN ('01','03') AND (@P2 = 'all' OR RTRIM(cdocu) = @P2) \
       ORDER BY fecha DESC, ndocu DESC"
    )
  } else {
    format!(
      "SELECT TOP (@P1) {SELECT_COLS} FROM mst01fac \
       WHERE RTRIM(cdocu) IN ('01','03') AND (@P2 = 'all' OR RTRIM(cdocu) = @P2) \
         AND fecha >= CONVERT(datetime, @P3) \
         AND fecha < DATEADD(day, 1, CONVERT(datetime, @P3)) \
       ORDER BY fecha DESC, ndocu DESC"
    )
  };

  let mut client = mssql_client().await?;
  let mut query = Query::new(sql);
  query.bind(limit);
  query.bind(kind);
  if !fecha.is_empty() {
    query.bind(fecha);
  }

  let stream = query.query(&mut client).await.map_err(|e| e.to_string())?;
  let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
  Ok(rows.into_iter().map(map_row).collect())
}
