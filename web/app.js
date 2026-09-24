/* ===========================================================
   Signal Desk — frontend logic
   Talks to the FastAPI backend documented in the project README:
     GET  /health
     GET  /tickers
     GET  /correlation/{ticker}
     GET  /signals/{ticker}
     GET  /api/v1/price-data?ticker=
     GET  /evidence/{ticker}?date=
     GET  /search?query=&ticker=
     GET  /backtest/{ticker}
     GET  /api/v1/ml-metrics
   Falls back to generated demo data when any call is unreachable,
   so this frontend is fully browsable on its own.
=========================================================== */

const DEFAULT_TICKERS = [
  { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Semiconductors & AI" },
  { symbol: "AAPL", name: "Apple Inc.", sector: "Consumer Electronics" },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Software & Cloud" },
  { symbol: "TSLA", name: "Tesla, Inc.", sector: "Automotive / EV" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", sector: "E-Commerce & Cloud" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Search & AI" },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Social Media & AI" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors & AI" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Banking & Finance" },
  { symbol: "GS", name: "The Goldman Sachs Group", sector: "Investment Banking" },
  { symbol: "RELIANCE.NS", name: "Reliance Industries", sector: "Energy & Telecom (India)" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", sector: "IT Services (India)" },
  { symbol: "INFY.NS", name: "Infosys Limited", sector: "IT Services (India)" },
];

const saved = loadPersisted();

const state = {
  apiBase: (saved.apiBase || document.getElementById("apiBase").value).replace(/\/$/, ""),
  live: false,
  tickers: DEFAULT_TICKERS,
  active: saved.active || null,
  compare: saved.compare || null,
  compareOn: !!saved.compare,
  sectorFilter: saved.sectorFilter || null,
  kbdIndex: -1,
  regimeCache: new Map(),
  pollTimer: null,
};

const el = (id) => document.getElementById(id);

/* ----------------------- persistence ----------------------- */
function loadPersisted() {
  try { return JSON.parse(localStorage.getItem("signalDesk") || "{}"); }
  catch { return {}; }
}
function persist() {
  try {
    localStorage.setItem("signalDesk", JSON.stringify({
      apiBase: state.apiBase, active: state.active,
      compare: state.compare, sectorFilter: state.sectorFilter,
    }));
  } catch { /* storage unavailable — non-fatal */ }
}

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ----------------------- boot ----------------------- */
el("apiBase").value = state.apiBase;
renderSectorChips(state.tickers);
renderWatchlist(state.tickers);
selectTicker(state.active && state.tickers.some(t => t.symbol === state.active) ? state.active : state.tickers[0].symbol);
if (state.compare) { el("compareToggle").classList.add("active"); el("compareToggle").setAttribute("aria-pressed", "true"); el("compareBar").classList.add("show"); populateCompareSelect(); el("compareSelect").value = state.compare; }
tryConnect();

el("reconnectBtn").addEventListener("click", () => {
  state.apiBase = el("apiBase").value.replace(/\/$/, "");
  persist();
  tryConnect();
});
el("tickerFilter").addEventListener("input", debounce(applyFilters, 150));

el("recomputeBtn").addEventListener("click", async () => {
  if (!state.live) return;
  if (!confirm("Trigger a full correlation recompute across the ticker universe on the connected backend?")) return;
  try {
    await fetch(`${state.apiBase}/api/v1/recompute`, { method: "POST" });
    toast("Recompute triggered in the background.", "success");
  } catch {
    toast("Couldn't reach the recompute endpoint.", "error");
  }
});

el("helpBtn").addEventListener("click", () => { el("helpModal").hidden = false; el("helpClose").focus(); });
el("helpClose").addEventListener("click", () => { el("helpModal").hidden = true; el("helpBtn").focus(); });
el("helpModal").addEventListener("click", (e) => { if (e.target.id === "helpModal") el("helpModal").hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el("helpModal").hidden) el("helpModal").hidden = true; });
el("loadEvidenceBtn").addEventListener("click", () => {
  const d = el("evidenceDate").value;
  if (d) loadEvidence(state.active, d);
  else toast("Pick a date first.", "error");
});
el("searchBtn").addEventListener("click", runSearch);
el("searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });

el("compareToggle").addEventListener("click", () => {
  state.compareOn = !state.compareOn;
  el("compareToggle").classList.toggle("active", state.compareOn);
  el("compareToggle").setAttribute("aria-pressed", String(state.compareOn));
  el("compareBar").classList.toggle("show", state.compareOn);
  if (state.compareOn) populateCompareSelect();
  else clearCompare();
});
el("compareSelect").addEventListener("change", async (e) => {
  state.compare = e.target.value || null;
  persist();
  if (state.compare) {
    await loadTicker(state.active); // re-render with overlay
    toast(`Comparing ${state.active} against ${state.compare}`, "success");
  }
});
el("compareClear").addEventListener("click", clearCompare);

el("exportChartBtn").addEventListener("click", () => {
  const gd = el("correlationChart");
  if (!gd || !gd.data) return;
  Plotly.downloadImage(gd, { format: "png", filename: `${state.active || "signal"}_correlation`, width: 1000, height: 500 });
  toast("Chart exported as PNG.", "success");
});

el("watchlist").addEventListener("keydown", (e) => {
  const items = [...document.querySelectorAll(".wl-item")];
  if (!items.length) return;
  if (e.key === "ArrowDown") { e.preventDefault(); state.kbdIndex = Math.min(state.kbdIndex + 1, items.length - 1); focusItem(items); }
  else if (e.key === "ArrowUp") { e.preventDefault(); state.kbdIndex = Math.max(state.kbdIndex - 1, 0); focusItem(items); }
  else if (e.key === "Enter" && state.kbdIndex >= 0) { items[state.kbdIndex].click(); }
});
function focusItem(items) {
  items.forEach(i => i.classList.remove("kbd-focus"));
  const target = items[state.kbdIndex];
  if (target) { target.classList.add("kbd-focus"); target.scrollIntoView({ block: "nearest" }); }
}

/* ----------------------- toasts ----------------------- */
function toast(message, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  el("toastContainer").appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

/* ----------------------- connection ----------------------- */
async function tryConnect() {
  setStatus("checking");
  state.regimeCache.clear();
  try {
    const res = await fetchJSON(`${state.apiBase}/health`, 3500);
    state.live = true;
    setStatus("live", `live · ${res.total_articles ?? 0} articles`);
    toast("Connected to live API.", "success");

    const t = await fetchJSON(`${state.apiBase}/tickers`, 3500).catch(() => null);
    if (t?.tickers?.length) {
      state.tickers = t.tickers;
      renderSectorChips(state.tickers);
      renderWatchlist(state.tickers);
    }
    updateKPIs(res);
  } catch (err) {
    state.live = false;
    setStatus("demo");
    toast("Couldn't reach API — showing demo data.", "error");
    updateKPIs(null);
  }
  loadTicker(state.active);
}

function setStatus(mode, text) {
  const pill = el("statusPill");
  pill.className = `status-pill ${mode === "checking" ? "demo" : mode}`;
  el("statusText").textContent =
    mode === "checking" ? "connecting…" :
    mode === "live" ? (text || "live") :
    "demo data";
  el("demoBanner").classList.toggle("show", mode !== "live");
  el("recomputeBtn").disabled = mode !== "live";

  clearInterval(state.pollTimer);
  if (mode === "live") {
    state.pollTimer = setInterval(async () => {
      const h = await fetchJSON(`${state.apiBase}/health`, 3000).catch(() => null);
      if (h) { el("statusText").textContent = `live · ${h.total_articles ?? 0} articles`; updateKPIs(h); }
      else { state.live = false; setStatus("demo"); toast("Lost connection to the API — back to demo data.", "error"); }
    }, 30000);
  }
}

/* ----------------------- KPI strip ----------------------- */
async function updateKPIs(health) {
  pulseSet("kpiTickers", (state.tickers.length).toString());

  if (state.live && health) {
    pulseSet("kpiArticles", health.total_articles?.toLocaleString() ?? "—");
    pulseSet("kpiLastRun", formatRelative(health.last_correlation_run));
  } else {
    pulseSet("kpiArticles", (12000 + Math.floor(Math.random() * 4000)).toLocaleString());
    pulseSet("kpiLastRun", "demo");
  }

  const bt = state.live
    ? await fetchJSON(`${state.apiBase}/backtest/${state.active}`).catch(() => null)
    : null;
  const btAcc = bt?.accuracy ?? bt?.backtest_accuracy ?? (0.6 + Math.random() * 0.18);
  pulseSet("kpiBacktest", `${(btAcc * 100).toFixed(1)}%`);

  const ml = state.live
    ? await fetchJSON(`${state.apiBase}/api/v1/ml-metrics`).catch(() => null)
    : null;
  const mlAcc = ml?.test_high_confidence?.accuracy ?? (0.85 + Math.random() * 0.08);
  pulseSet("kpiModel", `${(mlAcc * 100).toFixed(1)}%`);
}

function pulseSet(id, value) {
  const node = el(id);
  node.textContent = value;
  node.classList.remove("pulse");
  void node.offsetWidth;
  node.classList.add("pulse");
}

function formatRelative(iso) {
  if (!iso || iso === "Never") return "never";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/* ----------------------- sector chips + filtering ----------------------- */
function renderSectorChips(list) {
  const sectors = [...new Set(list.map(t => t.sector))].sort();
  const box = el("sectorChips");
  box.innerHTML = `<span class="chip ${!state.sectorFilter ? "active" : ""}" data-sector="">all</span>` +
    sectors.map(s => `<span class="chip ${state.sectorFilter === s ? "active" : ""}" data-sector="${escapeHtml(s)}">${escapeHtml(shortSector(s))}</span>`).join("");
  [...box.querySelectorAll(".chip")].forEach(chip => {
    chip.addEventListener("click", () => {
      state.sectorFilter = chip.dataset.sector || null;
      persist();
      renderSectorChips(state.tickers);
      applyFilters();
    });
  });
}
function shortSector(s) { return s.split(" & ")[0].split(" (")[0]; }

function applyFilters() {
  const q = el("tickerFilter").value.trim().toUpperCase();
  const filtered = state.tickers.filter(t => {
    const matchesText = !q || t.symbol.includes(q) || t.name.toUpperCase().includes(q) || t.sector.toUpperCase().includes(q);
    const matchesSector = !state.sectorFilter || t.sector === state.sectorFilter;
    return matchesText && matchesSector;
  });
  renderWatchlist(filtered);
}

/* ----------------------- watchlist ----------------------- */
function renderWatchlist(list) {
  const bySector = {};
  list.forEach(t => { (bySector[t.sector] ||= []).push(t); });

  const container = el("watchlist");
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = `<p class="evidence-empty">No tickers match.</p>`;
    return;
  }
  Object.keys(bySector).sort().forEach(sector => {
    const label = document.createElement("div");
    label.className = "wl-sector";
    label.textContent = sector;
    container.appendChild(label);

    bySector[sector].forEach(t => {
      const item = document.createElement("div");
      item.className = "wl-item" + (t.symbol === state.active ? " active" : "");
      item.setAttribute("role", "option");
      item.innerHTML = `<span class="wl-symbol-wrap"><i class="wl-dot" data-symbol="${t.symbol}"></i><span class="wl-symbol">${t.symbol}</span></span><span class="wl-name">${escapeHtml(t.name)}</span>`;
      item.addEventListener("click", () => selectTicker(t.symbol));
      container.appendChild(item);
      loadRegimeDot(t.symbol, item.querySelector(".wl-dot"));
    });
  });
}

async function loadRegimeDot(symbol, dotEl) {
  if (!dotEl) return;
  if (state.regimeCache.has(symbol)) {
    applyRegimeClass(dotEl, state.regimeCache.get(symbol));
    return;
  }
  const c = state.live
    ? await fetchJSON(`${state.apiBase}/correlation/${symbol}`, 4000).catch(() => demoCorrelation(symbol))
    : demoCorrelation(symbol);
  const regime = (c.lead_lag_classification || "").toLowerCase();
  state.regimeCache.set(symbol, regime);
  // element may have been re-rendered by a filter change in the meantime — re-select by symbol
  const live = document.querySelector(`.wl-dot[data-symbol="${cssEscape(symbol)}"]`);
  applyRegimeClass(live || dotEl, regime);
}
function applyRegimeClass(dotEl, regime) {
  dotEl.classList.remove("lead", "lag", "coincident");
  if (/lead/.test(regime)) dotEl.classList.add("lead");
  else if (/lag/.test(regime)) dotEl.classList.add("lag");
  else if (regime) dotEl.classList.add("coincident");
}
function cssEscape(s) { return String(s).replace(/[^a-zA-Z0-9_-]/g, m => `\\${m}`); }

function selectTicker(symbol) {
  state.active = symbol;
  persist();
  const meta = state.tickers.find(t => t.symbol === symbol) || {};
  el("activeTicker").textContent = symbol;
  el("activeSector").textContent = meta.sector || "—";
  [...document.querySelectorAll(".wl-item")].forEach(n => {
    n.classList.toggle("active", n.querySelector(".wl-symbol")?.textContent === symbol);
  });
  if (state.compare === symbol) clearCompare();
  loadTicker(symbol);
}

/* ----------------------- compare mode ----------------------- */
function populateCompareSelect() {
  const sel = el("compareSelect");
  sel.innerHTML = `<option value="">select ticker…</option>` +
    state.tickers.filter(t => t.symbol !== state.active)
      .map(t => `<option value="${t.symbol}">${t.symbol} — ${escapeHtml(t.name)}</option>`).join("");
}
function clearCompare() {
  state.compare = null;
  persist();
  el("compareSelect").value = "";
  loadTicker(state.active);
}

/* ----------------------- data loading ----------------------- */
async function loadTicker(symbol) {
  if (!symbol) return;
  toggleLoading(true);

  const correlation = state.live
    ? await fetchJSON(`${state.apiBase}/correlation/${symbol}`).catch(() => demoCorrelation(symbol))
    : demoCorrelation(symbol);

  const signals = state.live
    ? await fetchJSON(`${state.apiBase}/signals/${symbol}`).catch(() => demoSignals(symbol))
    : demoSignals(symbol);

  const prices = state.live
    ? await fetchJSON(`${state.apiBase}/api/v1/price-data?ticker=${symbol}`).catch(() => demoPrices(symbol))
    : demoPrices(symbol);

  let compareCorrelation = null;
  if (state.compare) {
    compareCorrelation = state.live
      ? await fetchJSON(`${state.apiBase}/correlation/${state.compare}`).catch(() => demoCorrelation(state.compare))
      : demoCorrelation(state.compare);
  }

  renderCorrelationChart(correlation, compareCorrelation);
  renderOverlayChart(signals, prices);
  el("evidenceList").innerHTML = `<p class="evidence-empty">Select a date on the chart above, or pick one and press load.</p>`;
  el("lastUpdated").textContent = `updated ${new Date().toLocaleTimeString()}`;
  updateKPIs(state.live ? { total_articles: null, last_correlation_run: correlation.calculated_at } : null);
  toggleLoading(false);
}

function toggleLoading(isLoading) {
  ["correlationChart", "overlayChart"].forEach(id => el(id).classList.toggle("loading", isLoading));
}

async function fetchJSON(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------- correlation chart ----------------------- */
function renderCorrelationChart(c, compareC) {
  const lags = c.lags;
  const r = c.pearson_r;
  const lower = c.ci_lower;
  const upper = c.ci_upper;

  const band = {
    x: [...lags, ...[...lags].reverse()],
    y: [...upper, ...[...lower].reverse()],
    fill: "toself",
    fillcolor: "rgba(232,163,61,0.10)",
    line: { color: "transparent" },
    hoverinfo: "skip",
    showlegend: false,
    type: "scatter",
  };
  const line = {
    x: lags, y: r,
    mode: "lines+markers",
    line: { color: "#E8A33D", width: 2 },
    marker: { size: 5, color: "#E8A33D" },
    name: c.ticker || state.active,
    type: "scatter",
  };
  const zero = {
    x: lags, y: lags.map(() => 0),
    mode: "lines",
    line: { color: "#2A3448", width: 1, dash: "dot" },
    hoverinfo: "skip",
    showlegend: false,
    type: "scatter",
  };

  const traces = [band, zero, line];
  if (compareC) {
    traces.push({
      x: compareC.lags, y: compareC.pearson_r,
      mode: "lines+markers",
      line: { color: "#4F8FE8", width: 2, dash: "dash" },
      marker: { size: 4, color: "#4F8FE8" },
      name: compareC.ticker || state.compare,
      type: "scatter",
    });
  }

  const chartLayout = layout({ title: "lag (trading days)" }, { title: "correlation" });
  if (compareC) { chartLayout.showlegend = true; chartLayout.legend = { orientation: "h", y: -0.22, font: { color: "#8D96AA", size: 10 } }; }

  Plotly.newPlot("correlationChart", traces, chartLayout, plotlyConfig());

  el("statOptimalLag").textContent = `${c.optimal_lag > 0 ? "+" : ""}${c.optimal_lag}d`;
  el("statPeakR").textContent = c.max_correlation.toFixed(3);
  el("statPValue").textContent = c.p_value_at_optimal.toFixed(3);
  const regime = c.lead_lag_classification || "—";
  el("statRegime").textContent = regime.replace(/_/g, " ").toLowerCase();
  el("statRegime").style.color =
    /lead/i.test(regime) ? "var(--lead)" :
    /lag/i.test(regime) ? "var(--lag)" : "var(--coincident)";
}

/* ----------------------- price / signal overlay ----------------------- */
function renderOverlayChart(signals, prices) {
  const sig = signals.signals || [];
  const prc = prices.records || [];

  const priceTrace = {
    x: prc.map(p => p.date), y: prc.map(p => p.close),
    yaxis: "y1", type: "scatter", mode: "lines",
    line: { color: "#EDEFF4", width: 1.6 },
    name: "close",
  };
  const signalTrace = {
    x: sig.map(s => s.date), y: sig.map(s => s.signal_value),
    yaxis: "y2", type: "scatter", mode: "lines",
    line: { color: "#4F8FE8", width: 1.6 },
    name: "news-vector signal",
  };

  const layoutOverlay = layout({ title: "" }, { title: "price", side: "left" });
  layoutOverlay.yaxis2 = {
    title: "signal", overlaying: "y", side: "right",
    gridcolor: "transparent", color: "#8D96AA", zeroline: false,
  };
  layoutOverlay.legend = { orientation: "h", y: -0.22, font: { color: "#8D96AA", size: 10 } };
  layoutOverlay.showlegend = true;

  Plotly.newPlot("overlayChart", [priceTrace, signalTrace], layoutOverlay, plotlyConfig());

  document.getElementById("overlayChart").on("plotly_click", (evt) => {
    const date = evt.points?.[0]?.x;
    if (date) {
      el("evidenceDate").value = date.slice(0, 10);
      loadEvidence(state.active, date.slice(0, 10));
    }
  });
}

function layout(xaxis, yaxis) {
  return {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    margin: { l: 46, r: 46, t: 8, b: 34 },
    font: { family: "IBM Plex Mono, monospace", color: "#8D96AA", size: 10.5 },
    xaxis: { ...xaxis, gridcolor: "#1C2436", color: "#8D96AA", zeroline: false },
    yaxis: { ...yaxis, gridcolor: "#1C2436", color: "#8D96AA", zeroline: false },
    showlegend: false,
  };
}
function plotlyConfig() {
  return { displayModeBar: false, responsive: true };
}

/* ----------------------- evidence ----------------------- */
async function loadEvidence(symbol, date) {
  const list = el("evidenceList");
  list.innerHTML = `<p class="evidence-empty">Loading…</p>`;
  const data = state.live
    ? await fetchJSON(`${state.apiBase}/evidence/${symbol}?date=${date}`).catch(() => demoEvidence(symbol, date))
    : demoEvidence(symbol, date);

  const articles = data.evidence_articles || [];
  if (!articles.length) {
    list.innerHTML = `<p class="evidence-empty">No articles found for ${date}.</p>`;
    return;
  }
  list.innerHTML = articles.map(articleCard).join("");
}

function articleCard(a) {
  return `
    <div class="evidence-item">
      <div class="evidence-item-top">
        <div class="evidence-headline">${escapeHtml(a.headline || "Untitled")}</div>
        <div class="evidence-meta">${(a.source || "").toUpperCase()} · ${(a.date || a.published_at || "").slice(0,10)}</div>
      </div>
      <div class="evidence-snippet">${escapeHtml(a.raw_text_snippet || "")}</div>
    </div>`;
}

/* ----------------------- search ----------------------- */
async function runSearch() {
  const q = el("searchInput").value.trim();
  if (!q) { toast("Type something to search for.", "error"); return; }
  const box = el("searchResults");
  box.innerHTML = `<p class="evidence-empty">Searching…</p>`;

  const data = state.live
    ? await fetchJSON(`${state.apiBase}/search?query=${encodeURIComponent(q)}&ticker=${state.active}`).catch(() => demoSearch(q))
    : demoSearch(q);

  const results = data.results || [];
  if (!results.length) {
    box.innerHTML = `<p class="evidence-empty">No matches.</p>`;
    return;
  }
  box.innerHTML = results.map(r => `
    <div class="evidence-item">
      <div class="evidence-item-top">
        <div class="evidence-headline">${escapeHtml(r.headline || "Untitled")}</div>
        <div class="evidence-meta">${(r.source || "").toUpperCase()}</div>
      </div>
      <div class="evidence-snippet">${escapeHtml(r.raw_text_snippet || "")}</div>
      ${r.similarity_score != null ? `<span class="evidence-score">similarity ${r.similarity_score.toFixed(3)}</span>` : ""}
    </div>`).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

/* ----------------------- demo data generator ----------------------- */
function seedFromSymbol(symbol) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
}

function demoCorrelation(symbol) {
  const rand = seedFromSymbol(symbol + "corr");
  const lags = Array.from({ length: 11 }, (_, i) => i - 5);
  const optimal = Math.floor(rand() * 5) - 2;
  const peak = 0.25 + rand() * 0.4;
  const pearson_r = lags.map(l => {
    const dist = Math.abs(l - optimal);
    return +(peak * Math.exp(-0.35 * dist * dist) + (rand() - 0.5) * 0.03).toFixed(4);
  });
  const ci_lower = pearson_r.map(v => +(v - 0.12 - rand() * 0.05).toFixed(4));
  const ci_upper = pearson_r.map(v => +(v + 0.12 + rand() * 0.05).toFixed(4));
  const classification = optimal < -1 ? "LEADING_SIGNAL" : optimal > 1 ? "LAGGING_SIGNAL" : "COINCIDENT";
  return {
    ticker: symbol, lags, pearson_r, ci_lower, ci_upper,
    optimal_lag: optimal,
    max_correlation: Math.max(...pearson_r),
    p_value_at_optimal: +(0.001 + rand() * 0.04).toFixed(4),
    lead_lag_classification: classification,
    sample_size: 480 + Math.floor(rand() * 40),
    backtest_accuracy: 0.6 + rand() * 0.2,
    calculated_at: new Date().toISOString(),
  };
}

function demoSignals(symbol) {
  const rand = seedFromSymbol(symbol + "sig");
  const days = 60;
  const start = new Date(); start.setDate(start.getDate() - days);
  let v = 0;
  const signals = Array.from({ length: days }, (_, i) => {
    v += (rand() - 0.5) * 0.4;
    const d = new Date(start); d.setDate(d.getDate() + i);
    return { date: d.toISOString().slice(0, 10), signal_value: +v.toFixed(3), article_count: 1 + Math.floor(rand() * 6) };
  });
  return { ticker: symbol, total_days: days, signals };
}

function demoPrices(symbol) {
  const rand = seedFromSymbol(symbol + "px");
  const days = 60;
  const start = new Date(); start.setDate(start.getDate() - days);
  let price = 80 + rand() * 300;
  const records = Array.from({ length: days }, (_, i) => {
    price *= 1 + (rand() - 0.48) * 0.03;
    const d = new Date(start); d.setDate(d.getDate() + i);
    return { date: d.toISOString().slice(0, 10), open: price, high: price * 1.01, low: price * 0.99, close: +price.toFixed(2), volume: 1e6 };
  });
  return { ticker: symbol, records };
}

function demoEvidence(symbol, date) {
  const rand = seedFromSymbol(symbol + date);
  const headlines = [
    `${symbol} guidance revised after analyst briefing`,
    `${symbol} supply chain update draws investor attention`,
    `Institutional flows shift on ${symbol} sector outlook`,
    `${symbol} product roadmap leak circulates among traders`,
  ];
  const n = 1 + Math.floor(rand() * 3);
  const evidence_articles = Array.from({ length: n }, (_, i) => ({
    article_id: `demo_${i}`,
    headline: headlines[Math.floor(rand() * headlines.length)],
    source: ["Yahoo Finance", "Reuters", "Google News"][Math.floor(rand() * 3)],
    date,
    raw_text_snippet: "Generated demo snippet — connect a live backend to see real article evidence for this date.",
  }));
  return { ticker: symbol, date, evidence_articles };
}

function demoSearch(query) {
  const rand = seedFromSymbol(query);
  const n = 2 + Math.floor(rand() * 3);
  const results = Array.from({ length: n }, (_, i) => ({
    headline: `Demo match ${i + 1} for "${query}"`,
    source: "Demo Index",
    raw_text_snippet: "This is a generated placeholder result. Connect a live backend to search the real vector store.",
    similarity_score: +(0.9 - i * 0.08 - rand() * 0.05).toFixed(3),
  }));
  return { results };
}
