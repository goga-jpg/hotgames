// Shared browser module: loads teams + fixtures + logo manifest from the
// static JSON files under ./data/ and exposes the same resolve/list helpers
// the Express backend had (so the UIs can run without a server).

// data paths are relative to the importing HTML file, so we need to
// resolve them via the module's own location.
const BASE = new URL("../", import.meta.url);

let _teamsPromise = null;
let _fixturesPromise = null;
let _logosPromise = null;

function loadTeams() {
  if (!_teamsPromise) {
    _teamsPromise = fetch(new URL("data/teams.json", BASE)).then((r) => r.json());
  }
  return _teamsPromise;
}

function loadFixtures() {
  if (!_fixturesPromise) {
    _fixturesPromise = fetch(new URL("data/fixtures.json", BASE)).then((r) => r.json());
  }
  return _fixturesPromise;
}

function loadLogoManifest() {
  if (!_logosPromise) {
    _logosPromise = fetch(new URL("data/logos.json", BASE)).then((r) => r.json());
  }
  return _logosPromise;
}

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function logoUrl(file) {
  return new URL(`logos/${file}`, BASE).toString();
}

function placeholder() {
  return new URL("logos/_placeholder.svg", BASE).toString();
}

export async function resolveLogo(teamName) {
  if (!teamName) return placeholder();
  const [registry, manifest] = await Promise.all([loadTeams(), loadLogoManifest()]);
  const files = manifest.files || [];
  const stems = new Map(files.map((f) => [f.replace(/\.[^.]+$/, "").toLowerCase(), f]));
  const needle = slugify(teamName);

  const aliased = (registry.teams || []).find((t) =>
    [t.slug, ...(t.aliases || [])].map(slugify).includes(needle)
  );
  if (aliased && stems.has(aliased.slug)) return logoUrl(stems.get(aliased.slug));

  if (stems.has(needle)) return logoUrl(stems.get(needle));

  for (const [stem, file] of stems) {
    const s = slugify(stem);
    if (s.includes(needle) || needle.includes(s)) return logoUrl(file);
  }
  return placeholder();
}

export async function listFixtures() {
  const raw = await loadFixtures();
  return Promise.all(raw.map(async (m) => ({
    id: m.id,
    league: m.league,
    kickoff: m.kickoff,
    home: { name: m.home, logo: await resolveLogo(m.home) },
    away: { name: m.away, logo: await resolveLogo(m.away) },
    odds: {
      home: Number(m.odds.home),
      draw: Number(m.odds.draw),
      away: Number(m.odds.away)
    }
  })));
}

export async function getFixture(id) {
  const all = await listFixtures();
  return all.find((m) => m.id === id) || null;
}

export { IAB_SIZES, layoutForSize } from "./iabSizes.js";
