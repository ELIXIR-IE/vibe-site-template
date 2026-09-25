#!/usr/bin/env node
// Builds every logo file from data/brand/campuses.yml and data/site.yml:
//
//   public/logo/vibe-mark.svg            the mark alone (follows light/dark)
//   public/logo/vibe-logo-full.svg       mark + name + two-line subtitle
//   public/logo/vibe-logo.svg            mark + name
//   public/logo/*-dark.svg               the same, for dark backgrounds
//   public/logo/*.png                    PNG copies for slides and documents
//   public/logo/favicon-32.png, apple-touch-icon.png, og-image.png
//   src/generated/brand.json             wells and campuses for the site
//
// Text is converted to outlines, so the SVG files look the same everywhere,
// with or without the fonts installed. Runs automatically before every build.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { load, CORE_SCHEMA } from "js-yaml";
import opentype from "opentype.js";
import sharp from "sharp";
import { islandPath, wells, WELL_RADIUS } from "./brand/ireland.mjs";
import { formatRange } from "../src/lib/dates.mjs";
import { twoLines } from "../src/lib/text.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "logo");
const GEN = join(ROOT, "src", "generated");
mkdirSync(OUT, { recursive: true });
mkdirSync(GEN, { recursive: true });

const yaml = (f) => load(readFileSync(join(ROOT, "data", f), "utf8"), { schema: CORE_SCHEMA });
const site = yaml("site.yml");
const institutions = yaml("brand/campuses.yml") ?? [];

// Brand colours. Keep in step with src/styles/tokens.css.
const LIGHT = { well: "#0E6B6B", bed: "#D5ECE9", hit: "#E8604C", name: "#0E6B6B", sub: "#5B6770", bg: "#FFFFFF", text: "#1F2A30" };
const DARK = { well: "#5CC8C0", bed: "#15383A", hit: "#F07A64", name: "#E4EEEE", sub: "#9AAAB0", bg: "#0C1719", text: "#E4EEEE" };

// ---- geometry -------------------------------------------------------------
const campuses = [];
for (const inst of institutions) {
  for (const c of inst.campuses ?? []) {
    if (typeof c.lat !== "number" || typeof c.lon !== "number") {
      console.error(`build-logo: data/brand/campuses.yml → ${inst.name} / ${c.name}: lat and lon must be numbers`);
      process.exit(1);
    }
    campuses.push({ label: `${inst.name} (${c.name})`, lat: c.lat, lon: c.lon, institution: inst.name });
  }
}
const island = islandPath();
const cells = wells(campuses);
const hitR = WELL_RADIUS + 0.3;

function markBody(p) {
  let s = `<path d="${island}" fill="${p.bed}"/>`;
  for (const w of cells) {
    s += w.campuses.length
      ? `<circle cx="${w.x}" cy="${w.y}" r="${hitR}" fill="${p.hit}"/>`
      : `<circle cx="${w.x}" cy="${w.y}" r="${WELL_RADIUS}" fill="${p.well}" fill-opacity="${w.level}"/>`;
  }
  return s;
}

function adaptiveMark() {
  let s = `<path class="b" d="${island}"/>`;
  for (const w of cells) {
    s += w.campuses.length
      ? `<circle class="h" cx="${w.x}" cy="${w.y}" r="${hitR}"/>`
      : `<circle class="w" cx="${w.x}" cy="${w.y}" r="${WELL_RADIUS}" fill-opacity="${w.level}"/>`;
  }
  const css = `.b{fill:${LIGHT.bed}}.w{fill:${LIGHT.well}}.h{fill:${LIGHT.hit}}` +
    `@media (prefers-color-scheme:dark){.b{fill:${DARK.bed}}.w{fill:${DARK.well}}.h{fill:${DARK.hit}}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><title>${esc(site.event.short_name)} mark</title><style>${css}</style>${s}</svg>\n`;
}

