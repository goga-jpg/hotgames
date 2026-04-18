import { layoutForSize, getFixture, listFixtures } from "../js/core.js";

(async function () {
  const qs = new URLSearchParams(location.search);
  const matchId = qs.get("match");
  const sizeId  = qs.get("size") || "medium-rectangle";
  const custom  = qs.get("layout");

  const info = layoutForSize(sizeId);
  if (!info) { document.body.textContent = "Unknown ad size"; return; }

  const match = matchId
    ? await getFixture(matchId)
    : (await listFixtures())[0];
  if (!match) { document.body.textContent = "No fixture available"; return; }

  const layout = custom
    ? JSON.parse(atob(decodeURIComponent(custom)))
    : info.layout;

  const el = document.getElementById("creative");
  el.style.setProperty("--w", info.size.w + "px");
  el.style.setProperty("--h", info.size.h + "px");
  const sr = layout.staticRegion;
  el.style.setProperty("--sx", sr.x + "%");
  el.style.setProperty("--sy", sr.y + "%");
  el.style.setProperty("--sw", sr.w + "%");
  el.style.setProperty("--sh", sr.h + "%");

  document.getElementById("staticBanner").textContent = buildBannerText(match);

  const layer = document.getElementById("dynamicLayer");
  const slots = layout.dynamic || {};

  placeLogo(layer, slots.teamALogo, match.home.logo, match.home.name);
  placeLogo(layer, slots.teamBLogo, match.away.logo, match.away.name);
  placeText(layer, slots.teamAName, match.home.name, "team-name");
  placeText(layer, slots.teamBName, match.away.name, "team-name");
  placeOdds(layer, slots.odds1, "1", match.odds.home, "first");
  placeOdds(layer, slots.oddsX, "X", match.odds.draw, "");
  placeOdds(layer, slots.odds2, "2", match.odds.away, "last");
  placeBanda(layer, slots.bandaLogo);

  window.__creativeReady = true;
})();

function buildBannerText(match) {
  const d = new Date(match.kickoff);
  const day = d.getUTCDate();
  const month = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase();
  const year = d.getUTCFullYear();
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC"
  }).toUpperCase().replace(" ", "");
  const league = (match.league || "FOOTBALL").toUpperCase();
  return `${league} | ${day}${ordinal(day)} ${month} ${year} | ${time}`;
}

function ordinal(n) {
  const s = ["TH", "ST", "ND", "RD"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function applyBox(node, box) {
  if (!box) return false;
  node.style.left   = box.x + "%";
  node.style.top    = box.y + "%";
  node.style.width  = box.w + "%";
  node.style.height = box.h + "%";
  return true;
}

function placeLogo(parent, box, src, alt) {
  if (!box) return;
  const node = document.createElement("div");
  node.className = "slot transparent";
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.onerror = () => { img.src = new URL("../logos/_placeholder.svg", import.meta.url).toString(); };
  node.appendChild(img);
  parent.appendChild(node);
  applyBox(node, box);
}

function placeText(parent, box, text, cls) {
  if (!box) return;
  const node = document.createElement("div");
  node.className = `slot ${cls}`;
  node.textContent = text;
  parent.appendChild(node);
  applyBox(node, box);
  autoFit(node);
}

function placeOdds(parent, box, pick, value, extraCls) {
  if (!box) return;
  const node = document.createElement("div");
  node.className = `slot odds ${extraCls || ""}`.trim();
  const p = document.createElement("div"); p.className = "pick"; p.textContent = pick;
  const v = document.createElement("div"); v.className = "val";  v.textContent = (value ?? "-").toString();
  node.appendChild(p); node.appendChild(v);
  parent.appendChild(node);
  applyBox(node, box);
}

function placeBanda(parent, box) {
  if (!box) return;
  const node = document.createElement("div");
  node.className = "slot banda-logo";
  node.innerHTML = '<span class="banda"><span class="a">Banda</span><span class="b">bets.com</span></span>';
  parent.appendChild(node);
  applyBox(node, box);
}

function autoFit(node) {
  requestAnimationFrame(() => {
    const h = node.clientHeight;
    const w = node.clientWidth;
    if (!h || !w) return;
    let size = Math.min(h * 0.7, w * 0.25);
    node.style.fontSize = size + "px";
    for (let i = 0; i < 20 && (node.scrollWidth > w || node.scrollHeight > h); i++) {
      size *= 0.9;
      node.style.fontSize = size + "px";
    }
  });
}
