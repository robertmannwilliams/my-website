// The "paper & ink" Mapbox style — DESIGN.md §The map.
// A plate from a vintage atlas: cream land, recessed-paper water with a
// sea-glass teal wash and ink coastlines, a soft teal band hugging the
// shore at plate zooms, dashed drafting borders, a faint graticule, and a
// three-tier settlement label hierarchy (cities > towns > villages) in
// Newsreader (self-hosted SDF glyphs in public/map-fonts/).
// No satellite, no terrain, no POIs, no roads.

import type { StyleSpecification } from "mapbox-gl";

const PAPER = "#F8F4E9";
const PAPER_SHADE = "#EFE9D8";
const INK = "#2B4A8C";
const INK_STRONG = "#1C3263";
const INK_FAINT = "#9DACC9";
const TEAL = "#4E7E74";

const SERIF = ["Newsreader Regular"];
const SERIF_ITALIC = ["Newsreader Italic"];

/** Mapbox worldview filter: keep features tagged for all/US worldviews. */
const WORLDVIEW = [
  "match",
  ["get", "worldview"],
  ["all", "US"],
  true,
  false,
] as const;

/** Graticule lines every 10° as a GeoJSON source (atlas-plate ruling). */
function buildGraticule(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let lng = -180; lng <= 180; lng += 10) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[lng, -80], [lng, 80]] },
    });
  }
  for (let lat = -80; lat <= 80; lat += 10) {
    const coords: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 5) coords.push([lng, lat]);
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coords },
    });
  }
  return { type: "FeatureCollection", features };
}

/**
 * Build the style. `glyphsOrigin` is the site origin serving
 * /map-fonts/{fontstack}/{range}.pbf (window.location.origin at runtime).
 */
