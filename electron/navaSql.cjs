const path = require("node:path");
const fsSync = require("node:fs");
const { loadAppEnv, isPackagedApp } = require("./loadAppEnv.cjs");

let poolPromise = null;
let poolKey = "";

function loadSqlEnv() {
  loadAppEnv({ override: true });
}

function profileStatePath() {
  try {
    const { app } = require("electron");
    return path.join(app.getPath("userData"), "sql-profile.json");
  } catch {
    return path.join(__dirname, "..", ".sql-profile.json");
  }
}

function envPref(prefix, key, fallback = "") {
  const specific = String(process.env[`${prefix}${key}`] ?? "").trim();
  if (specific) return specific;
  return String(process.env[`MSSQL_${key}`] ?? fallback).trim();
}

function readProfileDef(id) {
  loadSqlEnv();
  const prefix = `MSSQL_${id.toUpperCase()}_`;
  const defaults = {
    dev: { label: "Desarrollo", host: "100.87.28.27" },
    prod: { label: "Producción", host: "52.41.28.184" },
  };
  const meta = defaults[id] ?? { label: id, host: "" };
  return {
    id,
    label: envPref(prefix, "LABEL", meta.label) || meta.label,
    host: envPref(prefix, "HOST", meta.host),
    fallback: envPref(prefix, "HOST_FALLBACK"),
    port: Number(envPref(prefix, "PORT", "1433")) || 1433,
    database: envPref(prefix, "DATABASE", "Bdnava02") || "Bdnava02",
    auth: (envPref(prefix, "AUTH", "sql") || "sql").toLowerCase(),
    domain: envPref(prefix, "DOMAIN"),
    user: envPref(prefix, "USER"),
    password: String(process.env[`${prefix}PASSWORD`] ?? process.env.MSSQL_PASSWORD ?? ""),
  };
}

function profileIds() {
  loadSqlEnv();
  const raw = String(process.env.MSSQL_PROFILES ?? "dev,prod")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(raw.length ? raw : ["dev"])];
}

function readProfileState() {
  try {
    return JSON.parse(fsSync.readFileSync(profileStatePath(), "utf8")) ?? {};
  } catch {
    return {};
  }
}

function writeProfileState(patch) {
  const file = profileStatePath();
  const next = { ...readProfileState(), ...patch };
  fsSync.mkdirSync(path.dirname(file), { recursive: true });
  fsSync.writeFileSync(file, JSON.stringify(next), "utf8");
}

function readStoredProfileId() {
  loadSqlEnv();
  const fallback = "dev";
  const fromEnv = String(process.env.MSSQL_PROFILE ?? fallback).trim().toLowerCase();
  const envProfile = profileIds().includes(fromEnv) ? fromEnv : fallback;

  const stored = String(readProfileState().id ?? "").trim().toLowerCase();
  if (isPackagedApp() && stored !== envProfile && profileIds().includes(envProfile)) {
    writeStoredProfileId(envProfile);
    return envProfile;
  }
  if (stored && profileIds().includes(stored)) return stored;

  return profileIds().includes(envProfile) ? envProfile : profileIds()[0];
}

function writeStoredProfileId(id) {
  writeProfileState({ id });
}

function readLastHost() {
  return String(readProfileState().lastHost ?? "").trim();
}

function activeProfile() {
  return readProfileDef(readStoredProfileId());
}

function hostList() {
  const profile = activeProfile();
  const extra = String(profile.fallback ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return [...new Set([profile.host, ...extra].filter(Boolean))];
}

function mssqlConfig(host) {
  const profile = activeProfile();
  if (!host) {
    throw new Error("Falta el host SQL del perfil activo");
  }
  if (!profile.user || !profile.password) {
    throw new Error(
      `Falta usuario/contraseña SQL (${profile.id}). En la app instalada coloca config.env en la carpeta de datos o regenera el instalador con .env.`,
    );
  }
  const base = {
    server: host,
    port: profile.port,
    database: profile.database,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    connectionTimeout: 12000,
    requestTimeout: 60000,
    pool: { max: 4, min: 1, idleTimeoutMillis: 300_000 },
  };
  if (profile.auth === "ntlm") {
    return {
      ...base,
      authentication: {
        type: "ntlm",
        options: {
          domain: profile.domain || host,
          userName: profile.user,
          password: profile.password,
        },
      },
    };
  }
  return { ...base, user: profile.user, password: profile.password };
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

async function closePool() {
  if (!poolPromise) return;
  try {
    const pool = await poolPromise;
    await pool.close();
  } catch {
    /* pool ya cerrado */
  }
  poolPromise = null;
  poolKey = "";
}

function tcpReachable(host, port, ms = 2200) {
  const net = require("node:net");
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.destroy();
      resolve(true);
    });
    const fail = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(ms, fail);
    socket.once("error", fail);
  });
}

