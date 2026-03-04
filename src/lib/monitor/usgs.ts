export interface UsgsEarthquake {
  id: string;
  title: string;
  magnitude: number;
  magType: string;
  depth: number;
  lat: number;
  lng: number;
  place: string;
  timestamp: string;
  tsunami: boolean;
  felt: number | null;
  significance: number;
  alert: string | null;
  url: string;
}

interface UsgsFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number, number]; // [lng, lat, depth_km]
  };
  properties: {
    mag: number;
    magType: string;
    place: string;
    time: number; // ms epoch
    updated: number;
    tsunami: number; // 0 or 1
    felt: number | null;
    sig: number;
    alert: string | null;
    url: string;
    title: string;
    type: string;
    [key: string]: unknown;
  };
}

interface UsgsResponse {
  type: 'FeatureCollection';
  features: UsgsFeature[];
  metadata: {
    generated: number;
    url: string;
    title: string;
    count: number;
  };
}

export async function fetchEarthquakes(): Promise<UsgsEarthquake[]> {
  const url =
    'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.5&limit=100&orderby=time';

  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { 'User-Agent': 'GlobalMonitor/1.0' },
  });

  if (!res.ok) throw new Error(`USGS ${res.status}`);

  const data: UsgsResponse = await res.json();

  return (data.features || [])
    .filter((f) => f.properties.type === 'earthquake' && f.geometry?.coordinates?.length >= 2)
    .map((f) => {
      const [lng, lat, depth] = f.geometry.coordinates;
      const p = f.properties;

      return {
        id: f.id,
        title: p.title,
        magnitude: p.mag,
        magType: p.magType || 'ml',
        depth: depth ?? 0,
        lat,
        lng,
        place: p.place || 'Unknown location',
        timestamp: new Date(p.time).toISOString(),
        tsunami: p.tsunami === 1,
        felt: p.felt,
        significance: p.sig,
        alert: p.alert,
        url: p.url,
      };
    });
}
