import { IAB_SIZES, layoutForSize, listFixtures } from "./js/core.js";

const state = {
  fixtures: [],
  matchId: null,
  sizeId: null,
  layout: null,
  baseLayout: null
};

const ELEMENTS = [
  { key: "teamALogo", label: "Home team logo" },
  { key: "teamAName", label: "Home team name" },
  { key: "odds1",     label: "Home win odds (1)" },
  { key: "oddsX",     label: "Draw odds (X)" },
  { key: "odds2",     label: "Away win odds (2)" },
  { key: "teamBLogo", label: "Away team logo" },
  { key: "teamBName", label: "Away team name" },
  { key: "bandaLogo", label: "Bandabets.com logo" },
  { key: "staticRegion", label: "Static hero region", staticRegion: true }
];

const $ = (id) => document.getElementById(id);

async function boot() {
  state.fixtures = await listFixtures();

  fillOptions($("size"), IAB_SIZES, (s) => s.id, (s) => `${s.name} · ${s.w}×${s.h}`);
  fillOptions($("fixture"), state.fixtures, (f) => f.id,
    (f) => `${f.home.name} vs ${f.away.name} · ${new Date(f.kickoff).toUTCString().slice(5, 22)}`
  );

  state.sizeId = IAB_SIZES[0].id;
  state.matchId = state.fixtures[0]?.id || null;
  $("size").value = state.sizeId;
  $("fixture").value = state.matchId;

  $("size").addEventListener("change", (e) => { state.sizeId = e.target.value; loadLayoutAndRender(); });
  $("fixture").addEventListener("change", (e) => { state.matchId = e.target.value; updateMatchMeta(); refreshPreview(); });
  $("resetLayout").addEventListener("click", () => { state.layout = clone(state.baseLayout); renderPlacementTable(); refreshPreview(); });
  $("copyLayout").addEventListener("click", () => navigator.clipboard.writeText(JSON.stringify(state.layout, null, 2)));
  $("copySnippet").addEventListener("click", () => navigator.clipboard.writeText($("snippet").value));

  loadLayoutAndRender();
  updateMatchMeta();
}

function loadLayoutAndRender() {
  const info = layoutForSize(state.sizeId);
  state.baseLayout = clone(info.layout);
  state.layout = clone(info.layout);
  $("sizeMeta").textContent = `${info.size.w} × ${info.size.h}px · preset: ${info.size.preset}`;
  renderPlacementTable();
  refreshPreview();
}

function renderPlacementTable() {
  const tbody = $("placementTable").querySelector("tbody");
  tbody.innerHTML = "";
  for (const elDef of ELEMENTS) {
    const box = elDef.staticRegion ? state.layout.staticRegion : state.layout.dynamic[elDef.key];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="name">${elDef.label}</td>
      <td><input type="number" step="0.5" data-axis="x" value="${box ? box.x : ""}"/></td>
      <td><input type="number" step="0.5" data-axis="y" value="${box ? box.y : ""}"/></td>
      <td><input type="number" step="0.5" data-axis="w" value="${box ? box.w : ""}"/></td>
      <td><input type="number" step="0.5" data-axis="h" value="${box ? box.h : ""}"/></td>
      <td class="del">${box && !elDef.staticRegion ? `<button data-remove="${elDef.key}">×</button>` : ""}</td>
    `;
    row.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("input", () => {
        const axis = inp.dataset.axis;
        const val = Number(inp.value);
        if (elDef.staticRegion) {
          state.layout.staticRegion[axis] = val;
        } else {
          if (!state.layout.dynamic[elDef.key]) state.layout.dynamic[elDef.key] = { x: 0, y: 0, w: 10, h: 10 };
          state.layout.dynamic[elDef.key][axis] = val;
        }
        refreshPreview();
      });
    });
    const removeBtn = row.querySelector("[data-remove]");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        delete state.layout.dynamic[removeBtn.dataset.remove];
        renderPlacementTable();
        refreshPreview();
      });
    }
    tbody.appendChild(row);
  }
}

function refreshPreview() {
  const size = IAB_SIZES.find((s) => s.id === state.sizeId);
  if (!size) return;
  const frame = $("stageFrame");
  const iframe = $("preview");
  frame.style.width = size.w + "px";
  frame.style.height = size.h + "px";
  iframe.width = size.w;
  iframe.height = size.h;

  const layoutParam = encodeURIComponent(btoa(JSON.stringify(state.layout)));
  const creativeUrl =
    `./creative/?size=${encodeURIComponent(state.sizeId)}` +
    (state.matchId ? `&match=${encodeURIComponent(state.matchId)}` : "") +
    `&layout=${layoutParam}`;
  iframe.src = creativeUrl;

  $("stageDims").textContent = `${size.w} × ${size.h}px`;
  $("stageTitle").textContent = `${size.name} — live preview`;

  // Build an absolute ad-tag URL (no layout param → preset).
  const absoluteBase = new URL("./creative/", location.href);
  const embedUrl =
    absoluteBase.toString() +
    `?size=${encodeURIComponent(state.sizeId)}` +
    (state.matchId ? `&match=${encodeURIComponent(state.matchId)}` : "");
  const snippet =
    `<iframe src="${embedUrl}" width="${size.w}" height="${size.h}" ` +
    `frameborder="0" scrolling="no" marginheight="0" marginwidth="0" ` +
    `style="border:0;display:block"></iframe>`;
  $("snippet").value = snippet;
  $("openCreative").href = embedUrl;
}

function updateMatchMeta() {
  const m = state.fixtures.find((f) => f.id === state.matchId);
  if (!m) { $("matchMeta").textContent = ""; return; }
  const line =
    `${iconTag(m.home.logo)} ${m.home.name} (${m.odds.home}) ` +
    `· Draw (${m.odds.draw}) · ` +
    `${m.away.name} (${m.odds.away}) ${iconTag(m.away.logo)}`;
  $("matchMeta").innerHTML = line;
}

function iconTag(src) {
  return `<img src="${src}" alt="" style="height:14px;vertical-align:middle;"/>`;
}

function fillOptions(sel, items, val, label) {
  sel.innerHTML = "";
  for (const it of items) {
    const o = document.createElement("option");
    o.value = val(it);
    o.textContent = label(it);
    sel.appendChild(o);
  }
}

function clone(x) { return JSON.parse(JSON.stringify(x)); }

boot().catch((e) => {
  document.body.innerHTML = `<pre style="color:#ff6b6b;padding:20px">${e.stack || e.message}</pre>`;
});