// ---- text to outlines -----------------------------------------------------
function font(pkg, file) {
  const b = readFileSync(join(ROOT, "node_modules", "@fontsource", pkg, "files", file));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const DISPLAY = font("bricolage-grotesque", "bricolage-grotesque-latin-800-normal.woff");
const BODY_SEMI = font("figtree", "figtree-latin-600-normal.woff");
const BODY_MED = font("figtree", "figtree-latin-500-normal.woff");

// Serialise glyph commands ourselves, closing every contour explicitly.
// (opentype.js's toPathData drops closing segments, and librsvg then stops
// drawing partway through a line.)
const n2 = (v) => +v.toFixed(2);
function pathData(commands) {
  let d = "";
  let open = false;
  for (const c of commands) {
    if (c.type === "M") { if (open) d += "Z"; d += `M${n2(c.x)} ${n2(c.y)}`; open = true; }
    else if (c.type === "L") d += `L${n2(c.x)} ${n2(c.y)}`;
    else if (c.type === "Q") d += `Q${n2(c.x1)} ${n2(c.y1)} ${n2(c.x)} ${n2(c.y)}`;
    else if (c.type === "C") d += `C${n2(c.x1)} ${n2(c.y1)} ${n2(c.x2)} ${n2(c.y2)} ${n2(c.x)} ${n2(c.y)}`;
    else if (c.type === "Z") { d += "Z"; open = false; }
  }
  return open ? d + "Z" : d;
}

/** Outline a string. tracking is extra space per letter, in em. */
function text(f, str, x, y, size, tracking = 0) {
  const scale = size / f.unitsPerEm;
  const glyphs = [...str].map((ch) => f.charToGlyph(ch));
  let d = "";
  let cx = x;
  glyphs.forEach((g, i) => {
    d += pathData(g.getPath(cx, y, size).commands);
    cx += g.advanceWidth * scale;
    if (i < glyphs.length - 1) cx += f.getKerningValue(g, glyphs[i + 1]) * scale + tracking * size;
  });
  return { d, width: cx - x };
}
function measure(f, str, size, tracking = 0) {
  return text(f, str, 0, 0, size, tracking).width;
}
/** Largest size up to max at which str fits in width. */
function fit(f, str, max, width, tracking = 0) {
  const w = measure(f, str, max, tracking);
  return w <= width ? max : Math.floor((max * width) / w);
}

const NAME = site.event.short_name;
const SUB = twoLines(site.event.full_name).map((s) => s.toUpperCase());

function lockup(kind, p) {
  const x = 75;
  let body = `<g>${markBody(p)}</g>`;
  let width;
  if (kind === "full") {
    const n = text(DISPLAY, NAME, x, 33, 38);
    const s1 = text(BODY_SEMI, SUB[0], x + 1, 47, 9, 0.08);
    const s2 = text(BODY_SEMI, SUB[1], x + 1, 58, 9, 0.08);
    body += `<path d="${n.d}" fill="${p.name}"/><path d="${s1.d}${s2.d}" fill="${p.sub}"/>`;
    width = Math.ceil(x + Math.max(n.width, s1.width + 1, s2.width + 1) + 2);
  } else {
    const n = text(DISPLAY, NAME, x - 1, 46.5, 44);
    body += `<path d="${n.d}" fill="${p.name}"/>`;
    width = Math.ceil(x - 1 + n.width + 2);
  }
  const title = kind === "full" ? `${NAME}: ${site.event.full_name}` : NAME;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 64" width="${width * 2}" height="128"><title>${esc(title)}</title>${body}</svg>\n`;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---- social card (1200 x 630) ----------------------------------------------
function ogImage() {
  const p = LIGHT;
  const colX = 560, colW = 580;
  const title = site.event.title;
  const tSize = fit(DISPLAY, title, 104, colW);
  const nSize = fit(BODY_SEMI, site.event.full_name, 34, colW);
  const when = `${formatRange(site.event.start_date, site.event.end_date)}`;
  const how = site.event.format_label ?? "";
  const org = site.host?.name ? `Hosted by ${site.host.name}` : "";
  const parts = [
    `<path d="${text(DISPLAY, title, colX, 260, tSize).d}" fill="${p.name}"/>`,
    `<path d="${text(BODY_SEMI, site.event.full_name, colX, 316, nSize).d}" fill="${p.sub}"/>`,
    `<rect x="${colX}" y="370" width="56" height="6" rx="3" fill="${p.hit}"/>`,
    `<path d="${text(BODY_SEMI, when, colX, 432, fit(BODY_SEMI, when, 36, colW)).d}" fill="${p.text}"/>`,
    how && `<path d="${text(BODY_MED, how, colX, 478, fit(BODY_MED, how, 30, colW)).d}" fill="${p.sub}"/>`,
    org && `<path d="${text(BODY_MED, org, colX, 572, fit(BODY_MED, org, 24, colW)).d}" fill="${p.sub}"/>`,
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">` +
    `<rect width="1200" height="630" fill="${p.bg}"/><rect width="500" height="630" fill="#E6F3F2"/>` +
    `<g transform="translate(40 55) scale(8.125)">${markBody(p)}</g>${parts}</svg>`;
}

// ---- write -------------------------------------------------------------------
const files = {
  "vibe-mark.svg": adaptiveMark(),
  "vibe-logo-full.svg": lockup("full", LIGHT),
  "vibe-logo-full-dark.svg": lockup("full", DARK),
  "vibe-logo.svg": lockup("short", LIGHT),
  "vibe-logo-dark.svg": lockup("short", DARK),
};
for (const [name, svg] of Object.entries(files)) writeFileSync(join(OUT, name), svg);

const png = (svg, density) => sharp(Buffer.from(svg), { density });
const square = (size, pad, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">` +
  (bg ? `<rect width="64" height="64" fill="${bg}"/>` : "") +
  `<g transform="translate(${pad} ${pad}) scale(${(64 - 2 * pad) / 64})">${markBody(LIGHT)}</g></svg>`;

await Promise.all([
  png(files["vibe-logo-full.svg"], 144).png().toFile(join(OUT, "vibe-logo-full.png")),
  png(files["vibe-logo-full-dark.svg"], 144).png().toFile(join(OUT, "vibe-logo-full-dark.png")),
  png(files["vibe-logo.svg"], 144).png().toFile(join(OUT, "vibe-logo.png")),
  png(square(512, 0), 72).png().toFile(join(OUT, "vibe-mark.png")),
  png(square(128, 0), 72).resize(32, 32).png().toFile(join(OUT, "favicon-32.png")),
  png(square(180, 6, "#FFFFFF"), 72).png().toFile(join(OUT, "apple-touch-icon.png")),
  png(ogImage(), 72).png().toFile(join(OUT, "og-image.png")),
]);

// Data for the site: the inline mark and the network map.
const byInstitution = institutions.map((inst) => ({
  name: inst.name,
  short: inst.short ?? null,
  campuses: (inst.campuses ?? []).map((c) => c.name),
}));
writeFileSync(join(GEN, "brand.json"), JSON.stringify({
  island,
  wellRadius: WELL_RADIUS,
  hitRadius: hitR,
  wells: cells,
  institutions: byInstitution,
}, null, 2) + "\n");

const lit = cells.filter((w) => w.campuses.length).length;
console.log(`build-logo: ${institutions.length} institutions, ${campuses.length} campuses → ${lit} coral wells of ${cells.length}; wrote ${Object.keys(files).length} SVGs and 7 PNGs`);
