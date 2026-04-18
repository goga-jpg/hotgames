const fs = require("fs");
const path = require("path");

// The logo repository lives on disk. A single team can be referenced by
// multiple names (e.g. "Man City" vs "Manchester City"), so we keep a
// registry file that maps a canonical slug to every alias the odds API
// might return. File lookup is done case/whitespace-insensitively so new
// files dropped into public/logos/ are picked up without registry edits.

const LOGOS_DIR = path.join(__dirname, "..", "public", "logos");
const REGISTRY = path.join(__dirname, "..", "data", "teams.json");
const PLACEHOLDER = "/logos/_placeholder.svg";

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY)) return { teams: [] };
  try {
    return JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  } catch (e) {
    return { teams: [] };
  }
}

function listLogoFiles() {
  if (!fs.existsSync(LOGOS_DIR)) return [];
  return fs
    .readdirSync(LOGOS_DIR)
    .filter((f) => /\.(svg|png|jpg|jpeg|webp)$/i.test(f))
    .filter((f) => !f.startsWith("_"));
}

function findLogoFile(slug) {
  const files = listLogoFiles();
  const match = files.find((f) => path.parse(f).name.toLowerCase() === slug);
  return match ? `/logos/${match}` : null;
}

// Resolve a team name to a logo URL. Order of resolution:
//   1. registry alias → canonical slug → file on disk
//   2. raw slug of the team name → file on disk
//   3. fuzzy contains match across available files
//   4. placeholder
function resolveLogo(teamName) {
  if (!teamName) return PLACEHOLDER;
  const registry = loadRegistry();
  const needle = slugify(teamName);

  const aliased = registry.teams.find((t) =>
    [t.slug, ...(t.aliases || [])].map(slugify).includes(needle)
  );
  if (aliased) {
    const viaSlug = findLogoFile(aliased.slug);
    if (viaSlug) return viaSlug;
  }

  const direct = findLogoFile(needle);
  if (direct) return direct;

  const fuzzy = listLogoFiles().find((f) => {
    const stem = slugify(path.parse(f).name);
    return stem.includes(needle) || needle.includes(stem);
  });
  if (fuzzy) return `/logos/${fuzzy}`;

  return PLACEHOLDER;
}

function resolveMany(names) {
  return names.map((n) => ({ name: n, logo: resolveLogo(n) }));
}

function allTeams() {
  const registry = loadRegistry();
  const onDisk = listLogoFiles().map((f) => ({
    slug: path.parse(f).name,
    logo: `/logos/${f}`,
    aliases: []
  }));
  // Registry entries win; extras found on disk are appended.
  const known = new Set(registry.teams.map((t) => t.slug));
  const extras = onDisk.filter((t) => !known.has(t.slug));
  return [...registry.teams.map((t) => ({ ...t, logo: findLogoFile(t.slug) || PLACEHOLDER })), ...extras];
}

module.exports = { resolveLogo, resolveMany, allTeams, slugify };