async function orderReachableHosts(hosts, port) {
  const last = readLastHost();
  const unique = [...new Set([last, ...hosts].filter((h) => hosts.includes(h)))];
  const checks = await Promise.all(
    unique.map(async (host) => ({ host, ok: await tcpReachable(host, port) })),
  );
  const up = checks.filter((row) => row.ok).map((row) => row.host);
  return up.length ? up : unique;
}

function connectError(hosts, lastErr) {
  const list = hosts.join(", ");
  const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
  return new Error(
    `No hay SQL en ${list}. Si usa Desarrollo, abra Tailscale y reintente. (${detail})`,
  );
}

async function getPool() {
  const profile = activeProfile();
  const hosts = hostList().slice(0, 2);
  if (!hosts.length) {
    throw new Error(`Falta MSSQL_${profile.id.toUpperCase()}_HOST en .env`);
  }
  const nextKey = `${profile.id}|${hosts.join(",")}`;
  if (poolPromise && poolKey === nextKey) return poolPromise;

  let mssql;
  try {
    mssql = require("mssql");
  } catch {
    throw new Error("Falta el paquete mssql. Ejecuta: npm install mssql");
  }

  if (poolPromise && poolKey !== nextKey) {
    await closePool();
  }

  const pending = (async () => {
    const ordered = await orderReachableHosts(hosts, profile.port);
    let lastErr = new Error("No se pudo conectar a SQL Server");
    for (const host of ordered) {
      try {
        const pool = await mssql.connect(mssqlConfig(host));
        writeProfileState({ lastHost: host });
        return pool;
      } catch (err) {
        lastErr = err;
      }
    }
    throw connectError(ordered, lastErr);
  })();

  poolPromise = pending;
  poolKey = nextKey;
  try {
    return await pending;
  } catch (err) {
    if (poolPromise === pending) {
      poolPromise = null;
      poolKey = "";
    }
    throw err;
  }
}

