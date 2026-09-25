// Links that keep working when the site is served from a sub-path such as
// https://<org>.github.io/<repo>/. Always build internal links with url().

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

/** url("programme") → "/<base>/programme/", url("") → "/<base>/" */
export function url(path = ""): string {
  const clean = path.replace(/^\/+/, "");
  if (!clean) return `${BASE}/`;
  if (/[#?]/.test(clean) || /\.[a-z0-9]+$/i.test(clean)) return `${BASE}/${clean}`;
  return `${BASE}/${clean.replace(/\/*$/, "/")}`;
}

/** True when `slug` is the page being rendered. */
export function isCurrent(slug: string, pathname: string): boolean {
  return pathname.replace(/\/+$/, "") === url(slug).replace(/\/+$/, "");
}

/** Minimal inline Markdown for short data-file text: [links](url), **bold**, *italic*. */
export function inlineMarkdown(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
