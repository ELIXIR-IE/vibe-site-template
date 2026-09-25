#!/usr/bin/env node
// Reads the YAML files in data/ and writes checked JSON to src/generated/
// for the pages to import. Runs automatically before `npm run dev` and
// `npm run build`. Never edit src/generated/ by hand; edit data/ instead.
//
// If something is missing or mistyped, this script stops the build and says
// which file and entry to fix. Dates are optional everywhere: leave them
// empty and the site shows "TBC".

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { load, CORE_SCHEMA } from "js-yaml";
import { toInstant, atTime, parseDay } from "../src/lib/dates.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const OUT = join(ROOT, "src", "generated");
mkdirSync(OUT, { recursive: true });

const problems = [];
const problem = (file, where, msg) => problems.push(`data/${file} → ${where}: ${msg}`);

function read(file, fallback) {
  const path = join(DATA, file);
  if (!existsSync(path)) return fallback;
  try {
    return load(readFileSync(path, "utf8"), { schema: CORE_SCHEMA }) ?? fallback;
  } catch (e) {
    problems.push(`data/${file}: not valid YAML. ${e.message.split("\n")[0]}`);
    return fallback;
  }
}

const has = (v) => v !== undefined && v !== null && v !== "";

function need(file, where, obj, fields) {
  for (const f of fields) if (!has(obj?.[f])) problem(file, where, `missing "${f}"`);
}

function checkDate(file, where, value) {
  if (!has(value)) return;
  try { parseDay(value); } catch { problem(file, where, `"${value}" is not a date (use YYYY-MM-DD)`); }
}

const TIME = /^\d{2}:\d{2}$/;
const SESSION_TYPES = ["keynote", "talks", "panel", "workshop", "posters", "break", "social", "opening"];
const PAGE_SLUGS = ["programme", "speakers", "call-for-abstracts", "key-dates", "committees", "venue",
  "register", "about", "sponsors", "faq", "code-of-conduct"];

// ---- site.yml ----------------------------------------------------------------
const site = read("site.yml", {});
need("site.yml", "event", site.event, ["short_name", "full_name", "title"]);
for (const k of ["start_date", "end_date"]) checkDate("site.yml", `event.${k}`, site.event?.[k]);
for (const k of ["start_time", "end_time"]) {
  if (has(site.event?.[k]) && !TIME.test(site.event[k])) problem("site.yml", `event.${k}`, `use "HH:MM" in quotes`);
}
if (has(site.event?.utc_offset) && !/^[+-]\d{2}:\d{2}$/.test(site.event.utc_offset)) {
  problem("site.yml", "event.utc_offset", `use the form "+01:00" in quotes`);
}
const offset = site.event?.utc_offset ?? "+00:00";

const pages = (site.pages ?? []).filter(Boolean);
pages.forEach((p, i) => {
  need("site.yml", `pages[${i + 1}]`, p, ["slug", "label"]);
  if (p.slug && !PAGE_SLUGS.includes(p.slug)) {
    problem("site.yml", `pages[${i + 1}]`, `unknown page "${p.slug}". Known pages: ${PAGE_SLUGS.join(", ")}`);
  }
});

for (const block of ["registration", "abstracts"]) {
  if (!site[block]) continue;
  for (const k of ["opens", "closes", "deadline", "notification"]) checkDate("site.yml", `${block}.${k}`, site[block][k]);
}

const reg = site.registration ?? {};
const abs = site.abstracts ?? {};
const event = site.event ?? {};
const endDate = has(event.end_date) ? event.end_date : event.start_date;

const derived = {
  eventStart: has(event.start_date) ? atTime(event.start_date, event.start_time ?? "09:00", offset) : null,
  eventEnd: has(endDate) ? atTime(endDate, event.end_time ?? "17:00", offset) : null,
  registrationOpens: has(reg.opens) ? toInstant(reg.opens, offset) : null,
  registrationCloses: has(reg.closes) ? toInstant(reg.closes, offset, true) : null,
  abstractsOpen: has(abs.opens) ? toInstant(abs.opens, offset) : null,
  abstractsClose: has(abs.deadline) ? toInstant(abs.deadline, offset, true) : null,
};

// ---- speakers.yml --------------------------------------------------------------
const speakers = read("speakers.yml", []);
const speakerIds = new Set();
speakers.forEach((s, i) => {
  const where = `entry ${i + 1}`;
  need("speakers.yml", where, s, ["id", "name", "affiliation", "role"]);
  if (s.id && speakerIds.has(s.id)) problem("speakers.yml", where, `id "${s.id}" is used twice`);
  speakerIds.add(s.id);
  if (s.role && !["keynote", "invited"].includes(s.role)) problem("speakers.yml", where, `role must be keynote or invited`);
  if (s.photo && !existsSync(join(ROOT, "public", "img", "speakers", s.photo))) {
    problem("speakers.yml", where, `photo "${s.photo}" not found in public/img/speakers/`);
  }
});
const speakerById = Object.fromEntries(speakers.map((s) => [s.id, s]));
const pick = (s) => (s ? { id: s.id, name: s.name, affiliation: s.affiliation, role: s.role } : null);