async function probeStatus() {
  const profile = activeProfile();
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT @@SERVERNAME AS srv, DB_NAME() AS db, SUSER_SNAME() AS login
    `);
    const row = result.recordset[0] ?? {};
    return {
      ok: true,
      profileId: profile.id,
      host: profile.host,
      server: String(row.srv ?? ""),
      database: String(row.db ?? profile.database),
      login: String(row.login ?? ""),
      message: `Conectado a ${row.srv || profile.host} / ${row.db || profile.database}`,
    };
  } catch (err) {
    return {
      ok: false,
      profileId: profile.id,
      host: profile.host,
      server: "",
      database: profile.database,
      login: "",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

function listSqlProfiles() {
  const active = readStoredProfileId();
  return {
    active,
    profiles: profileIds().map((id) => {
      const def = readProfileDef(id);
      return {
        id: def.id,
        label: def.label,
        host: def.host,
        database: def.database,
        auth: def.auth,
      };
    }),
  };
}

async function setSqlProfile(id) {
  const next = String(id ?? "").trim().toLowerCase();
  if (!profileIds().includes(next)) {
    throw new Error(`Perfil SQL desconocido: ${id}`);
  }
  writeStoredProfileId(next);
  await closePool();
  return probeStatus();
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
    lines: [],
  };
}

async function listNavaDocs(payload) {
  const raw = String(payload?.cdocu ?? "").trim();
  if (raw && raw !== "01" && raw !== "03" && raw !== "all") {
    throw new Error("Solo se listan facturas (01) y boletas (03)");
  }
  const kind = !raw || raw === "all" ? "all" : raw;
  const fecha = String(payload?.fecha ?? "").trim().slice(0, 10);
  const ven = cell(payload?.codven);
  const defaultLimit = fecha ? 800 : 150;
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
  if (ven) {
    request.input("ven", ven);
    sql += ` AND RTRIM(codven) = @ven`;
  }
  sql += " ORDER BY fecha DESC, ndocu DESC";

  const result = await request.query(sql);
  const rows = (result.recordset ?? []).map(mapRow);
  if (!fecha || !rows.length) return rows;

  // Detalle de ítems (el monitor/anexo necesitan lines; el header solo trae totales).
  const lineReq = pool.request().input("p3", fecha);
  let lineSql = `
    SELECT
      d.cdocu, d.ndocu, d.item, d.codi, d.descr, d.umed, d.cant, d.preu, d.totn,
      ISNULL(NULLIF(LTRIM(RTRIM(g.nomgru)), ''), 'Otros') AS nomgru
    FROM dtl01fac d WITH (NOLOCK)
    LEFT JOIN tbl01itm i WITH (NOLOCK) ON i.codi = d.codi
    LEFT JOIN tbl01grp g WITH (NOLOCK) ON g.codgru = i.codgru
    WHERE d.cdocu IN ('01','03')
      AND d.fecha >= @p3 AND d.fecha < DATEADD(day, 1, @p3)`;
  if (kind !== "all") {
    lineReq.input("kind", kind);
    lineSql += ` AND d.cdocu = @kind`;
  }
  if (ven) {
    lineReq.input("ven", ven);
    lineSql += ` AND RTRIM(d.codven) = @ven`;
  }
  lineSql += ` ORDER BY d.ndocu, d.item`;

  const lineRes = await lineReq.query(lineSql);
  const byDoc = new Map();
  for (const row of lineRes.recordset ?? []) {
    const key = `${cell(row.cdocu)}|${cell(row.ndocu)}`;
    const list = byDoc.get(key) ?? [];
    list.push({
      codi: cell(row.codi),
      descr: cell(row.descr),
      umed: cell(row.umed),
      cant: money(row.cant),
      preu: money(row.preu),
      totn: money(row.totn),
      nomgru: cell(row.nomgru) || "Otros",
    });
    byDoc.set(key, list);
  }
  for (const doc of rows) {
    doc.lines = byDoc.get(`${doc.cdocu}|${doc.ndocu}`) ?? [];
  }
  return rows;
}

function correlativoNum(ndocu) {
  const raw = cell(ndocu);
  const dash = raw.lastIndexOf("-");
  const digits = (dash >= 0 ? raw.slice(dash + 1) : raw).replace(/\D/g, "");
  return Number(digits) || 0;
}

async function listNavaDayReport(payload) {
  const day = String(typeof payload === "string" ? payload : payload?.fecha ?? "").trim().slice(0, 10);
  const ven = cell(typeof payload === "string" ? "" : payload?.codven);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error("Fecha inválida");
  }
  const venSql = ` AND (@ven = '' OR RTRIM(codven) = @ven)`;
  const pool = await getPool();
  const bind = (req) => req.input("p3", day).input("ven", ven);
  const [docsRes, payRes, seriesRes, artRes, grpRes] = await Promise.all([
    bind(pool.request()).query(`
      SELECT
        SUM(CASE WHEN cdocu = '03' THEN 1 ELSE 0 END) AS boletas,
        SUM(CASE WHEN cdocu = '01' THEN 1 ELSE 0 END) AS facturas,
        COUNT(*) AS total,
        SUM(CASE WHEN LTRIM(RTRIM(CONVERT(varchar(20), flag))) IN ('1','A','X','S') THEN totn ELSE 0 END) AS anulados,
        SUM(totn) AS totn
      FROM mst01fac WITH (NOLOCK)
      WHERE cdocu IN ('01','03') AND fecha >= @p3 AND fecha < DATEADD(day, 1, @p3)${venSql}`),
    bind(pool.request()).query(`
      SELECT
        SUM(CASE WHEN ISNULL(tarjeta,0) = 0 AND ISNULL(banco,0) = 0 THEN totn ELSE 0 END) AS contado,
        SUM(ISNULL(tarjeta,0)) AS tarjeta,
        SUM(ISNULL(banco,0)) AS banco
      FROM mst01fac WITH (NOLOCK)
      WHERE cdocu IN ('01','03') AND fecha >= @p3 AND fecha < DATEADD(day, 1, @p3)${venSql}`),
    bind(pool.request()).query(`
      SELECT cdocu, LEFT(LTRIM(RTRIM(ndocu)), 4) AS serie, COUNT(*) AS n,
             MIN(ndocu) AS mn, MAX(ndocu) AS mx
      FROM mst01fac WITH (NOLOCK)
      WHERE cdocu IN ('01','03') AND fecha >= @p3 AND fecha < DATEADD(day, 1, @p3)${venSql}
      GROUP BY cdocu, LEFT(LTRIM(RTRIM(ndocu)), 4)`),
    bind(pool.request()).query(`
      SELECT TOP 80
        LTRIM(RTRIM(descr)) AS descr,
        SUM(cant) AS qty,
        SUM(totn) AS tot
      FROM dtl01fac WITH (NOLOCK)
      WHERE cdocu IN ('01','03') AND fecha >= @p3 AND fecha < DATEADD(day, 1, @p3)${venSql}
      GROUP BY LTRIM(RTRIM(descr))
      ORDER BY SUM(totn) DESC`),
    bind(pool.request()).query(`
      SELECT TOP 40
        ISNULL(NULLIF(LTRIM(RTRIM(g.nomgru)), ''), 'Otros') AS nomgru,
        SUM(d.totn) AS tot
      FROM dtl01fac d WITH (NOLOCK)
      LEFT JOIN tbl01itm i WITH (NOLOCK) ON i.codi = d.codi
      LEFT JOIN tbl01grp g WITH (NOLOCK) ON g.codgru = i.codgru
      WHERE d.cdocu IN ('01','03') AND d.fecha >= @p3 AND d.fecha < DATEADD(day, 1, @p3)
        AND (@ven = '' OR RTRIM(d.codven) = @ven)
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(g.nomgru)), ''), 'Otros')
      ORDER BY SUM(d.totn) DESC`),
  ]);

  const docsRow = docsRes.recordset?.[0] ?? {};
  const payRow = payRes.recordset?.[0] ?? {};
  const grand = money(docsRow.totn);
  const pickRange = (cdocu) => {
    const rows = (seriesRes.recordset ?? []).filter((row) => cell(row.cdocu) === cdocu);
    if (!rows.length) return { from: 0, to: 0 };
    rows.sort((a, b) => money(b.n) - money(a.n));
    return { from: correlativoNum(rows[0].mn), to: correlativoNum(rows[0].mx) };
  };
  const bol = pickRange("03");
  const fac = pickRange("01");
  const groups = (grpRes.recordset ?? []).map((row) => ({
    group: cell(row.nomgru) || "Otros",
    total: money(row.tot),
    percent: grand > 0 ? (money(row.tot) / grand) * 100 : 0,
  }));
  const articles = (artRes.recordset ?? []).map((row) => ({
    description: cell(row.descr) || "ITEM",
    qty: money(row.qty),
    total: money(row.tot),
  }));

  return {
    docs: {
      boletas: money(docsRow.boletas),
      boletaFrom: bol.from,
      boletaTo: bol.to,
      notas: 0,
      notaFrom: 0,
      notaTo: 0,
      facturas: money(docsRow.facturas),
      facturaFrom: fac.from,
      facturaTo: fac.to,
      anulados: money(docsRow.anulados),
      total: money(docsRow.total),
    },
    monetary: {
      contado: money(payRow.contado),
      credito: 0,
      tarjeta: money(payRow.tarjeta),
      banco: money(payRow.banco),
      cards: [],
      total: grand,
    },
    groups,
    articles,
    grandTotal: grand,
  };
}

function ymd(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

async function listNavaDates(payload) {
  const src = typeof payload === "string" ? { codven: payload } : payload ?? {};
  const ven = cell(src.codven);
  const from = ymd(src.from) || null;
  const to = ymd(src.to) || null;
  const pool = await getPool();
  const request = pool.request().input("ven", ven);
  let rangeSql = "";
  if (from) {
    request.input("from", from);
    rangeSql += " AND fecha >= @from";
  } else {
    rangeSql += " AND fecha >= DATEADD(month, -18, CAST(GETDATE() AS date))";
  }
  if (to) {
    request.input("to", to);
    rangeSql += " AND fecha < DATEADD(day, 1, @to)";
  }
  const result = await request.query(`
    SELECT CONVERT(varchar(10), fecha, 23) AS d,
           SUM(CASE WHEN ISNULL(totn, 0) <> 0 THEN 1 ELSE 0 END) AS conVenta
    FROM mst01fac WITH (NOLOCK)
    WHERE cdocu IN ('01','03')
      ${rangeSql}
      AND (@ven = '' OR RTRIM(codven) = @ven)
    GROUP BY CONVERT(varchar(10), fecha, 23)
    ORDER BY d DESC`);
  const sales = [];
  const opened = [];
  for (const row of result.recordset ?? []) {
    const d = ymd(row.d);
    if (!d) continue;
    if (Number(row.conVenta) > 0) sales.push(d);
    else opened.push(d);
  }
  return { sales, opened };
}

function pad(value, len) {
  return String(value ?? "").trim().padEnd(len).slice(0, len);
}

function nextNdocu(last, serie) {
  const prefix = `${serie}-`;
  const raw = String(last ?? "").trim();
  const n = raw.startsWith(prefix) ? Number(raw.slice(prefix.length)) : Number(raw.replace(/\D/g, "").slice(-7));
  const next = (Number.isFinite(n) ? n : 0) + 1;
  return `${serie}-${String(next).padStart(7, "0")}`;
}

function correlativoFromNdocu(ndocu) {
  const raw = String(ndocu ?? "").trim();
  const dash = raw.lastIndexOf("-");
  const digits = (dash >= 0 ? raw.slice(dash + 1) : raw).replace(/\D/g, "");
  return Number(digits) || 0;
}

/** Último correlativo real en mst01fac (serie B038 / F036). */
async function peekNavaDocSeries() {
  const pool = await getPool();
  const [bol, fac] = await Promise.all([
    pool.request().query(`
      SELECT TOP 1 RTRIM(ndocu) AS ndocu
      FROM mst01fac WITH (NOLOCK)
      WHERE cdocu = '03' AND ndocu LIKE 'B038-%'
      ORDER BY TRY_CAST(RIGHT(RTRIM(ndocu), 7) AS int) DESC`),
    pool.request().query(`
      SELECT TOP 1 RTRIM(ndocu) AS ndocu
      FROM mst01fac WITH (NOLOCK)
      WHERE cdocu = '01' AND ndocu LIKE 'F036-%'
      ORDER BY TRY_CAST(RIGHT(RTRIM(ndocu), 7) AS int) DESC`),
  ]);
  const boletaLast = cell(bol.recordset?.[0]?.ndocu);
  const facturaLast = cell(fac.recordset?.[0]?.ndocu);
  const boletaNum = correlativoFromNdocu(boletaLast);
  const facturaNum = correlativoFromNdocu(facturaLast);
  return {
    boleta: {
      serie: "B038",
      last: boletaLast,
      lastNum: boletaNum,
      next: nextNdocu(boletaLast || "B038-0000000", "B038"),
      nextNum: boletaNum + 1,
    },
    factura: {
      serie: "F036",
      last: facturaLast,
      lastNum: facturaNum,
      next: nextNdocu(facturaLast || "F036-0000000", "F036"),
      nextNum: facturaNum + 1,
    },
  };
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
      .query(`
        SELECT TOP 1 RTRIM(ndocu) AS ndocu
        FROM mst01fac WITH (UPDLOCK, HOLDLOCK)
        WHERE cdocu = @c AND ndocu LIKE @p
        ORDER BY TRY_CAST(RIGHT(RTRIM(ndocu), 7) AS int) DESC`);
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

async function listNavaVendors() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      LTRIM(RTRIM(v.codven)) AS codven,
      LTRIM(RTRIM(v.nomven)) AS nomven,
      LTRIM(RTRIM(CONVERT(varchar(20), v.estado))) AS estado,
      LTRIM(RTRIM(ISNULL(u.Usuario, ''))) AS usuario,
      LTRIM(RTRIM(ISNULL(u.Nombres, ''))) AS nombres
    FROM tbl01ven v WITH (NOLOCK)
    LEFT JOIN TBL_USUARIO u WITH (NOLOCK)
      ON RTRIM(u.Codven) = RTRIM(v.codven) AND LTRIM(RTRIM(CONVERT(varchar(10), u.Estado))) = '1'
    WHERE LTRIM(RTRIM(CONVERT(varchar(20), v.estado))) = '1'
    ORDER BY v.nomven`);
  const seen = new Set();
  return (result.recordset ?? [])
    .map((row) => ({
      codven: cell(row.codven),
      nomven: cell(row.nomven),
      estado: cell(row.estado),
      usuario: cell(row.usuario),
      nombres: cell(row.nombres),
    }))
    .filter((row) => {
      if (!row.codven || seen.has(row.codven)) return false;
      seen.add(row.codven);
      return true;
    });
}

