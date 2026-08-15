export type Client = {
  document: string;
  name: string;
  type: "dni" | "ruc";
};

/** Clientes demo — TODO: cargar desde API / SQL Server */
const CLIENTS: Client[] = [
  { document: "10662001", name: "GOMEZ SANCHEZ RAMIREZ RUBEN", type: "dni" },
  { document: "20017057", name: "DURAND BERNARDO JAIME", type: "dni" },
  { document: "41047219", name: "VALERIO FLORES FRANK NILO", type: "dni" },
  { document: "42181494", name: "MALDONADO CABALLERO ROBERT JOCELYN", type: "dni" },
  { document: "42190446", name: "PONCE ALEJOS ROBERT SANTOS", type: "dni" },
  { document: "43299362", name: "HUAMANI TUEROS NATALI FELICITA", type: "dni" },
  { document: "43666849", name: "FERNANDEZ SALCEDO ANA KARINA", type: "dni" },
  { document: "45275775", name: "REYES HURTADO ANGEL HUMBERTO", type: "dni" },
  { document: "45373298", name: "TEMOCHE NOVOA CRISTINA DEL CARMEN", type: "dni" },
  { document: "45483074", name: "NASSI SOSA CARLOS ALFREDO", type: "dni" },
  { document: "45565694", name: "IZAGUIRRE DAMIAN DIANA CAROLINA", type: "dni" },
  { document: "45714514", name: "PEZO LOPEZ RODRIGO ALESSANDRO", type: "dni" },
  { document: "45898069", name: "MENDOZA CESPEDES LUCIANA CAROLINA", type: "dni" },
  { document: "46082789", name: "JUSCAMAITA HUARANCCA PATRICIA JANET", type: "dni" },
  { document: "46156549", name: "CHAVEZ FIGUEROA OSWALDO ANDRES", type: "dni" },
  { document: "46389201", name: "QUISPE MAMANI ROSA ELVIRA", type: "dni" },
  { document: "46512374", name: "TORRES AUCCA MIGUEL ANGEL", type: "dni" },
  { document: "46784230", name: "LLANOS GUTIERREZ PAOLA BEATRIZ", type: "dni" },
  { document: "47021856", name: "SALAZAR HERRERA JUAN PABLO", type: "dni" },
  { document: "20601234567", name: "DISTRIBUIDORA LOS ANDES S.A.C.", type: "ruc" },
  { document: "20512345678", name: "IMPORTACIONES DEL PACIFICO E.I.R.L.", type: "ruc" },
  { document: "20498765432", name: "COMERCIAL SANTA ROSA S.R.L.", type: "ruc" },
];

const CLIENTS_SORTED: Client[] = [...CLIENTS].sort((a, b) => a.document.localeCompare(b.document));

const CLIENTS_BY_DOC = new Map<string, Client>();
for (const client of CLIENTS) {
  CLIENTS_BY_DOC.set(client.document, client);
}

type IndexedClient = Client & { nameLower: string };
const INDEXED_CLIENTS: IndexedClient[] = CLIENTS_SORTED.map((c) => ({
  ...c,
  nameLower: c.name.toLowerCase(),
}));

export function getClients(): Client[] {
  return CLIENTS_SORTED;
}

export function getClientByDocument(document: string): Client | undefined {
  return CLIENTS_BY_DOC.get(document.replace(/\D/g, ""));
}

export function searchClients(query: string): Client[] {
  const q = query.trim().toLowerCase();
  if (!q) return CLIENTS_SORTED;
  return INDEXED_CLIENTS.filter((c) => c.document.includes(q) || c.nameLower.includes(q));
}
