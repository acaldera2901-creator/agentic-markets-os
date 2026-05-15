const SPORTS_URL = "https://agentic-markets-roan.vercel.app";
const TIMEOUT_MS  = 8_000;

async function safeFetch(url) {
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r    = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(tid);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function scoreAndAlerts(health, preds, tennisData) {
  const alerts = [];
  let score = 0;

  /* ── Sports block (50 pts) ────────────────────── */
  if (!health) {
    alerts.push({ desk: "Football", message: "Desk unreachable", level: "critical" });
  } else {
    const agents  = health.agents ?? [];
    const alive   = agents.filter(a => a.status === "alive").length;
    const total   = agents.length || 10;

    // Agents alive: 25 pts
    score += Math.round((alive / total) * 25);
    if (alive < total)
      alerts.push({ desk: "Football", message: `${total - alive} agents offline`, level: "warning" });

    // Predictions present: 15 pts
    const count = preds?.count ?? 0;
    if (count > 0) {
      score += 15;
    } else {
      alerts.push({ desk: "Football", message: "No active predictions in DB", level: "critical" });
    }

    // Predictions fresh: 5 pts
    if (!preds?.is_stale) {
      score += 5;
    } else {
      alerts.push({ desk: "Football", message: "Predictions stale (>1h)", level: "warning" });
    }

    // Overall status: 5 pts
    if (health.status === "ok") score += 5;
  }

  /* ── Tennis block (50 pts) ────────────────────── */
  if (!tennisData?.matches) {
    alerts.push({ desk: "Tennis", message: "Tennis API unreachable", level: "critical" });
  } else {
    const tennisMatches   = tennisData.matches?.length ?? 0;
    const tennisValueBets = tennisData.summary?.value_bets ?? 0;

    // Matches available: 25 pts
    score += Math.min(25, Math.round((tennisMatches / 10) * 25));

    // API reachable: 15 pts
    score += 15;

    // Value bets computed: 10 pts
    if (tennisValueBets > 0) score += 10;

    if (tennisMatches === 0)
      alerts.push({ desk: "Tennis", message: "No tennis markets available", level: "warning" });
  }

  return { score: Math.max(0, Math.min(100, score)), alerts };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  /* ── Parallel fetch from both desks ──────────── */
  const [health, preds, history, betData, tennisData] = await Promise.all([
    safeFetch(`${SPORTS_URL}/api/health`),
    safeFetch(`${SPORTS_URL}/api/predictions`),
    safeFetch(`${SPORTS_URL}/api/history`),
    safeFetch(`${SPORTS_URL}/api/data`),
    safeFetch(`${SPORTS_URL}/api/tennis`),
  ]);

  const sportsOk = Boolean(health?.status && health.status !== "error");
  const tennisOk = Boolean(tennisData?.matches);

  /* ── Sports agents ───────────────────────────── */
  const agentList = (health?.agents ?? []).map(a => ({
    name: a.name,
    status: a.status,
    age_seconds: a.age_seconds ?? null,
  }));
  const alive   = agentList.filter(a => a.status === "alive").length;
  const total   = agentList.length || 10;
  const offline = agentList.filter(a => a.status === "offline").length;

  /* ── Sports summary ──────────────────────────── */
  const betsPlaced  = betData?.summary?.total_bets ?? history?.stats?.bets_placed ?? 0;
  const totalReturn = Number(betData?.summary?.pnl ?? history?.stats?.total_return ?? 0);
  const betsPending = betData?.summary?.pending ?? 0;
  const sportsMode  = health?.mode ?? "paper";
  const sportsHealth = health?.status === "ok" ? "ok"
    : offline > 0 ? "degraded" : "warning";

  /* ── Live bets (non-paper, ordered by placed_at DESC) ─────── */
  const liveBets = (betData?.bets ?? [])
    .filter(b => b.paper === false || b.paper === "false" || b.paper === null)
    .slice(0, 10)
    .map(b => ({
      id:               b.id,
      home_team:        b.home_team,
      away_team:        b.away_team,
      league:           b.league,
      selection:        b.selection,
      odds:             b.odds,
      stake:            b.stake,
      paper:            b.paper,
      status:           b.status,
      profit_loss:      b.profit_loss,
      betfair_bet_id:   b.betfair_bet_id,
      placed_at:        b.placed_at,
    }));

  /* ── Tennis ──────────────────────────────────── */
  const tennisMatches   = tennisData?.matches?.length ?? 0;
  const tennisSummary   = tennisData?.summary  ?? {};
  const tennisApiStatus = tennisData?.status   ?? "offline";

  /* ── System score + alerts ───────────────────── */
  const { score: systemScore, alerts } = scoreAndAlerts(health, preds, tennisData);

  const label =
    sportsOk && tennisOk && offline === 0 ? "ONLINE" :
    sportsOk && tennisOk                  ? "DEGRADED" :
    sportsOk || tennisOk                  ? "PARTIAL"  : "OFFLINE";

  /* ── Market roadmap (ids match HTML market-{id}) ── */
  const markets = [
    { id: "polymarket", status: "planned", score: 0, priority: "high" },
    { id: "nba",        status: "planned", score: 0, priority: "medium" },
    { id: "macro",      status: "planned", score: 0, priority: "low" },
  ];

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=30, stale-while-revalidate=10"
  );
  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    ts: new Date().toISOString(),

    sports: {
      ok: sportsOk,
      health: sportsHealth,
      agents: { alive, total, offline },
      summary: {
        total_bets:  betsPlaced,
        pending_bets: betsPending,
        pnl:         totalReturn,
        predictions: preds?.count ?? 0,
        win_rate:    betData?.summary?.win_rate ?? "0.0",
        won:         betData?.summary?.won ?? 0,
        lost:        betData?.summary?.lost ?? 0,
      },
      mode: sportsMode,
      agentList,
      live_bets: liveBets,
    },

    tennis: {
      ok: tennisOk,
      status: tennisApiStatus,
      matches: tennisMatches,
      summary: tennisSummary,
      agents: { alive: tennisOk ? 5 : 0, total: 5 },
    },

    os: {
      systemScore,
      label,
      alerts,
      markets,
    },
  }));
};
