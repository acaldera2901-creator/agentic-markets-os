/* Agentic Markets OS — app.js */

const SPORTS_URL = "https://agentic-markets-roan.vercel.app";
const API_BASE   = window.location.protocol === "file:" ? SPORTS_URL.replace("agentic-markets-roan", "agentic-markets-os") : "";

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

function fmtPnl(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}€${Math.abs(n).toFixed(2)}`;
}

function fmtPnlShort(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "-";
  return `${sign}€${Math.abs(n).toFixed(2)}`;
}

// ── Status dot helpers ─────────────────────────────────────────
function setStatusDot(dotId, labelId, state, labelText) {
  const dot   = $(dotId);
  const label = $(labelId);
  if (dot) {
    dot.className = "nav-status-dot " + (
      state === "online" || state === "ok" ? "online" :
      state === "degraded" || state === "warning" ? "degraded" : "offline"
    );
  }
  if (label && labelText) label.textContent = labelText;
}

function setDeskDot(state) {
  const dot   = $("deskStatusDot");
  const label = $("deskStatusLabel");
  if (dot) {
    dot.className = "desk-status-dot " + (
      state === "online" || state === "ok" ? "online" :
      state === "degraded" || state === "warning" ? "degraded" : "offline"
    );
  }
  if (label) label.textContent = (
    state === "online" || state === "ok" ? "ONLINE" :
    state === "degraded" ? "DEGRADED" :
    state === "warning"  ? "WARNING"  : "OFFLINE"
  );
}

// ── Render: Football desk ──────────────────────────────────────
function renderSportsDesk(sports) {
  if (!sports?.ok) {
    setDeskDot("offline");
    setFlash("heroPnl", "—");
    const heroPnlEl = $("heroPnl");
    if (heroPnlEl) heroPnlEl.className = "hero-pnl-value neutral";
    setFlash("navPnl", "P&L —");
    return;
  }

  const h = sports.agents  || {};
  const s = sports.summary || {};
  const state = sports.health === "ok" ? "online" : sports.health || "warning";

  // Hero P&L — big number with color
  const pnlNum = Number(s.pnl ?? 0);
  const heroPnlEl = $("heroPnl");
  if (heroPnlEl) {
    heroPnlEl.textContent = fmtPnl(s.pnl);
    const wasText = heroPnlEl.dataset.prev;
    if (wasText !== heroPnlEl.textContent) {
      heroPnlEl.classList.remove("flash");
      void heroPnlEl.offsetWidth;
      heroPnlEl.classList.add("flash");
      heroPnlEl.dataset.prev = heroPnlEl.textContent;
    }
    heroPnlEl.className = "hero-pnl-value " + (pnlNum > 0 ? "positive" : pnlNum < 0 ? "negative" : "neutral");
  }

  // Win rate
  const winRate = s.win_rate ? `${Number(s.win_rate).toFixed(0)}%` : "—";
  setFlash("heroWinRate",  winRate);
  setFlash("deskWinRate",  winRate);

  // Active bets
  setFlash("heroActiveBets", String(s.pending_bets ?? 0));

  // Nav chips
  const navPnlEl = $("navPnl");
  if (navPnlEl) {
    navPnlEl.textContent = `P&L ${fmtPnlShort(s.pnl)}`;
    navPnlEl.className = "nav-chip nav-chip-pnl " + (pnlNum > 0 ? "" : pnlNum < 0 ? "negative" : "neutral");
  }
  const pendingCount = s.pending_bets ?? 0;
  set("navBets", `${pendingCount} bet${pendingCount !== 1 ? "s" : ""} open`);

  // Desk card
  setDeskDot(state);
  setFlash("sportsBets",     String(s.total_bets ?? 0));
  setFlash("sportsPnl",      fmtPnl(s.pnl));
  setFlash("kpiPredictions", String(s.predictions ?? 0));

  const sportsPnlEl = $("sportsPnl");
  if (sportsPnlEl) {
    sportsPnlEl.className = pnlNum > 0 ? "positive" : pnlNum < 0 ? "negative" : "";
  }

  const mode = sports.mode || "paper";
  const modeBadge = $("sportsMode");
  if (modeBadge) modeBadge.textContent = mode === "live" || mode === "real" ? "LIVE" : "Paper";
}

// ── Render: Tennis desk ────────────────────────────────────────
function renderTennisDesk(tennis) {
  if (!tennis?.ok) {
    setFlash("heroSignals",     "—");
    setFlash("tennisValueBets", "—");
    setFlash("tennisMarketsLive", "—");
    return;
  }

  const s = tennis.summary || {};
  setFlash("heroSignals",      String(s.value_bets ?? 0));
  setFlash("tennisValueBets",  String(s.value_bets ?? 0));
  setFlash("tennisMarketsLive", String(s.markets_active ?? 0));
}

// ── Render: OS status ──────────────────────────────────────────
function renderOsStatus(status) {
  const sportsOk = Boolean(status.sports?.ok);
  const tennisOk = Boolean(status.tennis?.ok);
  const score    = status.os?.systemScore ?? 0;
  const label    = status.os?.label ?? (sportsOk && tennisOk ? "ONLINE" : sportsOk || tennisOk ? "DEGRADED" : "OFFLINE");

  setFlash("heroScore", String(score));

  const navState = label === "ONLINE" ? "online" : label === "DEGRADED" ? "degraded" : "offline";
  setStatusDot("navStatusDot", "navStatusLabel", navState, label);
}

// ── Render: Alerts ─────────────────────────────────────────────
function renderAlerts(status) {
  const alerts = status.os?.alerts || [];
  const list   = $("alertsList");
  const badge  = $("alertsBadge");

  if (badge) {
    badge.textContent = alerts.length ? `${alerts.length} active` : "All clear";
    badge.className   = "section-chip " + (alerts.length ? "sc-amber" : "sc-green");
  }

  if (!list) return;

  if (!alerts.length) {
    list.innerHTML = `
      <div class="bets-empty" style="border-style:solid;padding:18px 16px;text-align:left;display:flex;align-items:center;gap:10px;">
        <span style="color:var(--g)">✓</span>
        No active exceptions across all desks.
      </div>`;
    return;
  }

  list.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;">${
    alerts.map(a => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border:1px solid var(--b0);border-left:3px solid ${a.level === "critical" ? "var(--r)" : "var(--a)"};border-radius:var(--r8);background:${a.level === "critical" ? "var(--rg)" : "var(--ag)"}">
        <span style="font-family:var(--fm);font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--tx);white-space:nowrap;padding-top:2px;">${a.desk}</span>
        <span style="font-size:13px;color:var(--tx2);line-height:1.4;">${a.message}</span>
      </div>`).join("")
  }</div>`;
}

// ── Render: Live Positions ─────────────────────────────────────
function fmtBetTime(placedAt) {
  if (!placedAt) return "";
  try {
    const diff = Math.round((Date.now() - new Date(placedAt)) / 60000);
    if (diff < 1)   return "just now";
    if (diff < 60)  return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  } catch { return ""; }
}

function selLabel(sel) {
  if (!sel) return "?";
  const s = String(sel).toLowerCase();
  if (s === "home") return "HOME";
  if (s === "draw") return "DRAW";
  if (s === "away") return "AWAY";
  return String(sel).toUpperCase();
}

function renderLiveBets(status) {
  const grid  = $("liveBetsGrid");
  const badge = $("livePositionsBadge");
  if (!grid) return;

  const all     = status.sports?.live_bets ?? [];
  const pending = all.filter(b => b.status === "pending");
  const settled = all.filter(b => b.status === "won" || b.status === "lost").slice(0, 3);
  const display = [...pending, ...settled];

  if (badge) {
    badge.textContent = pending.length ? `${pending.length} open` : "No open bets";
    badge.className   = "section-chip " + (pending.length ? "sc-green" : "sc-amber");
  }

  if (!display.length) {
    grid.innerHTML = `<div class="bets-empty">No live football positions at the moment.</div>`;
    return;
  }

  grid.innerHTML = display.map(bet => {
    const isPending = bet.status === "pending";
    const isWon     = bet.status === "won";
    const cardCls   = isPending ? "bet-live" : isWon ? "bet-won" : "bet-lost";
    const bdgCls    = isPending ? "pending"  : isWon ? "won"     : "lost";
    const bdgTxt    = isPending ? "LIVE"     : isWon ? "WON"     : "LOST";

    const home   = bet.home_team || "?";
    const away   = bet.away_team || "?";
    const league = bet.league    || "?";
    const sel    = selLabel(bet.selection);
    const odds   = Number(bet.odds).toFixed(2);
    const stake  = Number(bet.stake).toFixed(2);
    const betId  = bet.betfair_bet_id || "paper";
    const time   = fmtBetTime(bet.placed_at);
    const pnl    = bet.profit_loss != null
      ? (Number(bet.profit_loss) >= 0
          ? `+€${Number(bet.profit_loss).toFixed(2)}`
          : `-€${Math.abs(Number(bet.profit_loss)).toFixed(2)}`)
      : "";

    return `
      <div class="bet-card ${cardCls}">
        <div class="bet-card-top">
          <span class="bet-league">${league}</span>
          <span class="bet-status-badge ${bdgCls}">${bdgTxt}</span>
        </div>
        <div class="bet-match">${home} vs ${away}</div>
        <div class="bet-meta-row">
          <span class="bet-sel">${sel}</span>
          <span class="bet-odds">@ ${odds}</span>
          <span class="bet-stake">€${stake}${pnl ? ` · ${pnl}` : ""}</span>
        </div>
        <div class="bet-footer">
          <span class="bet-id-label">BetID</span>
          <span class="bet-id-val">${betId}</span>
          <span class="bet-time">${time}</span>
        </div>
      </div>`;
  }).join("");
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

  try {
    const status = await fetchJson(`${API_BASE}/api/os-status`);
    lastRefresh = Date.now();
    renderOsStatus(status);
    renderSportsDesk(status.sports);
    renderTennisDesk(status.tennis);
    renderAlerts(status);
    renderMarkets(status);
    renderLiveBets(status);
  } catch (err) {
    console.error("[OS] status fetch failed:", err);
    const heroPnlEl = $("heroPnl");
    if (heroPnlEl) { heroPnlEl.textContent = "—"; heroPnlEl.className = "hero-pnl-value neutral"; }
    setStatusDot("navStatusDot", "navStatusLabel", "offline", "OFFLINE");
    setDeskDot("offline");
    set("navPnl", "P&L —");
  } finally {
    if (btn) btn.classList.remove("spinning");
  }
}

// ── Boot ───────────────────────────────────────────────────────
$("refreshBtn")?.addEventListener("click", refreshAll);
refreshAll();
setInterval(refreshAll, 60_000);
setInterval(tickTime,    5_000);
