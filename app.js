/* Agentic Markets OS — app.js */

// ── Agent pipeline metadata ────────────────────────────
const FOOTBALL_PIPELINE = [
  { key: "DataCollector",    label: "Data Collector",  role: "Live match data · odds · xG feeds",          icon: "📡" },
  { key: "ModelAgent",       label: "Model",           role: "Dixon-Coles · Pi Rating · Poisson",          icon: "🧠" },
  { key: "AnalystAgent",     label: "Analyst",         role: "Value edge detection · confidence",          icon: "📊" },
  { key: "StrategistAgent",  label: "Strategist",      role: "Bet selection · signal generation",          icon: "⚡" },
  { key: "RiskManagerAgent", label: "Risk Manager",    role: "Kelly sizing · exposure caps · drawdown",    icon: "🛡️" },
  { key: "TraderAgent",      label: "Trader",          role: "Betfair execution · settlement · P&L",       icon: "💱" },
];

const TENNIS_PIPELINE = [
  { key: "TennisDataCollectorAgent", label: "Data Collector", role: "Betfair tennis markets · 60+ events",  icon: "📡" },
  { key: "TennisModelAgent",         label: "Model",          role: "Elo Surface v2 · clay/grass/hard",     icon: "🧠" },
  { key: "TennisAnalystAgent",       label: "Analyst",        role: "Value edge · 4% threshold",            icon: "📊" },
  { key: "TennisRiskManagerAgent",   label: "Risk Manager",   role: "Kelly f=0.25 · 20% cap · drawdown",   icon: "🛡️" },
  { key: "TennisTraderAgent",        label: "Trader",         role: "Paper bets · Neon DB · Telegram",      icon: "💱" },
  { key: "TennisSettlementAgent",    label: "Settlement",     role: "Elo update · P&L · win/loss loop",     icon: "🔄" },
];

const SPORTS_URL = "https://agentic-markets-roan.vercel.app";
const TENNIS_URL = "https://agentic-markets-roan.vercel.app";
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
    if (a.status !== "alive" && a.age_seconds != null) {
      const h = Math.floor(a.age_seconds / 3600);
      const m = Math.floor((a.age_seconds % 3600) / 60);
      tip.textContent = `${a.name} (${h > 0 ? h + "h " : ""}${m}m ago)`;
    } else {
      tip.textContent = a.name;
    }

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

// ── Render: Agent pipeline ────────────────────────
function statusMeta(status) {
  if (status === "alive")   return { cls: "alive",   label: "LIVE",    dot: "dot-green" };
  if (status === "stale")   return { cls: "stale",   label: "STALE",   dot: "dot-amber" };
  if (status === "running") return { cls: "alive",   label: "LIVE",    dot: "dot-green" };
  return                           { cls: "offline", label: "OFFLINE", dot: "dot-red"   };
}

function renderFootballPipeline(agentList) {
  const flow    = $("footballAgentFlow");
  const badge   = $("footballPipelineBadge");
  const chip    = $("agentPipelineChip");
  if (!flow) return;

  // Build lookup by name
  const byName = {};
  for (const a of (agentList || [])) byName[a.name] = a;

  const alive = (agentList || []).filter(a => a.status === "alive" || a.status === "running").length;
  const total = FOOTBALL_PIPELINE.length;

  if (badge) {
    badge.textContent = `${alive}/${total} alive`;
    badge.className = "pipeline-desk-badge " + (alive === total ? "pdg-green" : alive > 0 ? "pdg-amber" : "pdg-red");
  }
  if (chip) {
    chip.textContent = `${alive}/${total} football · 6 tennis`;
    chip.className   = "section-chip " + (alive === total ? "sc-green" : "sc-amber");
  }

  const cards = FOOTBALL_PIPELINE.map((ag, i) => {
    const live = byName[ag.key] ?? null;
    const st   = statusMeta(live?.status ?? "offline");
    const age  = live?.age_seconds;
    const timeLabel = !live ? "" : age == null ? "live" : age < 60 ? "just now" : age < 3600 ? `${Math.floor(age/60)}m ago` : `${Math.floor(age/3600)}h ago`;

    const arr = i < FOOTBALL_PIPELINE.length - 1
      ? `<div class="flow-arrow"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="flow-pulse ${st.cls === 'alive' ? 'fp-active' : ''}"></div></div>`
      : "";

    return `
      <div class="agent-card ${st.cls}">
        <div class="ac-top">
          <span class="ac-icon">${ag.icon}</span>
          <span class="ac-num">${String(i+1).padStart(2,'0')}</span>
        </div>
        <div class="ac-name">${ag.label}</div>
        <div class="ac-role">${ag.role}</div>
        <div class="ac-status">
          <span class="ac-dot ${st.dot}"></span>
          <span class="ac-label">${st.label}</span>
          ${timeLabel ? `<span class="ac-age">${timeLabel}</span>` : ""}
        </div>
      </div>${arr}`;
  }).join("");

  flow.innerHTML = `<div class="agent-flow-inner">${cards}</div>`;
}

