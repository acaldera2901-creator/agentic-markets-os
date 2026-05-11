/* Agentic Markets OS — app.js */

const SPORTS_URL = "https://agentic-markets-roan.vercel.app";
const CRYPTO_URL = "https://meme-coin-control-center.vercel.app";
const OS_URL     = "https://agentic-markets-os.vercel.app";
const API_BASE   = window.location.protocol === "file:" ? OS_URL : "";

// ── DOM helpers ────────────────────────────────────────────────
const $   = (id)    => document.getElementById(id);
const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };

function setFlash(id, v) {
  const el = $(id);
  if (!el) return;
  if (el.textContent === String(v)) return;
  el.textContent = v;
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

function setScore(id, pct) {
  const el = $(id);
  if (!el) return;
  requestAnimationFrame(() => {
    el.style.width = `${Math.max(0, Math.min(100, Number(pct) || 0))}%`;
  });
}

function fmtPnl(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}$${Math.abs(n).toFixed(2)}`;
}

// ── Agent dots ─────────────────────────────────────────────────
function renderAgentDots(agents) {
  const bar = $("sportsAgentBar");
  if (!bar || !Array.isArray(agents)) return;
  const label = bar.querySelector(".agent-row-label");
  bar.innerHTML = "";
  if (label) bar.appendChild(label.cloneNode(true));

  for (const a of agents) {
    const wrap = document.createElement("div");
    wrap.className = "agent-wrap";

    const dot = document.createElement("div");
    dot.className = `adot ${a.status}`;

    const tip = document.createElement("div");
    tip.className = "agent-tip";
    tip.textContent = a.name;

    wrap.appendChild(dot);
    wrap.appendChild(tip);
    bar.appendChild(wrap);
  }
}

// ── Badge helper ───────────────────────────────────────────────
function setBadge(id, state) {
  const el = $(id);
  if (!el) return;
  const labels = { online: "ONLINE", ok: "ONLINE", offline: "OFFLINE", warning: "WARNING", degraded: "DEGRADED" };
  el.textContent = labels[state] ?? state.toUpperCase();
  el.className = "desk-badge " + (
    state === "online" || state === "ok" ? "positive" :
    state === "offline"                  ? "negative" : "neutral"
  );
}

// ── Render: Football desk ──────────────────────────────────────
function renderSportsDesk(sports) {
  if (!sports?.ok) {
    setFlash("sportsStatus", "OFFLINE");
    $("sportsStatus") && ($("sportsStatus").className = "hstat-val negative");
    setBadge("sportsBadge", "offline");
    set("sportsHealth", "error");
    return;
  }

  const h = sports.agents  || {};
  const s = sports.summary || {};
  const state = sports.health === "ok" ? "ok" : sports.health || "warning";

  setFlash("sportsStatus", state === "ok" ? "ONLINE" : state.toUpperCase());
  $("sportsStatus") && ($("sportsStatus").className = "hstat-val " + (state === "ok" ? "positive" : "neutral"));
  setBadge("sportsBadge", state);

  setFlash("sportsHealth",  `${h.alive ?? 0}/${h.total ?? 0} alive`);
  setFlash("sportsAgents",  `${h.alive ?? 0}/${h.total ?? 0}`);
  setFlash("kpiAgents",     `${h.alive ?? 0}/${h.total ?? 0}`);
  set("kpiAgentsSub",       h.offline ? `${h.offline} offline` : "all active");
  setFlash("sportsBets",    String(s.total_bets ?? 0));
  setFlash("kpiBets",       String(s.total_bets ?? 0));
  setFlash("sportsPnl",     fmtPnl(s.pnl));
  setFlash("kpiPnl",        fmtPnl(s.pnl));

  if (Array.isArray(sports.agentList)) renderAgentDots(sports.agentList);
}

// ── Render: Crypto desk ────────────────────────────────────────
function renderCryptoDesk(crypto) {
  if (!crypto?.ok) {
    setFlash("cryptoStatus", "OFFLINE");
    $("cryptoStatus") && ($("cryptoStatus").className = "hstat-val negative");
    setBadge("cryptoBadge", "offline");
    return;
  }

  const btc    = crypto.btc                 || {};
  const config = crypto.optimizer?.config   || {};
  const diag   = crypto.optimizer?.diagnostics || {};
  const obs    = crypto.sheets?.observations ?? 0;

  setFlash("cryptoStatus",    "ONLINE");
  $("cryptoStatus") && ($("cryptoStatus").className = "hstat-val positive");
  setBadge("cryptoBadge", "online");

  set("storageStatus",        crypto.storage?.provider || "unknown");
  setFlash("riskMode",        config.mode || "adaptive");
  setFlash("researchSamples", String(obs));
  setFlash("btcCycles",       String(btc.cycles ?? "—"));
  setFlash("optimizerMode",   config.mode || "—");
  setFlash("cryptoObservations", String(obs));
  setFlash("kpiObs",          String(obs));
  setFlash("kpiRiskMode",     config.mode || "—");
  setFlash("btcPosition",     btc.position ? btc.position.side : "FLAT");
  setFlash("cryptoReadiness", `${diag.readiness ?? "—"}/100`);
  setFlash("cleanMissed",     String(diag.cleanMissed ?? "—"));
  setFlash("badEntries",      String(diag.badEntries  ?? "—"));

  const rat = config.rationale || "Optimizer online.";
  const ratEl = $("optimizerRationale");
  if (ratEl && ratEl.textContent !== rat) ratEl.textContent = rat;
}

// ── Render: OS status ──────────────────────────────────────────
function renderOsStatus(status) {
  const sportsOk    = Boolean(status.sports?.ok);
  const cryptoOk    = Boolean(status.crypto?.ok);
  const alive       = Number(status.sports?.agents?.alive ?? 0);
  const total       = Number(status.sports?.agents?.total ?? 0);
  const storage     = status.crypto?.storage?.provider || "unknown";
  const score       = status.os?.systemScore ?? 0;

  const label = status.os?.label
    ? status.os.label.toUpperCase()
    : sportsOk && cryptoOk && alive === total ? "ONLINE"
    : sportsOk && cryptoOk ? "DEGRADED" : "CHECK";

  const osEl = $("osStatus");
  if (osEl) {
    osEl.textContent = label;
    osEl.className = "os-card-val " + (
      score >= 85 ? "positive" : score >= 60 ? "neutral" : "negative"
    );
  }

  set("osStatusDetail",
    `Football ${alive}/${total} agents · Crypto ${cryptoOk ? "online" : "offline"} · Storage ${storage}`
  );

  setFlash("systemScore",       `${score}/100`);
  setFlash("systemScoreHeader", `${score}/100`);
  setScore("systemScoreBar", score);
}

// ── Render: Alerts ─────────────────────────────────────────────
function renderAlerts(status) {
  const alerts = status.os?.alerts || [];
  const list   = $("alertsList");
  const badge  = $("alertsBadge");

  if (badge) {
    badge.textContent = alerts.length ? `${alerts.length} active` : "All clear";
    badge.className   = alerts.length ? "chip chip-amber" : "chip chip-green";
  }

  if (!list) return;

  if (!alerts.length) {
    list.innerHTML = `
      <div class="alert-empty">
        <span>✓</span>
        No active exceptions across all desks.
      </div>`;
    return;
  }

  list.innerHTML = alerts.map(a => `
    <div class="alert-item ${a.level === "critical" ? "critical" : ""}">
      <span class="alert-desk">${a.desk}</span>
      <span class="alert-msg">${a.message}</span>
    </div>`).join("");
}

// ── Render: Market roadmap ─────────────────────────────────────
function renderMarkets(status) {
  for (const m of (status.os?.markets || [])) {
    const el = $(`market-${m.id}`);
    if (el) el.textContent = `${m.status} · score ${m.score}/100 · ${m.priority}`;
  }
}

// ── Last-refresh ticker ────────────────────────────────────────
let lastRefresh = null;

function tickTime() {
  const el = $("lastUpdateTime");
  if (!el || !lastRefresh) return;
  const s = Math.round((Date.now() - lastRefresh) / 1000);
  el.textContent = s < 5 ? "Just refreshed" : `Updated ${s}s ago`;
}

// ── Fetch helper ───────────────────────────────────────────────
async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
  return d;
}

// ── Main refresh ───────────────────────────────────────────────
async function refreshAll() {
  const btn = $("refreshBtn");
  if (btn) btn.classList.add("spinning");

  set("sportsStatus", "SYNC");
  set("cryptoStatus", "SYNC");

  try {
    const status = await fetchJson(`${API_BASE}/api/os-status`);
    lastRefresh = Date.now();
    renderOsStatus(status);
    renderSportsDesk(status.sports);
    renderCryptoDesk(status.crypto);
    renderAlerts(status);
    renderMarkets(status);
  } catch (err) {
    console.error("[OS] status fetch failed:", err);
    const osEl = $("osStatus");
    if (osEl) { osEl.textContent = "CHECK"; osEl.className = "os-card-val negative"; }
    set("osStatusDetail", "OS aggregator unreachable — check API status.");
    set("sportsStatus", "—");
    set("cryptoStatus", "—");
    const b = $("alertsBadge");
    if (b) { b.textContent = "API Error"; b.className = "chip chip-red"; }
  } finally {
    if (btn) btn.classList.remove("spinning");
  }
}

// ── Boot ───────────────────────────────────────────────────────
$("refreshBtn")?.addEventListener("click", refreshAll);
refreshAll();
setInterval(refreshAll,  60_000);
setInterval(tickTime,     5_000);
