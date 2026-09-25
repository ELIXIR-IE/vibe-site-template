// Geometry for the "flow cell island" mark: a simplified coastline of the
// whole island of Ireland, projected into a 64 x 64 box, filled with
// hex-packed wells like a sequencing flow cell.

// [lon, lat], clockwise from Malin Head. Hand-listed and simplified.
export const COAST = [
  [-7.37, 55.38], [-7.1, 55.3], [-6.93, 55.23], [-7.12, 55.07], [-6.95, 55.17],
  [-6.72, 55.18], [-6.51, 55.24], [-6.15, 55.22], [-6.05, 55.12], [-5.95, 54.97],
  [-5.72, 54.84], [-5.92, 54.64], [-5.62, 54.66], [-5.47, 54.55], [-5.5, 54.38],
  [-5.64, 54.23], [-5.88, 54.23], [-6.05, 54.03], [-6.2, 54.07], [-6.1, 53.98],
  [-6.38, 53.97], [-6.22, 53.79], [-6.15, 53.6], [-6.06, 53.39], [-6.22, 53.34],
  [-6.09, 53.22], [-5.99, 52.96], [-6.14, 52.79], [-6.2, 52.56], [-6.36, 52.33],
  [-6.35, 52.17], [-6.6, 52.17], [-6.93, 52.13], [-7.0, 52.22], [-7.15, 52.14],
  [-7.58, 52.07], [-7.85, 51.94], [-8.02, 51.82], [-8.26, 51.79], [-8.53, 51.6],
  [-8.95, 51.54], [-9.37, 51.48], [-9.82, 51.44], [-9.58, 51.58], [-9.85, 51.55],
  [-9.47, 51.69], [-10.22, 51.6], [-9.65, 51.85], [-10.36, 51.78], [-10.4, 51.92],
  [-9.85, 52.1], [-10.48, 52.1], [-10.22, 52.28], [-9.82, 52.26], [-9.94, 52.42],
  [-9.62, 52.53], [-9.0, 52.62], [-9.5, 52.63], [-9.93, 52.56], [-9.44, 52.86],
  [-9.44, 52.98], [-9.25, 53.14], [-8.96, 53.18], [-9.07, 53.26], [-9.55, 53.25],
  [-10.2, 53.4], [-10.02, 53.61], [-9.78, 53.63], [-9.82, 53.78], [-9.55, 53.82],
  [-10.26, 53.97], [-10.03, 54.1], [-10.0, 54.3], [-9.35, 54.32], [-9.2, 54.21],
  [-8.95, 54.29], [-8.52, 54.28], [-8.45, 54.47], [-8.13, 54.62], [-8.8, 54.64],
  [-8.76, 54.72], [-8.45, 54.95], [-8.28, 55.16], [-7.98, 55.22], [-7.72, 55.18],
  [-7.63, 55.28], [-7.57, 55.06], [-7.51, 55.28],
];

const LAT0 = Math.cos((53.4 * Math.PI) / 180);
const lons = COAST.map((p) => p[0]);
const lats = COAST.map((p) => p[1]);
const minLon = Math.min(...lons);
const maxLat = Math.max(...lats);
const K = 58 / (maxLat - Math.min(...lats));
const OX = (64 - (Math.max(...lons) - minLon) * LAT0 * K) / 2;
const OY = 3;

/** Longitude/latitude to 64 x 64 mark coordinates. */
export function project(lon, lat) {
  return [OX + (lon - minLon) * LAT0 * K, OY + (maxLat - lat) * K];
}

const POLY = COAST.map(([lon, lat]) => project(lon, lat));
const r1 = (n) => Math.round(n * 10) / 10;

/** Closed Catmull-Rom spline through the coastline, as SVG path data. */
export function islandPath() {
  const n = POLY.length;
  const t = 0.5;
  let d = `M${r1(POLY[0][0])} ${r1(POLY[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = POLY[(i - 1 + n) % n], p1 = POLY[i], p2 = POLY[(i + 1) % n], p3 = POLY[(i + 2) % n];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d + "Z";
}

function inside(x, y) {
  let c = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [xi, yi] = POLY[i], [xj, yj] = POLY[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function edgeDistance(x, y) {
  let best = Infinity;
  for (let i = 0; i < POLY.length; i++) {
    const [ax, ay] = POLY[i], [bx, by] = POLY[(i + 1) % POLY.length];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

export const WELL_SPACING = 3.0;
export const WELL_RADIUS = 1.0;

/**
 * Hex-packed wells inside the island. Each well has a signal level (for
 * opacity) from a smooth field, and the list of campuses that light it.
 * @param {{ label: string, lat: number, lon: number }[]} campuses
 */
export function wells(campuses) {
  const S = WELL_SPACING;
  const list = [];
  for (let row = 0, y = 2; y < 64; row++, y += S * 0.866) {
    for (let x = 1 + (row % 2 ? S / 2 : 0); x < 64; x += S) {
      if (!inside(x, y) || edgeDistance(x, y) <= 0.45) continue;
      const v = 0.5 + 0.5 * Math.sin(x * 0.23 + 1.3) * Math.cos(y * 0.19 - 0.4);
      list.push({ x: r1(x), y: r1(y), level: Math.round((0.3 + 0.6 * v) * 100) / 100, campuses: [] });
    }
  }
  for (const c of campuses) {
    const [px, py] = project(c.lon, c.lat);
    let best = list[0];
    for (const w of list) {
      if (Math.hypot(w.x - px, w.y - py) < Math.hypot(best.x - px, best.y - py)) best = w;
    }
    best.campuses.push(c.label);
  }
  return list;
}
