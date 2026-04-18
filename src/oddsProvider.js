const fs = require("fs");
const path = require("path");
const { resolveLogo } = require("./logoRepo");

// Odds provider abstraction. Two backends are supported:
//  - "mock"    : reads data/mockFixtures.json (default, no network)
//  - "theoddsapi" : hits https://api.the-odds-api.com when ODDS_API_KEY is set
//
// Both backends normalise to the same shape:
//  { id, league, kickoff, home:{name,logo}, away:{name,logo}, odds:{home,draw,away} }

const MOCK_PATH = path.join(__dirname, "..", "data", "mockFixtures.json");

function loadMock() {
  try {
    return JSON.parse(fs.readFileSync(MOCK_PATH, "utf8"));
  } catch (e) {
    return [];
  }
}

function normaliseMock(raw) {
  return raw.map((m) => ({
    id: m.id,
    league: m.league,
    kickoff: m.kickoff,
    home: { name: m.home, logo: resolveLogo(m.home) },
    away: { name: m.away, logo: resolveLogo(m.away) },
    odds: {
      home: Number(m.odds.home),
      draw: Number(m.odds.draw),
      away: Number(m.odds.away)
    }
  }));
}

async function fetchTheOddsApi({ sport, region = "uk", bookmaker }) {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("ODDS_API_KEY not configured");
  const url =
    `https://api.the-odds-api.com/v4/sports/${encodeURIComponent(sport)}/odds` +
    `?regions=${encodeURIComponent(region)}&markets=h2h&oddsFormat=decimal&apiKey=${encodeURIComponent(key)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Odds API ${res.status}: ${await res.text()}`);
  const data = await res.json();

  return data.map((ev) => {
    // Prefer the requested bookmaker; fall back to the first one returned.
    const book =
      (bookmaker && ev.bookmakers.find((b) => b.key === bookmaker)) ||
      ev.bookmakers[0];
    const market = book && book.markets.find((m) => m.key === "h2h");
    const pick = (label) => {
      if (!market) return null;
      const out = market.outcomes.find((o) => o.name === label);
      return out ? Number(out.price) : null;
    };
    return {
      id: ev.id,
      league: ev.sport_title,
      kickoff: ev.commence_time,
      home: { name: ev.home_team, logo: resolveLogo(ev.home_team) },
      away: { name: ev.away_team, logo: resolveLogo(ev.away_team) },
      odds: {
        home: pick(ev.home_team),
        draw: pick("Draw"),
        away: pick(ev.away_team)
      }
    };
  });
}

async function listFixtures({ sport = "soccer_epl", region, bookmaker } = {}) {
  const backend = process.env.ODDS_BACKEND || (process.env.ODDS_API_KEY ? "theoddsapi" : "mock");
  if (backend === "theoddsapi") {
    try {
      return await fetchTheOddsApi({ sport, region, bookmaker });
    } catch (e) {
      console.warn(`[odds] live fetch failed, falling back to mock: ${e.message}`);
      return normaliseMock(loadMock());
    }
  }
  return normaliseMock(loadMock());
}

async function getFixture(id) {
  const all = await listFixtures();
  return all.find((m) => m.id === id) || null;
}

module.exports = { listFixtures, getFixture };
