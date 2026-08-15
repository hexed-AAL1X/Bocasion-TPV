const path = require("node:path");
const fsSync = require("node:fs");

let poolPromise = null;
let poolKey = "";

function loadSqlEnv() {
  try {
    const dotenv = require("dotenv");
    const envPath = path.join(__dirname, "..", ".env");
    if (fsSync.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  } catch {
    /* dotenv opcional */
  }
}

const SELECT_COLS = `
         CONVERT(varchar(19), fecha, 120) AS fecha,
         LTRIM(RTRIM(cdocu)) AS cdocu,
         LTRIM(RTRIM(ndocu)) AS ndocu,
         LTRIM(RTRIM(nomcli)) AS nomcli,
         LTRIM(RTRIM(ruccli)) AS ruccli,
         totn, tota, toti,
         LTRIM(RTRIM(mone)) AS mone,
         LTRIM(RTRIM(ISNULL(efactinfo, ''))) AS efactinfo,
         LTRIM(RTRIM(ISNULL(nrocomanda, ''))) AS nrocomanda,
         LTRIM(RTRIM(ISNULL(codven, ''))) AS codven,
         efectivo, tarjeta, banco,
         LTRIM(RTRIM(CONVERT(varchar(20), flag))) AS flag,
         tcam, monrecib, monvuelto,
         LTRIM(RTRIM(ISNULL(observ, ''))) AS observ,
         LTRIM(RTRIM(ISNULL(codtar, ''))) AS codtar`;

function hostList() {
  loadSqlEnv();
  const primary = String(process.env.MSSQL_HOST ?? "").trim();
  const extra = String(process.env.MSSQL_HOST_FALLBACK ?? "192.168.18.104")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return [...new Set([primary, ...extra].filter(Boolean))];
}

function mssqlConfig(host) {
  loadSqlEnv();
  const user = String(process.env.MSSQL_USER ?? "").trim();
  const password = String(process.env.MSSQL_PASSWORD ?? "");
  if (!host) {
    throw new Error("Falta MSSQL_HOST en .env (ej. 100.87.28.27)");
  }
  if (!user || !password) {
    throw new Error("Falta MSSQL_USER / MSSQL_PASSWORD en .env");
  }
  const database = String(process.env.MSSQL_DATABASE ?? "").trim() || "Bdnava02";
  const port = Number(process.env.MSSQL_PORT || 1433) || 1433;
  const auth = String(process.env.MSSQL_AUTH ?? "sql").trim().toLowerCase();
  const domain = String(process.env.MSSQL_DOMAIN ?? "").trim();
  const hosts = hostList();
  const base = {
    server: host,
    port,
    database,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    connectionTimeout: hosts.length > 1 ? 2500 : 8000,
    requestTimeout: 20000,
    pool: { max: 4, min: 0, idleTimeoutMillis: 30_000 },
  };
  if (auth === "ntlm") {
    return {
      ...base,
      authentication: {
        type: "ntlm",
        options: {
          domain: domain || host,
          userName: user,
          password,
        },
      },
    };
  }
  return { ...base, user, password };
}

async function getPool() {
  const hosts = hostList();
  if (!hosts.length) {
    throw new Error("Falta MSSQL_HOST en .env (ej. 100.87.28.27)");
  }
  const nextKey = hosts.join(",");
  if (poolPromise && poolKey === nextKey) return poolPromise;

  let mssql;
  try {
    mssql = require("mssql");
  } catch {
    throw new Error("Falta el paquete mssql. Ejecuta: npm install mssql");
  }

  let lastErr = new Error("No se pudo conectar a SQL Server");
  for (const host of hosts) {
    try {
      const cfg = mssqlConfig(host);
      const pending = mssql.connect(cfg);
      poolPromise = pending;
      poolKey = nextKey;
      await pending;
      return pending;
    } catch (err) {
      poolPromise = null;
      poolKey = "";
      lastErr = err;
    }
  }
  throw lastErr;
}

function cell(value) {
  if (value == null) return "";
  return String(value).trim();
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapRow(row) {
  return {
    fecha: cell(row.fecha),
    cdocu: cell(row.cdocu),
    ndocu: cell(row.ndocu),
    nomcli: cell(row.nomcli),
    ruccli: cell(row.ruccli),
    totn: money(row.totn),
    tota: money(row.tota),
    toti: money(row.toti),
    mone: cell(row.mone),
    efactinfo: cell(row.efactinfo),
    nrocomanda: cell(row.nrocomanda),
    codven: cell(row.codven),
    efectivo: money(row.efectivo),
    tarjeta: money(row.tarjeta),
    banco: money(row.banco),
    flag: cell(row.flag),
    tcam: money(row.tcam),
    monrecib: money(row.monrecib),
    monvuelto: money(row.monvuelto),
    observ: cell(row.observ),
    codtar: cell(row.codtar),
  };
}

async function listNavaDocs(payload) {
  const raw = String(payload?.cdocu ?? "").trim();
  if (raw && raw !== "01" && raw !== "03" && raw !== "all") {
    throw new Error("Solo se listan facturas (01) y boletas (03)");
  }
  const kind = !raw || raw === "all" ? "all" : raw;
  const fecha = String(payload?.fecha ?? "").trim().slice(0, 10);
  const defaultLimit = fecha ? 500 : 150;
  const limit = Math.min(2000, Math.max(1, Number(payload?.limit) || defaultLimit));
  const pool = await getPool();
  const request = pool.request().input("p1", limit).input("p2", kind);

  let sql = `SELECT TOP (@p1) ${SELECT_COLS}
       FROM mst01fac WITH (NOLOCK)
       WHERE cdocu IN ('01','03') AND (@p2 = 'all' OR cdocu = @p2)`;
  if (fecha) {
    request.input("p3", fecha);
    sql += ` AND fecha >= @p3 AND fecha < DATEADD(day, 1, @p3)`;
  }
  sql += " ORDER BY fecha DESC, ndocu DESC";

  const result = await request.query(sql);
  return (result.recordset ?? []).map(mapRow);
}

async function listNavaDates() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT DISTINCT CONVERT(varchar(10), fecha, 23) AS d
    FROM mst01fac WITH (NOLOCK)
    WHERE cdocu IN ('01','03')
      AND fecha >= DATEADD(day, -180, CAST(GETDATE() AS date))
    ORDER BY d DESC`);
  return (result.recordset ?? []).map((row) => cell(row.d)).filter(Boolean);
}

function pad(value, len) {
  return String(value ?? "").trim().padEnd(len).slice(0, len);
}

function nextNdocu(last, serie) {
  const prefix = `${serie}-`;
  const raw = String(last ?? "").trim();
  const n = raw.startsWith(prefix) ? Number(raw.slice(prefix.length)) : 0;
  const next = (Number.isFinite(n) ? n : 0) + 1;
  return `${serie}-${String(next).padStart(7, "0")}`;
}

async function insertNavaSale(payload) {
  const cdocu = payload?.cdocu === "01" ? "01" : "03";
  const serie = cdocu === "01" ? "F036" : "B038";
  const alm = cdocu === "01" ? "24" : "25";
  const pto = cdocu === "01" ? "39" : "41";
  const totn = money(payload?.totn);
  const tota = money(payload?.tota) || Math.round((totn / 1.18) * 100) / 100;
  const toti = money(payload?.toti) || Math.round((totn - tota) * 100) / 100;
  const tcam = money(payload?.tcam) || 3.4;
  const now = new Date();
  const fecha = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lines = Array.isArray(payload?.lines) ? payload.lines : [];
  const pool = await getPool();
  const trx = new (require("mssql").Transaction)(pool);
  await trx.begin();
  try {
    const max = await new (require("mssql").Request)(trx)
      .input("c", cdocu)
      .input("p", `${serie}-%`)
      .query(
        "SELECT MAX(ndocu) AS ndocu FROM mst01fac WITH (UPDLOCK, HOLDLOCK) WHERE cdocu = @c AND ndocu LIKE @p",
      );
    const ndocu = nextNdocu(max.recordset?.[0]?.ndocu, serie);
    const nomcli = String(payload?.nomcli ?? "VENTA CONTADO").trim().slice(0, 60) || "VENTA CONTADO";
    const ruccli = pad(payload?.ruccli ?? "", 11);
    const wantedCli = pad(payload?.codcli || "C00000", 6);
    const cliOk = await new (require("mssql").Request)(trx)
      .input("cli", wantedCli)
      .query("SELECT TOP 1 codcli FROM mst01cli WHERE codcli = @cli");
    const codcli = cliOk.recordset?.[0]?.codcli
      ? pad(cliOk.recordset[0].codcli, 6)
      : pad("C00000", 6);

    const wantedVen = String(payload?.codven ?? "").trim();
    const venOk = wantedVen
      ? await new (require("mssql").Request)(trx)
          .input("v", pad(wantedVen, 5))
          .query("SELECT TOP 1 codven FROM tbl01ven WHERE RTRIM(codven) = RTRIM(@v)")
      : { recordset: [] };
    let codven = venOk.recordset?.[0]?.codven;
    if (!codven) {
      const fb = await new (require("mssql").Request)(trx).query(
        "SELECT TOP 1 codven FROM tbl01ven WHERE RTRIM(codven) IN ('V0046','V0000') ORDER BY CASE WHEN RTRIM(codven)='V0046' THEN 0 ELSE 1 END",
      );
      codven = fb.recordset?.[0]?.codven || "V0000";
    }
    codven = pad(codven, 5);
    const tfact = "2";
    const efectivo = money(payload?.efectivo);
    const tarjeta = money(payload?.tarjeta);
    const banco = money(payload?.banco);
    const cajrecib = money(payload?.cajrecib) || totn;
    const cajvuelto = money(payload?.cajvuelto);

    await new (require("mssql").Request)(trx)
      .input("fecha", fecha)
      .input("cdocu", pad(cdocu, 2))
      .input("ndocu", pad(ndocu, 12))
      .input("tfact", tfact)
      .input("codcli", codcli)
      .input("nomcli", nomcli)
      .input("ruccli", ruccli)
      .input("tota", tota)
      .input("toti", toti)
      .input("totn", totn)
      .input("mone", "S")
      .input("tcam", tcam)
      .input("flag", "0")
      .input("CodAlm", pad(alm, 2))
      .input("Codpto", pad(pto, 2))
      .input("codven", codven)
      .input("codfdp", "02")
      .input("Codcdv", "01")
      .input("codvta", "01")
      .input("efectivo", efectivo)
      .input("tarjeta", tarjeta)
      .input("banco", banco)
      .input("cajrecib", cajrecib)
      .input("cajvuelto", cajvuelto)
      .input("origen", 0)
      .input("observ", String(payload?.observ ?? "").trim().slice(0, 250))
      .query(`INSERT INTO mst01fac (
          fecha, cdocu, ndocu, tfact, codcli, nomcli, ruccli,
          tota, toti, totn, mone, tcam, flag, CodAlm, Codpto, codven,
          codfdp, Codcdv, codvta, efectivo, tarjeta, banco, cajrecib, cajvuelto, origen, observ
        ) VALUES (
          @fecha, @cdocu, @ndocu, @tfact, @codcli, @nomcli, @ruccli,
          @tota, @toti, @totn, @mone, @tcam, @flag, @CodAlm, @Codpto, @codven,
          @codfdp, @Codcdv, @codvta, @efectivo, @tarjeta, @banco, @cajrecib, @cajvuelto, @origen, @observ
        )`);

    let item = 1;
    for (const line of lines.length ? lines : [{ description: "VENTA", qty: 1, unitPrice: totn, dscto: 0, um: "UND", code: "" }]) {
      const qty = money(line.qty) || 1;
      const preu = money(line.unitPrice);
      const dsct = money(line.dscto);
      const lineTotn = Math.round(qty * preu * (1 - dsct / 100) * 100) / 100;
      const lineTota = Math.round((lineTotn / 1.18) * 100) / 100;
      await new (require("mssql").Request)(trx)
        .input("fecha", fecha)
        .input("cdocu", pad(cdocu, 2))
        .input("ndocu", pad(ndocu, 12))
        .input("tfact", tfact)
        .input("codcli", codcli)
        .input("item", item)
        .input("codi", pad(line.code || "", 11))
        .input("codf", pad(line.code || "", 20))
        .input("descr", String(line.description || "ITEM").trim().slice(0, 80))
        .input("umed", pad(line.um || "UND", 3))
        .input("cant", qty)
        .input("preu", preu)
        .input("dsct", dsct)
        .input("tota", lineTota)
        .input("totn", lineTotn)
        .input("mone", "S")
        .input("moneitm", "S")
        .input("tcam", tcam)
        .input("aigv", "S")
        .input("Codalm", pad(alm, 2))
        .input("codven", codven)
        .input("flag", "0")
        .query(`INSERT INTO dtl01fac (
            fecha, cdocu, ndocu, tfact, codcli, item, codi, codf, descr, umed,
            cant, preu, dsct, tota, totn, mone, moneitm, tcam, aigv, Codalm, codven, flag
          ) VALUES (
            @fecha, @cdocu, @ndocu, @tfact, @codcli, @item, @codi, @codf, @descr, @umed,
            @cant, @preu, @dsct, @tota, @totn, @mone, @moneitm, @tcam, @aigv, @Codalm, @codven, @flag
          )`);
      item += 1;
    }

    await trx.commit();
    return { ndocu, cdocu, fecha: fecha.toISOString() };
  } catch (err) {
    await trx.rollback().catch(() => {});
    throw err;
  }
}

function warmupSql() {
  return getPool().then(() => true).catch(() => false);
}

module.exports = { listNavaDocs, listNavaDates, insertNavaSale, warmupSql };
