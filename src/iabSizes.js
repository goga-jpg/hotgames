// Standard IAB display ad sizes. Each entry ships with a default placement layout
// for the dynamic bottom section (team logos, team names, 1 / X / 2 odds,
// and the Bandabets logo). Coordinates and sizes are expressed as percentages
// of the ad unit so the same layout scales across any size variant.

const PCT = (v) => Number(v.toFixed(4));

// Shared layout presets. Every preset describes where each dynamic element
// sits inside the ad unit. The static creative (hero image + league banner)
// occupies whatever space is NOT used by the dynamic bottom region.
const PRESETS = {
  // Square-ish units: hero on top, dynamic strip at the bottom (matches the
  // reference creative provided by the user).
  squareBottomStrip: {
    staticRegion: { x: 0, y: 0, w: 100, h: 70 },
    dynamic: {
      teamAName:  { x: 2,  y: 88, w: 26, h: 6,  align: "left"   },
      teamALogo:  { x: 4,  y: 72, w: 22, h: 16,                },
      odds1:      { x: 32, y: 74, w: 12, h: 14, align: "center" },
      oddsX:      { x: 44, y: 74, w: 12, h: 14, align: "center" },
      odds2:      { x: 56, y: 74, w: 12, h: 14, align: "center" },
      teamBLogo:  { x: 74, y: 72, w: 22, h: 16,                },
      teamBName:  { x: 72, y: 88, w: 26, h: 6,  align: "right"  },
      bandaLogo:  { x: 40, y: 91, w: 20, h: 8,  align: "center" }
    }
  },
  // Leaderboard-style units: everything on one horizontal strip, static
  // graphic on the left, odds in the middle, team info flanking it.
  leaderboard: {
    staticRegion: { x: 0, y: 0, w: 30, h: 100 },
    dynamic: {
      teamALogo:  { x: 31, y: 15, w: 10, h: 70,                 },
      teamAName:  { x: 31, y: 82, w: 14, h: 14, align: "center" },
      odds1:      { x: 46, y: 10, w: 8,  h: 80, align: "center" },
      oddsX:      { x: 55, y: 10, w: 8,  h: 80, align: "center" },
      odds2:      { x: 64, y: 10, w: 8,  h: 80, align: "center" },
      teamBLogo:  { x: 74, y: 15, w: 10, h: 70,                 },
      teamBName:  { x: 74, y: 82, w: 14, h: 14, align: "center" },
      bandaLogo:  { x: 88, y: 35, w: 10, h: 30, align: "center" }
    }
  },
  // Skyscraper / half-page: hero on top, stacked match info below.
  skyscraperStacked: {
    staticRegion: { x: 0, y: 0, w: 100, h: 45 },
    dynamic: {
      teamALogo:  { x: 15, y: 47, w: 70, h: 12,                },
      teamAName:  { x: 5,  y: 59, w: 90, h: 5,  align: "center" },
      odds1:      { x: 5,  y: 66, w: 28, h: 9,  align: "center" },
      oddsX:      { x: 36, y: 66, w: 28, h: 9,  align: "center" },
      odds2:      { x: 67, y: 66, w: 28, h: 9,  align: "center" },
      teamBLogo:  { x: 15, y: 78, w: 70, h: 12,                },
      teamBName:  { x: 5,  y: 90, w: 90, h: 4,  align: "center" },
      bandaLogo:  { x: 30, y: 95, w: 40, h: 4,  align: "center" }
    }
  },
  // Compact mobile banners: minimal layout, no team logos.
  mobileBanner: {
    staticRegion: { x: 0, y: 0, w: 28, h: 100 },
    dynamic: {
      teamAName:  { x: 30, y: 10, w: 18, h: 40, align: "right"  },
      odds1:      { x: 49, y: 10, w: 10, h: 80, align: "center" },
      oddsX:      { x: 60, y: 10, w: 10, h: 80, align: "center" },
      odds2:      { x: 71, y: 10, w: 10, h: 80, align: "center" },
      teamBName:  { x: 82, y: 10, w: 18, h: 40, align: "left"   },
      bandaLogo:  { x: 30, y: 55, w: 70, h: 40, align: "center" }
    }
  }
};

const IAB_SIZES = [
  { id: "medium-rectangle", name: "Medium Rectangle",      w: 300,  h: 250,  preset: "squareBottomStrip" },
  { id: "square",           name: "Square",                w: 250,  h: 250,  preset: "squareBottomStrip" },
  { id: "small-square",     name: "Small Square",          w: 200,  h: 200,  preset: "squareBottomStrip" },
  { id: "large-rectangle",  name: "Large Rectangle",       w: 336,  h: 280,  preset: "squareBottomStrip" },
  { id: "instagram-square", name: "Instagram/Social 1:1",  w: 1080, h: 1080, preset: "squareBottomStrip" },
  { id: "leaderboard",      name: "Leaderboard",           w: 728,  h: 90,   preset: "leaderboard"       },
  { id: "large-leaderboard",name: "Large Leaderboard",     w: 970,  h: 90,   preset: "leaderboard"       },
  { id: "billboard",        name: "Billboard",             w: 970,  h: 250,  preset: "squareBottomStrip" },
  { id: "wide-skyscraper",  name: "Wide Skyscraper",       w: 160,  h: 600,  preset: "skyscraperStacked" },
  { id: "skyscraper",       name: "Skyscraper",            w: 120,  h: 600,  preset: "skyscraperStacked" },
  { id: "half-page",        name: "Half Page",             w: 300,  h: 600,  preset: "skyscraperStacked" },
  { id: "mobile-banner",    name: "Mobile Banner",         w: 320,  h: 50,   preset: "mobileBanner"      },
  { id: "large-mobile",     name: "Large Mobile Banner",   w: 320,  h: 100,  preset: "mobileBanner"      },
  { id: "wide-banner",      name: "Wide Banner",           w: 468,  h: 60,   preset: "leaderboard"       }
];

function layoutForSize(sizeId) {
  const size = IAB_SIZES.find((s) => s.id === sizeId);
  if (!size) return null;
  const preset = PRESETS[size.preset];
  return {
    size,
    layout: JSON.parse(JSON.stringify(preset)) // deep clone so callers can mutate safely
  };
}

module.exports = { IAB_SIZES, PRESETS, layoutForSize, PCT };
