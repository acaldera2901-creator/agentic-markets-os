const SPORTS_URL = "https://agentic-markets-roan.vercel.app";
const CRYPTO_URL = "https://meme-coin-control-center.vercel.app";
const OS_URL = "https://agentic-markets-os.vercel.app";
const API_BASE = window.location.protocol === "file:" ? OS_URL : "";

const $ = (id) => document.getElementById(id);

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setClass(id, value) {
  const el = $(id);
  if (el) el.className = value;
}

function setWidth(id, value) {
  const el = $(id);
  if (el) el.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
}

function fmtUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return `$${n.toFixed(2)}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
  return payload;
}

function renderSportsDesk(sports) {
  if (!sports?.ok) {
    setText("sportsStatus", "OFFLINE");
    setText("sportsBadge", "OFFLINE");
    setText("sportsHealth", "error");
    setText("sportsHeartbeat", "error");
    setClass("sportsStatus", "negative");
    setClass("sportsBadge", "negative");
    return;
  }
  const statusLabel = sports.health === "ok" ? "ONLINE" : sports.health === "warning" ? "WARNING" : "DEGRADED";
  const h = sports.agents || {};
  const summary = sports.summary || {};
  setText("sportsStatus", statusLabel);
  setText("sportsBadge", statusLabel);
  setText("sportsHealth", `${h.alive || 0}/${h.total || 0} alive`);
  setText("sportsAgents", `${h.alive || 0}/${h.total || 0}`);
  setText("sportsHeartbeat", h.offline ? `${h.offline} offline` : h.stale ? `${h.stale} stale` : "alive");
  setText("sportsBets", String(summary.total_bets ?? 0));
  setText("sportsPnl", fmtUsd(Number(summary.pnl || 0)));
  setClass("sportsStatus", sports.health === "ok" ? "positive" : "neutral");
  setClass("sportsBadge", sports.health === "ok" ? "positive" : "neutral");
}

function renderCryptoDesk(crypto) {
  if (!crypto?.ok) {
    setText("cryptoStatus", "OFFLINE");
    setText("cryptoBadge", "OFFLINE");
    setText("storageStatus", "unknown");
    setClass("cryptoStatus", "negative");
    setClass("cryptoBadge", "negative");
    return;
  }
  const btcState = crypto.btc || {};
  const config = crypto.optimizer?.config || {};
  const diag = crypto.optimizer?.diagnostics || {};
  const observations = crypto.sheets?.observations || 0;
    setText("cryptoStatus", "ONLINE");
    setText("cryptoBadge", "ONLINE");
    setText("storageStatus", crypto.storage?.provider || "unknown");
    setText("riskMode", config.mode || "adaptive");
    setText("researchSamples", String(observations));
    setText("btcCycles", String(btcState.cycles ?? "--"));
    setText("optimizerMode", config.mode || "--");
    setText("cryptoObservations", String(observations));
    setText("btcPosition", btcState.position ? btcState.position.side : "FLAT");
    setText("cryptoReadiness", `${diag.readiness ?? "--"}/100`);
    setText("cleanMissed", String(diag.cleanMissed ?? "--"));
    setText("badEntries", String(diag.badEntries ?? "--"));
    setText("optimizerRationale", config.rationale || "Optimizer online.");
    setClass("cryptoStatus", "positive");
    setClass("cryptoBadge", "positive");
}

function renderOsStatus(status) {
  const sportsOk = Boolean(status.sports?.ok);
  const cryptoOk = Boolean(status.crypto?.ok);
  const sportsAlive = Number(status.sports?.agents?.alive || 0);
  const sportsTotal = Number(status.sports?.agents?.total || 0);
  const storage = status.crypto?.storage?.provider || "unknown";
  const systemScore = status.os?.systemScore ?? 0;
  const osLabel = status.os?.label ? status.os.label.toUpperCase() : sportsOk && cryptoOk && sportsAlive === sportsTotal ? "ONLINE" : sportsOk && cryptoOk ? "DEGRADED" : "CHECK";
  setText("osStatus", osLabel);
  setText("osStatusDetail", `Football agents ${sportsAlive}/${sportsTotal}; crypto ${cryptoOk ? "online" : "offline"}; storage ${storage}.`);
  setText("systemScore", `${systemScore}/100`);
  setWidth("systemScoreBar", systemScore);
  setClass("osStatus", systemScore >= 85 ? "positive" : systemScore >= 65 ? "neutral" : "negative");
}

function renderAlerts(status) {
  const alerts = status.os?.alerts || [];
  const list = $("alertsList");
  setText("alertsBadge", alerts.length ? `${alerts.length} active` : "Clear");
  setClass("alertsBadge", alerts.length ? "neutral" : "positive");
  if (!list) return;
  if (!alerts.length) {
    list.innerHTML = '<div class="empty-state positive">No live exceptions across active desks.</div>';
    return;
  }
  list.innerHTML = alerts.map((alert) => `
    <div class="alert-item ${alert.level === "critical" ? "critical" : "warning"}">
      <strong>${alert.desk}</strong>
      <span>${alert.message}</span>
    </div>
  `).join("");
}

function renderMarkets(status) {
  const markets = status.os?.markets || [];
  for (const market of markets) {
    const el = $(`market-${market.id}`);
    if (!el) continue;
    el.textContent = `${market.status} | score ${market.score}/100 | ${market.priority}`;
  }
}

async function refreshAll() {
  setText("sportsStatus", "CHECKING");
  setText("cryptoStatus", "CHECKING");
  try {
    const status = await fetchJson(`${API_BASE}/api/os-status`);
    renderOsStatus(status);
    renderSportsDesk(status.sports);
    renderCryptoDesk(status.crypto);
    renderAlerts(status);
    renderMarkets(status);
  } catch {
    setText("osStatus", "CHECK");
    setText("osStatusDetail", "OS aggregator unavailable.");
    setText("sportsStatus", "CHECK API");
    setText("cryptoStatus", "CHECK API");
    setClass("osStatus", "negative");
    setClass("sportsStatus", "neutral");
    setClass("cryptoStatus", "neutral");
    setText("alertsBadge", "API");
  }
}

$("refreshBtn").addEventListener("click", refreshAll);
refreshAll();
setInterval(refreshAll, 60_000);
