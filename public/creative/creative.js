// The creative is fully parameterised by query string so a single HTML file
// services every IAB size / match / layout combination. This is what the ad
// server ultimately embeds (via <iframe> or an AdTag that points at the same
// URL with different params).

(async function () {
  const qs = new URLSearchParams(location.search);
  const matchId = qs.get("match");
  const sizeId  = qs.get("size") || "medium-rectangle";
  const custom  = qs.get("layout"); // optional base64 JSON override

  const [sizeInfo, match] = await Promise.all([
    fetch(`/api/sizes/${encodeURIComponent(sizeId)}`).then((r) => r.json()),
    matchId
      ? fetch(`/api/fixtures/${encodeURIComponent(matchId)}`).then((r) => r.json())
      : fetch(`/api/fixtures`).then((r) => r.json()).then((list) => list[0] || null)
  ]);

  if (!sizeInfo || !sizeInfo.size) {
    document.body.textContent = "Unknown ad size";
    return;
  }
  if (!match) {
    document.body.textContent = "No fixture available";
    return;
  }

  const layout = custom
    ? JSON.parse(atob(decodeURIComponent(custom)))
    : sizeInfo.layout;

  const el = document.getElementById("creative");
  el.style.setProperty("--w", sizeInfo.size.w + "px");
  el.style.setProperty("--h", sizeInfo.size.h + "px");

  // Static region position (percentages on the creative box).
  const sr = layout.staticRegion;
  el.style.setProperty("--sx", sr.x + "%");
  el.style.setProperty("--sy", sr.y + "%");
  el.style.setProperty("--sw", sr.w + "%");
  el.style.setProperty("--sh", sr.h + "%");

  // Optional base image (e.g. hero art uploaded per campaign).
  if (sizeInfo.baseImage) {
    el.style.setProperty("--base-image", `url("${sizeInfo.baseImage}")`);
  }

  document.getElementById("staticBanner").textContent = buildBannerText(match);

  // Build dynamic slots.
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

  // Expose a flag external ad containers can poll to know we've rendered.
  window.__creativeReady = true;
})();

function buildBannerText(match) {
  const d = new Date(match.kickoff);
  const day = d.getUTCDate();
  const month = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase();
  const year = d.getUTCFullYear();
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC"
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
  const node = el("div", { class: "slot transparent", parent });
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.onerror = () => { img.src = "/logos/_placeholder.svg"; };
  node.appendChild(img);
  applyBox(node, box);
}

function placeText(parent, box, text, cls) {
  const node = el("div", { class: `slot ${cls}`, parent });
  node.textContent = text;
  if (!applyBox(node, box)) { node.remove(); return; }
  autoFit(node, text);
}

function placeOdds(parent, box, pick, value, extraCls) {
  const node = el("div", { class: `slot odds ${extraCls || ""}`, parent });
  const p = document.createElement("div"); p.className = "pick"; p.textContent = pick;
  const v = document.createElement("div"); v.className = "val";  v.textContent = (value ?? "-").toString();
  node.appendChild(p); node.appendChild(v);
  if (!applyBox(node, box)) node.remove();
}

function placeBanda(parent, box) {
  const node = el("div", { class: "slot banda-logo", parent });
  node.innerHTML = '<span class="banda"><span class="a">Banda</span><span class="b">bets.com</span></span>';
  if (!applyBox(node, box)) node.remove();
}

function el(tag, { class: cls, parent }, _txt, cb) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (cb) cb(n);
  if (parent) parent.appendChild(n);
  return n;
}

// Reduce font-size until the text fits its slot. Keeps a single stylesheet
// viable across 320x50 mobile banners and 970x250 billboards.
function autoFit(node, text) {
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
