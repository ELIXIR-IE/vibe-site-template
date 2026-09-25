// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// SITE_URL and BASE_PATH are set by the GitHub Pages workflow from
// actions/configure-pages, so a copy of this repo deploys under its own name
// with no edits. Locally they fall back to the dev server at "/".
const site = process.env.SITE_URL || "http://localhost:4321";
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  integrations: [sitemap()],
});
