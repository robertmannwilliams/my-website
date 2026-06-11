// Variant selection per hero/HERO.md Behavior §3: time of day from the
// visitor's clock, weather from coarse IP geo (via /api/hero-geo, which reads
// Vercel's geo headers) fed to Open-Meteo. Everything is bounded by a 1s
// timeout and falls back through NYC → master. The variant is decided once,
// before the first stroke lands — never swapped mid-session.

const NYC = { lat: 40.71, lng: -74.01, city: "New York" };
const WEATHER_CACHE_KEY = "heroWeather.v1";
const CACHE_MS = 30 * 60 * 1000;

interface Geo {
  lat: number;
  lng: number;
  city: string;
}

/** Open-Meteo WMO weather codes. */
function classifyWeather(code: number): "snow" | "rain" | null {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  ) {
    return "rain";
  }
  return null;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function visitorGeo(): Promise<Geo> {
  const res = await fetchWithTimeout("/api/hero-geo", 700);
  if (res?.ok) {
    try {
      const g = await res.json();
      if (typeof g.lat === "number" && typeof g.lng === "number") {
        return { lat: g.lat, lng: g.lng, city: g.city || NYC.city };
      }
    } catch {
      /* fall through */
    }
  }
  return NYC;
}

async function currentWeather(geo: Geo): Promise<"snow" | "rain" | null> {
  try {
    const cached = sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const { t, w } = JSON.parse(cached);
      if (Date.now() - t < CACHE_MS) return w;
    }
  } catch {
    /* storage unavailable */
  }
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat.toFixed(2)}` +
    `&longitude=${geo.lng.toFixed(2)}&current=weather_code`;
  const res = await fetchWithTimeout(url, 1000);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const w = classifyWeather(Number(data?.current?.weather_code));
    try {
      sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ t: Date.now(), w }));
    } catch {
      /* ignore */
    }
    return w;
  } catch {
    return null;
  }
}

/**
 * Decide the variant. `available` is the variant list shipped in strokes.bin;
 * the fallback chain (snow→rain, nocturne→dusk, fireworks→skip) only ever
 * lands on shipped fields. Resolves within ~1.2s worst case.
 */
export async function pickVariant(available: string[]): Promise<{ variant: string; city: string }> {
  const has = (v: string) => available.includes(v);
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const night = hour >= 21 || hour < 6;
  const evening = hour >= 16.5 && hour < 21;
  const july4 = now.getMonth() === 6 && now.getDate() === 4;

  let weather: "snow" | "rain" | null = null;
  let city = NYC.city;
  try {
    const geo = await visitorGeo();
    city = geo.city;
    weather = await currentWeather(geo);
  } catch {
    /* default master */
  }

  let variant = "master";
  if (weather === "snow") variant = has("snow") ? "snow" : has("rain") ? "rain" : "master";
  else if (weather === "rain") variant = has("rain") ? "rain" : "master";
  else if (july4 && (night || evening)) variant = has("fireworks") ? "fireworks" : has("dusk") ? "dusk" : "master";
  else if (night) variant = has("nocturne") ? "nocturne" : has("dusk") ? "dusk" : "master";
  else if (evening) variant = has("dusk") ? "dusk" : "master";

  return { variant, city };
}
