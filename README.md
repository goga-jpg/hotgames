# hotgames

Automated football betting creative platform. The static creative (hero art +
league banner) stays fixed; the bottom section — team names, team logos, and
1 / X / 2 odds — is populated dynamically from an odds API, with team logos
auto-matched from a local repository. Creatives can be rendered at any
standard IAB ad size.

## How it works

```
┌─────────── Odds API ───────────┐      ┌── Logo repo (public/logos/) ──┐
│  the-odds-api  OR  mock JSON   │      │  manchester-city.svg           │
└───────────────┬────────────────┘      │  arsenal.svg  …                │
                │                       └───────────────┬────────────────┘
                ▼                                       │
         /api/fixtures ──► match.{home,away,odds} ──┐   │
                                                    ▼   ▼
                              ┌──── /creative/?size=…&match=… ─────┐
                              │  static hero + orange banner       │
                              │  dynamic slots positioned per IAB  │
                              └──── rendered in an <iframe> ───────┘
```

- Odds & matches come from `GET /api/fixtures` (live if `ODDS_API_KEY` is set,
  otherwise mock).
- Logos are resolved by name against `public/logos/` with fuzzy + alias
  matching (`data/teams.json`).
- IAB sizes + default layouts live in `src/iabSizes.js`. A layout is a set of
  `{x,y,w,h}` percentage boxes for every dynamic element.
- The creative is a single HTML5 unit at `/creative/` that reads its
  `size`, `match` and optional `layout` from the query string — that same URL
  is what the ad server embeds.

## View on GitHub Pages

A fully static build lives under [`docs/`](./docs) and is deployed by
`.github/workflows/pages.yml` on every push to `main` or the feature branch.
Once Pages is enabled in the repo (Settings → Pages → Source: **GitHub
Actions**), the admin UI appears at

```
https://<owner>.github.io/<repo>/            ← admin + live preview
https://<owner>.github.io/<repo>/creative/   ← embeddable ad unit
```

The static build is mock-only (fixtures come from
`docs/data/fixtures.json`). Live odds via the-odds-api.com require the
Express backend below (static hosting can't keep an API key secret).

## Run

```bash
npm install
npm start
# → http://localhost:3000
```

The admin UI lets you pick a fixture, an IAB size, tweak placement
coordinates live, preview the result and copy an `<iframe>` ad tag.

### Environment

| Var            | Purpose                                             |
|----------------|-----------------------------------------------------|
| `PORT`         | HTTP port (default 3000)                            |
| `ODDS_API_KEY` | the-odds-api.com key; when unset, mock data is used |
| `ODDS_BACKEND` | `mock` \| `theoddsapi` (auto-detected)              |

## Adding team logos

Drop any `svg` / `png` / `jpg` file into `public/logos/`. The filename (minus
extension) becomes the slug. To support alternative names returned by the
odds feed, add aliases in `data/teams.json`:

```json
{ "slug": "manchester-city", "display": "Manchester City", "aliases": ["Man City", "MCI"] }
```

## Customising the base creative

`public/assets/base-default.jpg` (if present) becomes the hero background. You
can also ship a per-size override, e.g. `base-leaderboard.jpg`, and it will be
picked up automatically by `/api/sizes/:id`. The orange league / date / time
banner and the Bandabets.com mark are generated in CSS so they stay crisp at
every size.

## Layout presets

Each IAB size points at a preset in `src/iabSizes.js`:

- `squareBottomStrip` — matches the reference creative (hero top, odds strip bottom)
- `leaderboard`       — single horizontal row (728×90, 970×90, 468×60)
- `skyscraperStacked` — vertical stack (160×600, 300×600, 120×600)
- `mobileBanner`      — compact, text-only (320×50, 320×100)

Every preset is cloned per request so admin edits never mutate the defaults.
