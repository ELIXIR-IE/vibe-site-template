// Text helpers shared by the site and the logo build.

/** Split a name into two balanced lines: "Virtual Institute of" / "Bioinformatics & Evolution". */
export function twoLines(name) {
  const words = String(name).trim().split(/\s+/);
  if (words.length < 2) return [String(name), ""];
  let best = [name, ""];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) { best = [a, b]; bestDiff = diff; }
  }
  return best;
}

/** Initials for an avatar: "Speaker Name" → "SN". */
export function initials(name) {
  const words = String(name).replace(/^(Dr|Prof\.?|Professor|Mr|Ms|Mrs|Mx)\s+/i, "").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}