export function buildPaperStyle(glyphsOrigin: string): StyleSpecification {
  return {
    version: 8,
    name: "Engineer's Sketchbook",
    projection: { name: "mercator" },
    glyphs: `${glyphsOrigin}/map-fonts/{fontstack}/{range}.pbf`,
    sources: {
      streets: {
        type: "vector",
        url: "mapbox://mapbox.mapbox-streets-v8",
      },
      graticule: {
        type: "geojson",
        data: buildGraticule(),
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": PAPER },
      },
      {
        id: "water",
        type: "fill",
        source: "streets",
        "source-layer": "water",
        paint: { "fill-color": PAPER_SHADE },
      },
      {
        // Sea-glass: a faint teal watercolor over the recessed paper.
        id: "water-tint",
        type: "fill",
        source: "streets",
        "source-layer": "water",
        paint: { "fill-color": TEAL, "fill-opacity": 0.07 },
      },
      {
        // Ruled over land AND water, like a printed plate.
        id: "graticule",
        type: "line",
        source: "graticule",
        maxzoom: 6,
        paint: {
          "line-color": INK_FAINT,
          "line-width": 0.5,
          "line-opacity": [
            "interpolate", ["linear"], ["zoom"],
            3, 0.55,
            5.5, 0,
          ],
        },
      },
      {
        // The hand-tinted plate edge: a soft teal band hugging the shore.
        // Gone by z8 so it never rings inland ponds.
        id: "coast-band",
        type: "line",
        source: "streets",
        "source-layer": "water",
        maxzoom: 8,
        paint: {
          "line-color": TEAL,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 4, 7, 8],
          "line-blur": 4,
          "line-opacity": [
            "interpolate", ["linear"], ["zoom"],
            1, 0.16,
            6.5, 0.13,
            8, 0,
          ],
        },
      },
      {
        // The ink coastline. Softens at mid zoom so inland pond/river
        // polygons stop shouting over the data marks.
        id: "water-edge",
        type: "line",
        source: "streets",
        "source-layer": "water",
        paint: {
          "line-color": INK,
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 0.6,
            8, 0.8,
            12, 1.1,
          ],
          "line-opacity": [
            "interpolate", ["linear"], ["zoom"],
            1, 0.95,
            6, 0.85,
            8, 0.5,
            12, 0.42,
          ],
        },
      },
      {
        id: "waterway",
        type: "line",
        source: "streets",
        "source-layer": "waterway",
        minzoom: 8,
        paint: {
          "line-color": INK,
          "line-opacity": 0.35,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 12, 1],
        },
      },
      {
        id: "admin-1",
        type: "line",
        source: "streets",
        "source-layer": "admin",
        minzoom: 5,
        filter: [
          "all",
          ["==", ["get", "admin_level"], 1],
          ["==", ["get", "maritime"], "false"],
          WORLDVIEW as unknown as boolean,
        ],
        paint: {
          "line-color": INK_FAINT,
          "line-width": 0.6,
          "line-dasharray": [2, 2.5],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 6, 0.8],
        },
      },
      {
        id: "admin-0",
        type: "line",
        source: "streets",
        "source-layer": "admin",
        filter: [
          "all",
          ["==", ["get", "admin_level"], 0],
          ["==", ["get", "maritime"], "false"],
          WORLDVIEW as unknown as boolean,
        ],
        paint: {
          "line-color": INK,
          // Drafting dash-dot convention for country borders.
          "line-dasharray": [4, 2, 1, 2],
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 5, 0.9],
          "line-opacity": 0.85,
        },
      },
      {
        id: "marine-label",
        type: "symbol",
        source: "streets",
        "source-layer": "natural_label",
        filter: [
          "all",
          ["match", ["get", "class"], ["ocean", "sea"], true, false],
          ["<=", ["get", "filterrank"], 2],
        ],
        layout: {
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": SERIF_ITALIC as unknown as string[],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            1, ["match", ["get", "class"], "ocean", 13, 10],
            5, ["match", ["get", "class"], "ocean", 20, 14],
          ],
          "text-letter-spacing": 0.18,
          "text-max-width": 6,
        },
        paint: {
          "text-color": INK,
          "text-opacity": 0.55,
        },
      },
      {
        id: "village-label",
        type: "symbol",
        source: "streets",
        "source-layer": "place_label",
        minzoom: 10.75,
        maxzoom: 15,
        filter: [
          "all",
          ["==", ["get", "class"], "settlement"],
          WORLDVIEW as unknown as boolean,
          [">=", ["get", "symbolrank"], 12],
          // Trickle in by rank so the sheet never floods at once.
          [
            "step", ["zoom"],
            ["<=", ["get", "symbolrank"], 13],
            11.75, ["<=", ["get", "symbolrank"], 15],
            12.75, true,
          ],
        ],
        layout: {
          "symbol-sort-key": ["get", "symbolrank"],
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": SERIF_ITALIC as unknown as string[],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            10.75, 10.5,
            13, 13,
          ],
          "text-letter-spacing": 0.03,
          "text-max-width": 8,
          "text-padding": 10,
        },
        paint: {
          "text-color": INK,
          "text-opacity": 0.62,
          "text-halo-color": PAPER,
          "text-halo-width": 1,
        },
      },
      {
        id: "town-label",
        type: "symbol",
        source: "streets",
        "source-layer": "place_label",
        minzoom: 6,
        maxzoom: 14,
        filter: [
          "all",
          ["==", ["get", "class"], "settlement"],
          WORLDVIEW as unknown as boolean,
          [">=", ["get", "symbolrank"], 9],
          ["<=", ["get", "symbolrank"], 11],
        ],
        layout: {
          "symbol-sort-key": ["get", "symbolrank"],
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": SERIF as unknown as string[],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            6, 10.5,
            10, 12.5,
            13, 14.5,
          ],
          "text-letter-spacing": 0.04,
          "text-max-width": 8,
          "text-padding": 6,
        },
        paint: {
          "text-color": INK,
          "text-opacity": 0.85,
          "text-halo-color": PAPER,
          "text-halo-width": 1,
        },
      },
      {
        id: "city-label",
        type: "symbol",
        source: "streets",
        "source-layer": "place_label",
        minzoom: 3.5,
        maxzoom: 14,
        filter: [
          "all",
          ["==", ["get", "class"], "settlement"],
          WORLDVIEW as unknown as boolean,
          ["<=", ["get", "symbolrank"], 8],
        ],
        layout: {
          "symbol-sort-key": ["get", "symbolrank"],
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": SERIF as unknown as string[],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            4, 12,
            8, 15,
            11, 17,
          ],
          "text-letter-spacing": 0.06,
          "text-max-width": 8,
          "text-padding": 3,
        },
        paint: {
          "text-color": INK_STRONG,
          "text-halo-color": PAPER,
          "text-halo-width": 1.1,
        },
      },
      {
        id: "country-label",
        type: "symbol",
        source: "streets",
        "source-layer": "place_label",
        minzoom: 1,
        maxzoom: 8,
        filter: [
          "all",
          ["==", ["get", "class"], "country"],
          WORLDVIEW as unknown as boolean,
          [
            "step", ["zoom"],
            ["<=", ["get", "symbolrank"], 3],
            2.5, ["<=", ["get", "symbolrank"], 5],
            4, true,
          ],
        ],
        layout: {
          "symbol-sort-key": ["get", "symbolrank"],
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": SERIF as unknown as string[],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.22,
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            1.5, 9.5,
            4, 13,
            7, 16,
          ],
          "text-max-width": 7,
        },
        paint: {
          "text-color": INK_STRONG,
          "text-halo-color": PAPER,
          "text-halo-width": 1,
        },
      },
      // ---- Settlement labels: a three-tier atlas hierarchy. A vintage
      // plate shows a few names in distinct voices, not a gazetteer wall:
      // the metro anchor largest in ink-strong, towns quieter, villages
      // small italic and late — lower ranks always lose the fight for
      // space. Tier cuts calibrated against streets-v8 symbolrank (Boston
      // metro: Boston 7, Worcester/Cambridge 10-11, suburbs 12-14).
    ],
  };
}
