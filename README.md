<p align="center">
  <img src="public/logo/vibe-logo-full.svg" alt="VIBE: Virtual Institute of Bioinformatics" width="360">
</p>

# VIBE site template

A ready-to-use website for an edition of **VIBE, the Virtual Institute of Bioinformatics** conference. Copy it, edit a few text files, push, and the site builds and publishes itself on GitHub Pages.

**Live demo:** https://elixir-ie.github.io/vibe-site-template/

Pages: home, programme, speakers, call for abstracts, registration, key dates, committees, venue, sponsors, FAQ, about and code of conduct. White background, works on phones, no server or database. All content is placeholder until you replace it.

---

## Start a new edition

1. Click **Use this template → Create a new repository** at the top of this page. Name it, for example, `vibe-2028`.
2. In the new repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Edit the files in [`data/`](data/) for your edition (see the table below). You can do this in the GitHub web editor.
4. Commit to `main`. The site builds and goes live in about two minutes at `https://<your-org>.github.io/<repo-name>/`. Follow progress under the **Actions** tab.
5. When the real content is in, set `demo_notice: false` in `data/site.yml` to remove the template banner.

If a data file has a mistake, the build stops and the Actions log says which file and entry to fix. The live site stays as it was until the next successful build.

## What to edit

| File | What it holds |
|---|---|
| [`data/site.yml`](data/site.yml) | Name, dates, time zone, **host institution**, contact email, registration and abstract settings, which pages to show |
| [`data/programme.yml`](data/programme.yml) | Days, sessions and talks |
| [`data/speakers.yml`](data/speakers.yml) | Keynote and invited speakers |
| [`data/committees.yml`](data/committees.yml) | Organising, programme and other committees |
| [`data/dates.yml`](data/dates.yml) | Extra key dates (abstract, registration and conference dates are added automatically) |
| [`data/sponsors.yml`](data/sponsors.yml) | Host and sponsors, by tier |
| [`data/faq.yml`](data/faq.yml) | Questions and answers |
| [`data/brand/campuses.yml`](data/brand/campuses.yml) | Institutions shown as coral wells in the logo |
| [`src/prose/*.md`](src/prose/) | Text pages: About, Venue, Code of conduct |
| `public/img/speakers/` | Speaker photos (square, at least 400 px), named in `speakers.yml` |
| `public/img/sponsors/` | Sponsor logos, named in `sponsors.yml` |

VIBE is hosted by a different institution each year. Set the host under `host:` in `data/site.yml`. It appears in the hero, the footer and the social sharing image.

Every file starts with comments explaining its fields. Dates are left empty in the template and show as "TBC" until you fill them in.

## Preview on your computer

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
npm install
npm run dev        # live preview at http://localhost:4321
npm run build      # full production build into dist/
npm run preview    # serve the built site
npm run check      # type check
```

## Pages

The `pages:` list in `data/site.yml` decides which pages exist and the menu order. Delete a line to remove a page from the site and the menus. `nav: header` puts a page in the top menu; `nav: footer` puts it in the footer only.

To add a page of your own, create `src/pages/<name>.astro` (copy `src/pages/404.astro` as a starting point) or a Markdown file in `src/prose/` with a small view in `src/views/`.

In Markdown pages, link to other pages with relative links such as `../programme/`, so links keep working when the site lives under a sub-path.

## Dates do the work

Set dates once in `data/site.yml`, and the site uses them everywhere:

- Registration and abstract messages change on the right days (opens, open, closed).
- The home page counts down to the first session and shows "Happening now" during the event.
- Past key dates fade out and the next one is highlighted.

While dates are empty the site shows "TBC" and hides the countdown. Date-based content is worked out when the site is built and checked again in each visitor's browser, and the site rebuilds itself every morning. Use `utc_offset` for the time zone the conference runs in (`"+01:00"` for Irish summer time, `"+00:00"` in winter).

## Logo

The mark is the island of Ireland drawn as a sequencing flow cell. Each coral well marks a campus of a partner institution listed in [`data/brand/campuses.yml`](data/brand/campuses.yml). Add or remove institutions there, push, and every logo file is regenerated.

| File in `public/logo/` | Use |
|---|---|
| `vibe-logo-full.svg` / `.png` | Mark, name and subtitle: headers, posters, documents |
| `vibe-logo.svg` / `.png` | Mark and name only: slides, small spaces |
| `vibe-mark.svg` / `.png` | The mark alone: favicons, avatars |
| `og-image.png` | Social sharing card, built from the name, dates and host |

The text in the SVG files is converted to outlines, so they look the same on any computer. Logo generation lives in [`scripts/build-logo.mjs`](scripts/build-logo.mjs).

## Colours and fonts

All colours, type sizes and spacing are CSS variables in [`src/styles/tokens.css`](src/styles/tokens.css). The palette is deep teal (`#0E6B6B`) and coral (`#E8604C`, with `#C4432E` for buttons) on a plain white background (no dark mode). If you change the brand colours, change them in `scripts/build-logo.mjs` too.

Fonts are Bricolage Grotesque (headings), Figtree (text) and IBM Plex Mono (times and labels), bundled with the site through Fontsource. No request goes to Google Fonts.

## Custom domain

Add a file `public/CNAME` containing just the domain (for example `vibe2028.example.org`), point a DNS CNAME record at `<your-org>.github.io`, and set the domain under **Settings → Pages**. Links adjust automatically.

## How it is built

```
data/                 edition content (YAML)
  brand/campuses.yml  institutions in the logo
scripts/
  build-data.mjs      checks data/ and writes src/generated/*.json
  build-logo.mjs      builds public/logo/* from campuses.yml and site.yml
src/
  pages/              home, 404 and [page].astro (builds each page listed in site.yml)
  views/              one file per page
  components/         header, hero, programme rows, speaker cards, ...
  prose/              Markdown pages
  styles/             tokens.css and base.css
.github/workflows/    deploy.yml (build + publish), check.yml (pull requests)
```

[Astro](https://astro.build) turns this into plain static HTML. `npm run build` runs both scripts first, so the data check and logo build happen on every build.

## Licence

Code, text, logo and data: [CC BY 4.0](LICENSE.md). Reuse and adapt freely with credit; the footer line "Site built from the VIBE site template" covers it. To cite the template, see [`CITATION.cff`](CITATION.cff).