// ---- programme.yml -------------------------------------------------------------
const programme = read("programme.yml", []);
programme.forEach((day, d) => {
  const dw = `day ${d + 1}`;
  need("programme.yml", dw, day, ["sessions"]);
  checkDate("programme.yml", dw, day.date);
  if (!has(day.date)) day.date = null;
  (day.sessions ?? []).forEach((s, i) => {
    const where = `${dw}, session ${i + 1}${s?.title ? ` (${s.title})` : ""}`;
    need("programme.yml", where, s, ["start", "end", "type", "title"]);
    for (const k of ["start", "end"]) if (s[k] && !TIME.test(s[k])) problem("programme.yml", where, `${k} must be "HH:MM" in quotes`);
    if (s.type && !SESSION_TYPES.includes(s.type)) problem("programme.yml", where, `type must be one of ${SESSION_TYPES.join(", ")}`);
    if (s.speaker && !speakerById[s.speaker]) problem("programme.yml", where, `speaker "${s.speaker}" is not an id in speakers.yml`);
    s.startAt = day.date ? atTime(day.date, s.start, offset) : null;
    s.endAt = day.date ? atTime(day.date, s.end, offset) : null;
    if (s.speaker) s.speakerInfo = pick(speakerById[s.speaker]);
    s.items = (s.items ?? []).map((it) => {
      const sp = speakerById[it.by];
      return sp ? { title: it.title, by: `${sp.name}, ${sp.affiliation}`, speakerId: sp.id } : { title: it.title, by: it.by ?? null };
    });
  });
});

// ---- dates.yml + dates from site.yml --------------------------------------------
const extraDates = read("dates.yml", []);
extraDates.forEach((d, i) => {
  need("dates.yml", `entry ${i + 1}`, d, ["label"]);
  checkDate("dates.yml", `entry ${i + 1}`, d.date);
});
const entry = (date, label, kind, group, end) => ({ date: has(date) ? date : null, end: has(end) ? end : null, label, kind, group });
const timeline = [
  entry(abs.opens, "Call for abstracts opens", "milestone", "abstracts"),
  entry(abs.deadline, "Abstract deadline", "deadline", "abstracts"),
  entry(abs.notification, "Authors notified", "milestone", "abstracts"),
  entry(reg.opens, "Registration opens", "milestone", "registration"),
  entry(reg.closes, "Registration closes", "deadline", "registration"),
  entry(event.start_date, event.title ?? "Conference", "event", "event", event.end_date),
  ...extraDates.map((d) => ({ ...entry(d.date, d.label, "milestone", "other"), note: d.note ?? null })),
].map((d) => ({ ...d, at: d.date ? toInstant(d.end ?? d.date, offset, true) : null }));
// Sort by date only when every entry has one; otherwise keep the listed order.
if (timeline.every((d) => d.at)) timeline.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

// ---- committees, sponsors, faq ---------------------------------------------------
const committees = read("committees.yml", []);
committees.forEach((c, i) => {
  need("committees.yml", `committee ${i + 1}`, c, ["name", "members"]);
  (c.members ?? []).forEach((m, j) => {
    need("committees.yml", `${c.name ?? `committee ${i + 1}`}, member ${j + 1}`, m, ["name", "affiliation"]);
    if (m.orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(m.orcid)) {
      problem("committees.yml", `${c.name}, member ${j + 1}`, `orcid should look like 0000-0002-1825-0097`);
    }
  });
});

const sponsors = read("sponsors.yml", []);
sponsors.forEach((t, i) => {
  need("sponsors.yml", `tier ${i + 1}`, t, ["tier", "sponsors"]);
  (t.sponsors ?? []).forEach((s, j) => {
    need("sponsors.yml", `${t.tier}, sponsor ${j + 1}`, s, ["name"]);
    if (s.logo && !existsSync(join(ROOT, "public", "img", "sponsors", s.logo))) {
      problem("sponsors.yml", `${t.tier}, ${s.name}`, `logo "${s.logo}" not found in public/img/sponsors/`);
    }
  });
});

const faq = read("faq.yml", []);
faq.forEach((f, i) => need("faq.yml", `question ${i + 1}`, f, ["q", "a"]));

// ---- write -------------------------------------------------------------------
if (problems.length) {
  console.error(`\nbuild-data: found ${problems.length} problem(s) in data/:\n`);
  for (const p of problems) console.error(`  • ${p}`);
  console.error("");
  process.exit(1);
}

const write = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + "\n");
write("site.json", { ...site, pages, derived });
write("programme.json", programme);
write("speakers.json", speakers);
write("timeline.json", timeline);
write("committees.json", committees);
write("sponsors.json", sponsors);
write("faq.json", faq);

const sessions = programme.reduce((n, d) => n + (d.sessions?.length ?? 0), 0);
console.log(`build-data: ${pages.length} pages, ${programme.length} day(s) / ${sessions} sessions, ${speakers.length} speakers, ${committees.length} committees, ${timeline.length} key dates`);