function renderTennisPipeline(tennisOk) {
  const grid  = $("tennisAgentGrid");
  const badge = $("tennisPipelineBadge");
  if (!grid) return;

  const total = TENNIS_PIPELINE.length;
  const st = tennisOk ? statusMeta("alive") : statusMeta("offline");

  if (badge) {
    badge.textContent = tennisOk ? `${total}/${total} alive` : "Offline";
    badge.className   = "pipeline-desk-badge " + (tennisOk ? "pdg-amber" : "pdg-red");
  }

  grid.innerHTML = TENNIS_PIPELINE.map(ag => `
    <div class="agent-card-sm ${st.cls}">
      <span class="ac-icon-sm">${ag.icon}</span>
      <div class="acs-body">
        <div class="acs-name">${ag.label}</div>
        <div class="acs-role">${ag.role}</div>
      </div>
      <span class="ac-dot ${st.dot} acs-dot"></span>
    </div>`).join("");
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
  setFlash("sportsBets",       String(s.total_bets ?? 0));
  setFlash("kpiBets",          String(s.total_bets ?? 0));
  set("kpiBetsSub",            s.pending_bets ? `${s.pending_bets} pending` : "settled");
  setFlash("kpiPredictions",   String(s.predictions ?? 0));
  setFlash("sportsPnl",     fmtPnl(s.pnl));
  setFlash("kpiPnl",        fmtPnl(s.pnl));

  setFlash("sportsMode", sports.mode || "paper");
  if (Array.isArray(sports.agentList)) renderAgentDots(sports.agentList);
}

// ── Render: Tennis desk ────────────────────────────────────────
function renderTennisDesk(tennis) {
  if (!tennis?.ok) {
    setFlash("tennisStatus", "OFFLINE");
    $("tennisStatus") && ($("tennisStatus").className = "hstat-val negative");
    setBadge("tennisBadge", "offline");
    return;
  }

  const s = tennis.summary || {};

  setFlash("tennisStatus", "ONLINE");
  $("tennisStatus") && ($("tennisStatus").className = "hstat-val positive");
  setBadge("tennisBadge", "online");

  setFlash("tennisHealth",         `${tennis.agents?.alive ?? 0}/${tennis.agents?.total ?? 0} alive`);
  setFlash("tennisValueBets",      String(s.value_bets ?? 0));
  setFlash("kpiTennisValueBets",   String(s.value_bets ?? 0));
  setFlash("tennisMarketsLive",    String(s.markets_active ?? 0));
  setFlash("kpiTennisMarkets",     String(s.markets_active ?? 0));
  setFlash("tennisMode",           "Paper");

  const statusMsg = `Elo Surface v2 · ${s.markets_active ?? 0} markets · ${s.value_bets ?? 0} value bets`;
  const ratEl = $("tennisRationale");
  if (ratEl && ratEl.textContent !== statusMsg) ratEl.textContent = statusMsg;
}

// ── Render: Agent pipeline (orchestrator) ─────────────
function renderAgentPipeline(status) {
  renderFootballPipeline(status.sports?.agentList ?? []);
  renderTennisPipeline(Boolean(status.tennis?.ok));
}

// ── Render: OS status ──────────────────────────────────────────
function renderOsStatus(status) {
  const sportsOk    = Boolean(status.sports?.ok);
  const tennisOk    = Boolean(status.tennis?.ok);
  const alive       = Number(status.sports?.agents?.alive ?? 0);
  const total       = Number(status.sports?.agents?.total ?? 0);
  const score       = status.os?.systemScore ?? 0;

  const label = status.os?.label
    ? status.os.label.toUpperCase()
    : sportsOk && tennisOk && alive === total ? "ONLINE"
    : sportsOk && tennisOk ? "DEGRADED" : "CHECK";

  const osEl = $("osStatus");
  if (osEl) {
    osEl.textContent = label;
    osEl.className = "os-card-val " + (
      score >= 85 ? "positive" : score >= 60 ? "neutral" : "negative"
    );
  }

  set("osStatusDetail",
    `Football ${alive}/${total} agents · Tennis ${tennisOk ? "online" : "offline"} · Score ${score}/100`
  );

  const dBadge = $("disciplineBadge");
  if (dBadge) {
    const unified = sportsOk && tennisOk;
    dBadge.textContent = unified ? "Unified" : "Split";
    dBadge.className = "chip " + (unified ? "chip-green" : "chip-amber");
  }

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

// ── Render: Live Positions ────────────────────────────────────
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

    const home   = bet.home_team   || "?";
    const away   = bet.away_team   || "?";
    const league = bet.league      || "?";
    const sel    = selLabel(bet.selection);
    const odds   = Number(bet.odds).toFixed(2);
    const stake  = Number(bet.stake).toFixed(2);
    const betId  = bet.betfair_bet_id || "paper";
    const time   = fmtBetTime(bet.placed_at);
    const pnl    = bet.profit_loss != null
      ? (Number(bet.profit_loss) >= 0 ? `+€${Number(bet.profit_loss).toFixed(2)}` : `-€${Math.abs(Number(bet.profit_loss)).toFixed(2)}`)
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

  set("sportsStatus", "SYNC");
  set("tennisStatus", "SYNC");

  try {
    const status = await fetchJson(`${API_BASE}/api/os-status`);
    lastRefresh = Date.now();
    renderOsStatus(status);
    renderSportsDesk(status.sports);
    renderTennisDesk(status.tennis);
    renderAgentPipeline(status);
    renderAlerts(status);
    renderMarkets(status);
    renderLiveBets(status);
  } catch (err) {
    console.error("[OS] status fetch failed:", err);
    const osEl = $("osStatus");
    if (osEl) { osEl.textContent = "CHECK"; osEl.className = "os-card-val negative"; }
    set("osStatusDetail", "OS aggregator unreachable — check API status.");
    set("sportsStatus", "—");
    set("tennisStatus", "—");
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
