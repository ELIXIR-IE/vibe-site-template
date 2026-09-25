// Typed access to the JSON written by scripts/build-data.mjs and
// scripts/build-logo.mjs. Pages import from here, never from data/ directly.

import siteJson from "../generated/site.json";
import programmeJson from "../generated/programme.json";
import speakersJson from "../generated/speakers.json";
import timelineJson from "../generated/timeline.json";
import committeesJson from "../generated/committees.json";
import sponsorsJson from "../generated/sponsors.json";
import faqJson from "../generated/faq.json";
import brandJson from "../generated/brand.json";

export interface PageEntry { slug: string; label: string; nav?: "header" | "footer" }
export interface Fee { category: string; fee: string }
export interface Site {
  event: {
    short_name: string; full_name: string; edition?: string; title: string; tagline?: string;
    start_date: string; end_date: string; start_time?: string; end_time?: string;
    utc_offset: string; timezone_label?: string; format?: string; format_label?: string;
    location?: string; contact_email?: string;
  };
  host?: { name: string; url?: string };
  demo_notice?: boolean;
  pages: PageEntry[];
  registration?: { opens?: string; closes?: string; url?: string; button_label?: string; fees?: Fee[]; includes?: string[] };
  abstracts?: {
    opens?: string; deadline?: string; notification?: string; url?: string; button_label?: string;
    word_limit?: number; topics?: string[]; formats?: { name: string; detail?: string }[];
  };
  social?: { label: string; url: string }[];
  derived: {
    eventStart: string; eventEnd: string;
    registrationOpens: string | null; registrationCloses: string | null;
    abstractsOpen: string | null; abstractsClose: string | null;
  };
}
export interface Speaker {
  id: string; name: string; affiliation: string; role: "keynote" | "invited";
  talk?: string; bio?: string; photo?: string; links?: Record<string, string>;
}
export interface Session {
  start: string; end: string; startAt: string; endAt: string;
  type: "keynote" | "talks" | "panel" | "workshop" | "posters" | "break" | "social" | "opening";
  title: string; chair?: string; note?: string;
  speaker?: string; speakerInfo?: { id: string; name: string; affiliation: string } | null;
  items: { title: string; by: string | null; speakerId?: string }[];
}
export interface Day { date: string; title?: string; sessions: Session[] }
export interface KeyDate {
  date: string; end?: string; label: string; note?: string; at: string;
  kind: "milestone" | "deadline" | "event"; group: "abstracts" | "registration" | "event" | "other";
}
export interface Member { name: string; affiliation: string; role?: string; orcid?: string }
export interface Committee { name: string; description?: string; members: Member[] }
export interface SponsorTier { tier: string; sponsors: { name: string; url?: string; logo?: string }[] }
export interface Faq { q: string; a: string }
export interface Well { x: number; y: number; level: number; campuses: string[] }
export interface Brand {
  island: string; wellRadius: number; hitRadius: number; wells: Well[];
  institutions: { name: string; short: string | null; campuses: string[] }[];
}

export const site = siteJson as unknown as Site;
export const programme = programmeJson as unknown as Day[];
export const speakers = speakersJson as unknown as Speaker[];
export const timeline = timelineJson as unknown as KeyDate[];
export const committees = committeesJson as unknown as Committee[];
export const sponsors = sponsorsJson as unknown as SponsorTier[];
export const faq = faqJson as unknown as Faq[];
export const brand = brandJson as unknown as Brand;

export const hasPage = (slug: string) => site.pages.some((p) => p.slug === slug);
export const pageLabel = (slug: string) => site.pages.find((p) => p.slug === slug)?.label ?? slug;
