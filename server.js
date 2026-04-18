const express = require("express");
const path = require("path");
const fs = require("fs");

const { listFixtures, getFixture } = require("./src/oddsProvider");
const { resolveLogo, allTeams } = require("./src/logoRepo");
const { IAB_SIZES, layoutForSize } = require("./src/iabSizes");

const app = express();
app.use(express.json({ limit: "1mb" }));

// ---------- static assets ----------
app.use("/logos", express.static(path.join(__dirname, "public/logos"), { maxAge: "1h" }));
app.use("/creative", express.static(path.join(__dirname, "public/creative"), { maxAge: "1h" }));
app.use("/assets", express.static(path.join(__dirname, "public/assets"), { maxAge: "1h" }));
app.use("/", express.static(path.join(__dirname, "public"), { index: "admin.html" }));

// ---------- API: IAB sizes & layouts ----------
app.get("/api/sizes", (_req, res) => {
  res.json(IAB_SIZES);
});

app.get("/api/sizes/:id", (req, res) => {
  const info = layoutForSize(req.params.id);
  if (!info) return res.status(404).json({ error: "unknown size" });
  // Allow a per-size base image override if public/assets/base-<id>.jpg exists.
  const baseImage = findBaseImage(req.params.id);
  res.json({ ...info, baseImage });
});

function findBaseImage(sizeId) {
  const candidates = [
    `base-${sizeId}.jpg`,
    `base-${sizeId}.png`,
    "base-default.jpg",
    "base-default.png"
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(__dirname, "public/assets", c))) {
      return `/assets/${c}`;
    }
  }
  return null;
}

// ---------- API: odds & fixtures ----------
app.get("/api/fixtures", async (req, res) => {
  try {
    const data = await listFixtures({
      sport: req.query.sport,
      region: req.query.region,
      bookmaker: req.query.bookmaker
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/fixtures/:id", async (req, res) => {
  try {
    const m = await getFixture(req.params.id);
    if (!m) return res.status(404).json({ error: "not found" });
    res.json(m);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- API: team / logo lookup ----------
app.get("/api/teams", (_req, res) => res.json(allTeams()));
app.get("/api/logo", (req, res) => {
  const name = req.query.name || "";
  res.json({ name, logo: resolveLogo(name) });
});

// ---------- ad tag helper ----------
// Returns a ready-to-paste iframe snippet for a given match/size.
app.get("/api/adtag", (req, res) => {
  const match = req.query.match;
  const size = req.query.size || "medium-rectangle";
  const sz = IAB_SIZES.find((s) => s.id === size);
  if (!sz) return res.status(400).json({ error: "unknown size" });
  const base = `${req.protocol}://${req.get("host")}`;
  const url = `${base}/creative/?size=${encodeURIComponent(size)}` +
              (match ? `&match=${encodeURIComponent(match)}` : "");
  const snippet =
    `<iframe src="${url}" width="${sz.w}" height="${sz.h}" ` +
    `frameborder="0" scrolling="no" marginheight="0" marginwidth="0" ` +
    `style="border:0;display:block"></iframe>`;
  res.json({ url, snippet, size: sz });
});

// ---------- start ----------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`hotgames running on http://localhost:${port}`);
  console.log(`Odds backend: ${process.env.ODDS_BACKEND || (process.env.ODDS_API_KEY ? "theoddsapi" : "mock")}`);
});
