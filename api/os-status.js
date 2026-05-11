const SPORTS_URL = "https://agentic-markets-roan.vercel.app";
const CRYPTO_URL  = "https://meme-coin-control-center.vercel.app";
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

function scoreAndAlerts(health, preds, opt) {
  const alerts = [];
  let score = 0;

  /* ── Sports block (50 pts) ────────────────────── */
  if (!health) {
    alerts.push({ desk: "Football", message: "Desk unreachable", level: "critical" });
  } else {
    const agents  = health.agents ?? [];
    const alive   = agents.filter(a => a.status === "alive").length;
    const total   = agents.length || 9;

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

  /* ── Crypto block (50 pts) ────────────────────── */
  if (!opt || !opt.ok) {
    alerts.push({ desk: "Crypto", message: "Optimizer unreachable", level: "critical" });
  } else {
    const readiness = opt.diagnostics?.readiness ?? 0;
    const samples   = opt.diagnostics?.total      ?? 0;

    // Readiness: 25 pts
    score += Math.round((readiness / 100) * 25);

    // Dataset depth: 15 pts (target 1000 samples)
    score += Math.min(15, Math.round((samples / 1000) * 15));

    // Storage reachable: 10 pts
    score += 10;

    if (readiness < 40)
      alerts.push({ desk: "Crypto", message: `Optimizer readiness low (${readiness}/100)`, level: "warning" });

    if (samples < 200)
      alerts.push({ desk: "Crypto", message: `Only ${samples} research samples collected`, level: "warning" });
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
  const [health, preds, history, opt] = await Promise.all([
    safeFetch(`${SPORTS_URL}/api/health`),
    safeFetch(`${SPORTS_URL}/api/predictions`),
    safeFetch(`${SPORTS_URL}/api/history`),
    safeFetch(`${CRYPTO_URL}/api/optimizer`),
  ]);

  const sportsOk = Boolean(health?.status && health.status !== "error");
  const cryptoOk = Boolean(opt?.ok);

  /* ── Sports agents ───────────────────────────── */
  const agentList = (health?.agents ?? []).map(a => ({
    name: a.name,
    status: a.status,
  }));
  const alive   = agentList.filter(a => a.status === "alive").length;
  const total   = agentList.length || 9;
  const offline = agentList.filter(a => a.status === "offline").length;

  /* ── Sports summary ──────────────────────────── */
  const betsPlaced  = history?.stats?.bets_placed    ?? 0;
  const totalReturn = Number(history?.stats?.total_return ?? 0);
  const sportsHealth = health?.status === "ok" ? "ok"
    : offline > 0 ? "degraded" : "warning";

  /* ── Crypto ──────────────────────────────────── */
  const optConfig = opt?.config          ?? {};
  const optDiag   = opt?.diagnostics     ?? {};
  const storage   = opt?.storage         ?? { provider: "unknown" };
  const obsCount  = optDiag.total        ?? 0;

  /* ── System score + alerts ───────────────────── */
  const { score: systemScore, alerts } = scoreAndAlerts(health, preds, opt);

  const label =
    sportsOk && cryptoOk && offline === 0 ? "ONLINE" :
    sportsOk && cryptoOk                  ? "DEGRADED" :
    sportsOk || cryptoOk                  ? "PARTIAL"  : "OFFLINE";

  /* ── Market roadmap ──────────────────────────── */
  const markets = [
    {
      id: "football",
      status: sportsOk ? "live" : "offline",
      score: sportsOk ? systemScore : 0,
      priority: "primary",
    },
    {
      id: "crypto",
      status: cryptoOk ? "live" : "offline",
      score: cryptoOk ? Math.round((optDiag.readiness ?? 0)) : 0,
      priority: "secondary",
    },
    { id: "polymarket", status: "planned", score: 0,  priority: "high" },
    { id: "tennis",     status: "planned", score: 0,  priority: "medium" },
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
      summary: { total_bets: betsPlaced, pnl: totalReturn },
      agentList,
    },

    crypto: {
      ok: cryptoOk,
      btc: { cycles: null, position: null },
      optimizer: {
        config: {
          mode:      optConfig.mode      ?? "—",
          rationale: optConfig.rationale ?? "",
        },
        diagnostics: {
          readiness:   optDiag.readiness  ?? 0,
          cleanMissed: optDiag.cleanMissed ?? 0,
          badEntries:  optDiag.badEntries  ?? 0,
        },
      },
      sheets: { observations: obsCount },
      storage,
    },

    os: {
      systemScore,
      label,
      alerts,
      markets,
    },
  }));
};
