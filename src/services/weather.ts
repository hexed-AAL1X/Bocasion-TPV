import { fetchExternalJson } from "../utils/fetchExternalJson";
import { isElectronApp } from "../utils/electronExport";

export type LocalWeather = {
  temp: string;
  desc: string;
  icon: string;
  locality: string;
};

type Coordinates = { lat: number; lon: number; locality?: string };

const GEO_TIMEOUT_MS = 12_000;
const REFRESH_MS = 600_000;

/** Lima — fallback si la geolocalización por IP falla */
const DEFAULT_COORDS: Coordinates = { lat: -12.0464, lon: -77.0428, locality: "Lima" };

function wmoToIcon(code: number): string {
  if (code === 0) return "sun";
  if (code <= 3) return "cloud-sun";
  if (code === 45 || code === 48) return "cloud-fog";
  if (code >= 51 && code <= 67) return "cloud-rain";
  if (code >= 80 && code <= 99) return "cloud-rain";
  return "cloud";
}

const WMO_DESC_ES: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla",
  51: "Llovizna",
  53: "Llovizna",
  55: "Llovizna",
  61: "Lluvia",
  63: "Lluvia",
  65: "Lluvia fuerte",
  71: "Nieve",
  80: "Chubascos",
  95: "Tormenta",
};

function wmoToDesc(code: number): string {
  return WMO_DESC_ES[code] ?? "Nublado";
}

function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalización no disponible"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (err) => reject(err),
      {
        enableHighAccuracy: false,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 300_000,
      },
    );
  });
}

type IpApiResponse = {
  status?: string;
  lat?: number;
  lon?: number;
  city?: string;
  regionName?: string;
};

async function resolveCoordsByIp(): Promise<Coordinates> {
  const data = await fetchExternalJson<IpApiResponse>(
    "http://ip-api.com/json/?fields=status,lat,lon,city,regionName",
  );
  if (data?.status === "success" && data.lat != null && data.lon != null) {
    const parts = [data.city, data.regionName].filter((p): p is string => Boolean(p?.trim()));
    return {
      lat: data.lat,
      lon: data.lon,
      locality: parts.length > 0 ? parts.join(", ") : undefined,
    };
  }
  return DEFAULT_COORDS;
}

export async function resolveCoordinates(): Promise<Coordinates> {
  if (isElectronApp()) {
    return resolveCoordsByIp();
  }
  try {
    return await getCurrentPosition();
  } catch {
    return resolveCoordsByIp();
  }
}

async function fetchOpenMeteoWeather(
  lat: number,
  lon: number,
): Promise<{ temp: string; icon: string; desc: string }> {
  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;

  const data = await fetchExternalJson<{
    current?: { temperature_2m?: number; weather_code?: number };
  }>(url);

  const temp = data?.current?.temperature_2m;
  const code = data?.current?.weather_code ?? 3;

  if (temp == null) throw new Error("Sin datos de temperatura");

  return {
    temp: String(Math.round(temp)),
    icon: wmoToIcon(code),
    desc: wmoToDesc(code),
  };
}

export async function fetchLocalWeather(coords: Coordinates): Promise<LocalWeather> {
  const weather = await fetchOpenMeteoWeather(coords.lat, coords.lon);
  return {
    ...weather,
    locality: coords.locality ?? "Ubicación actual",
  };
}

export async function loadLocalWeather(): Promise<LocalWeather> {
  const coords = await resolveCoordinates();
  return fetchLocalWeather(coords);
}

export { REFRESH_MS };