async function navaLogin(payload) {
  const password = String(payload?.password ?? payload?.clave ?? payload?.user ?? "").trim();
  if (!password) {
    throw new Error("Ingrese su clave");
  }
  const pool = await getPool();
  const caja = await pool
    .request()
    .input("pass", password)
    .query(`
      SELECT TOP 1
        LTRIM(RTRIM(f.nomacc)) AS usuario,
        LTRIM(RTRIM(f.nomusu)) AS nombres,
        '' AS apellidos,
        LTRIM(RTRIM(ISNULL(NULLIF(RTRIM(f.codven), ''), ISNULL(v.codven, '')))) AS codven,
        LTRIM(RTRIM(ISNULL(v.nomven, f.nomusu))) AS nomven,
        LTRIM(RTRIM(f.codusu)) AS codusu,
        LTRIM(RTRIM(ISNULL(p.nompto, f.nomusu))) AS nompto,
        LTRIM(RTRIM(ISNULL(a.nomalm, ''))) AS nomalm,
        LTRIM(RTRIM(ISNULL(NULLIF(RTRIM(ISNULL(t.nomtie, '')), ''), ISNULL(s.NomSuc, '')))) AS nomtie
      FROM fcu0000 f WITH (NOLOCK)
      LEFT JOIN tbl01ven v WITH (NOLOCK)
        ON RTRIM(v.codven) = RTRIM(f.codven)
        OR RTRIM(v.nomven) = RTRIM(f.nomusu)
      LEFT JOIN tbl01pto p WITH (NOLOCK) ON RTRIM(p.codpto) = RTRIM(f.codpto)
      LEFT JOIN tbl01alm a WITH (NOLOCK) ON RTRIM(a.codalm) = RTRIM(f.codalm)
      LEFT JOIN tbl_tienda t WITH (NOLOCK) ON RTRIM(t.codtie) = RTRIM(p.codtie)
      LEFT JOIN Tbl_Sucursal s WITH (NOLOCK) ON RTRIM(s.CodSuc) = RTRIM(p.codsuc)
      WHERE ISNULL(f.estado, 0) = 1
        AND RTRIM(f.clausu) = RTRIM(dbo.fn_Encrip(@pass))
      ORDER BY CASE WHEN RTRIM(ISNULL(f.codven, '')) = '' THEN 1 ELSE 0 END, f.nomusu`);
  let row = caja.recordset?.[0];
  if (!row) {
    const office = await pool
      .request()
      .input("pass", password)
      .query(`
        SELECT TOP 1
          LTRIM(RTRIM(u.Usuario)) AS usuario,
          LTRIM(RTRIM(ISNULL(u.Nombres, ''))) AS nombres,
          LTRIM(RTRIM(ISNULL(u.Apellidos, ''))) AS apellidos,
          LTRIM(RTRIM(ISNULL(u.Codven, ''))) AS codven,
          LTRIM(RTRIM(ISNULL(v.nomven, ''))) AS nomven,
          LTRIM(RTRIM(ISNULL(u.codusu, ''))) AS codusu,
          LTRIM(RTRIM(ISNULL(v.nomven, ''))) AS nompto,
          '' AS nomalm,
          '' AS nomtie
        FROM TBL_USUARIO u WITH (NOLOCK)
        LEFT JOIN tbl01ven v WITH (NOLOCK) ON RTRIM(v.codven) = RTRIM(u.Codven)
        WHERE LTRIM(RTRIM(CONVERT(varchar(10), u.Estado))) = '1'
          AND LTRIM(RTRIM(u.Clave)) = @pass
        ORDER BY CASE WHEN RTRIM(ISNULL(u.Codven, '')) = '' THEN 1 ELSE 0 END, u.Usuario`);
    row = office.recordset?.[0];
  }
  if (!row) throw new Error("Clave incorrecta");
  return {
    usuario: cell(row.usuario),
    nombres: cell(row.nombres),
    apellidos: cell(row.apellidos),
    codven: cell(row.codven),
    nomven: cell(row.nomven),
    codusu: cell(row.codusu),
    nompto: cell(row.nompto),
    nomalm: cell(row.nomalm),
    nomtie: cell(row.nomtie),
  };
}

module.exports = {
  listNavaDocs,
  listNavaDates,
  listNavaDayReport,
  insertNavaSale,
  peekNavaDocSeries,
  warmupSql,
  listSqlProfiles,
  setSqlProfile,
  getSqlStatus: probeStatus,
  listNavaVendors,
  navaLogin,
};
