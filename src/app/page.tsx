"use client";

import { useState, useEffect } from "react";
import {
  MOCK_HISTORY, MOCK_POOLS, getRangeConfig,
  MOCK_LAST_BIG_DEPOSIT, MOCK_LAST_BIG_WITHDRAWAL, MOCK_LAST_BIG_TVL_DAY,
  MOCK_DEPOSITOR_STATS_INCEPTION, MOCK_DEPOSITOR_STATS_CURRENT,
  MOCK_GINI, MOCK_HOLD_TIME, MOCK_CHURN, MOCK_REDEPOSIT_RATE,
  MOCK_MEDIAN_DEPOSIT_COUNT, MOCK_COHORT_CONVICTION, MOCK_WALLET_BALANCES,
  MOCK_DEPOSIT_DISTRIBUTION, MOCK_RETENTION_COHORTS, MOCK_CHURN_WATERFALL,
  MOCK_RETENTION_BY_TIER, RETENTION_TIER_LABELS,
  getDailyFlows, getWeeklyFlows, getWeeklyTVL,
} from "@/lib/mock";
import type { TimeRange, Denom } from "@/lib/mock";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

const TIME_RANGES: TimeRange[] = ["1W", "1M", "YTD", "1Y"];
const DENOMS: Denom[] = ["Total", "USD", "ETH"];

// Shape of the live data objects — mirrors the JSON files written by fetch-stats.js
type AppData = {
  generatedAt:               string | null;
  // protocol-data.json
  MOCK_HISTORY:              typeof MOCK_HISTORY;
  MOCK_POOLS:                typeof MOCK_POOLS;
  MOCK_LAST_BIG_DEPOSIT:     typeof MOCK_LAST_BIG_DEPOSIT;
  MOCK_LAST_BIG_WITHDRAWAL:  typeof MOCK_LAST_BIG_WITHDRAWAL;
  MOCK_LAST_BIG_TVL_DAY:     typeof MOCK_LAST_BIG_TVL_DAY;
  // deposits-stats.json
  MOCK_DEPOSITOR_STATS_INCEPTION: typeof MOCK_DEPOSITOR_STATS_INCEPTION;
  MOCK_DEPOSITOR_STATS_CURRENT:   typeof MOCK_DEPOSITOR_STATS_CURRENT;
  MOCK_MEDIAN_DEPOSIT_COUNT:      typeof MOCK_MEDIAN_DEPOSIT_COUNT;
  MOCK_DEPOSIT_DISTRIBUTION:      typeof MOCK_DEPOSIT_DISTRIBUTION;
  MOCK_COHORT_CONVICTION:         typeof MOCK_COHORT_CONVICTION;
  MOCK_RETENTION_BY_TIER:         typeof MOCK_RETENTION_BY_TIER;
  MOCK_CHURN_WATERFALL:           typeof MOCK_CHURN_WATERFALL;
  MOCK_RETENTION_COHORTS:         typeof MOCK_RETENTION_COHORTS;
  MOCK_HOLD_TIME:                 typeof MOCK_HOLD_TIME;
  MOCK_CHURN:                     typeof MOCK_CHURN;
  MOCK_REDEPOSIT_RATE:            typeof MOCK_REDEPOSIT_RATE;
  MOCK_WALLET_BALANCES:           typeof MOCK_WALLET_BALANCES;
  MOCK_GINI:                      typeof MOCK_GINI;
};

const MOCK_DEFAULTS: AppData = {
  generatedAt:               null,
  MOCK_HISTORY,
  MOCK_POOLS,
  MOCK_LAST_BIG_DEPOSIT,
  MOCK_LAST_BIG_WITHDRAWAL,
  MOCK_LAST_BIG_TVL_DAY,
  MOCK_DEPOSITOR_STATS_INCEPTION,
  MOCK_DEPOSITOR_STATS_CURRENT,
  MOCK_MEDIAN_DEPOSIT_COUNT,
  MOCK_DEPOSIT_DISTRIBUTION,
  MOCK_COHORT_CONVICTION,
  MOCK_RETENTION_BY_TIER,
  MOCK_CHURN_WATERFALL,
  MOCK_RETENTION_COHORTS,
  MOCK_HOLD_TIME,
  MOCK_CHURN,
  MOCK_REDEPOSIT_RATE,
  MOCK_WALLET_BALANCES,
  MOCK_GINI,
};

export default function Page() {
  const [statsTab, setStatsTab] = useState<"Protocol" | "Autopools" | "Deposits">("Protocol");
  const [range, setRange] = useState<TimeRange>("1M");
  const [denom, setDenom] = useState<Denom>("Total");
  const [ethPoolDenom, setEthPoolDenom] = useState<"ETH" | "USD">("USD");
  const [selectedPool, setSelectedPool] = useState<typeof MOCK_POOLS[0] | null>(null);
  const [data, setData] = useState<AppData>(MOCK_DEFAULTS);

  // Load live JSON data on mount; silently fall back to mock data on any error
  useEffect(() => {
    Promise.all([
      fetch("/protocol-data.json").then(r => { if (!r.ok) throw new Error("no protocol-data.json"); return r.json(); }),
      fetch("/deposits-stats.json").then(r => { if (!r.ok) throw new Error("no deposits-stats.json"); return r.json(); }),
    ]).then(([proto, deps]) => {
      setData({
        generatedAt:               proto.generatedAt ?? null,
        MOCK_HISTORY:              proto.history,
        MOCK_POOLS:                proto.pools,
        MOCK_LAST_BIG_DEPOSIT:     proto.lastBigDeposit    ?? MOCK_LAST_BIG_DEPOSIT,
        MOCK_LAST_BIG_WITHDRAWAL:  proto.lastBigWithdrawal ?? MOCK_LAST_BIG_WITHDRAWAL,
        MOCK_LAST_BIG_TVL_DAY:     proto.lastBigTVLDay     ?? MOCK_LAST_BIG_TVL_DAY,
        MOCK_DEPOSITOR_STATS_INCEPTION: deps.depositorStatsInception,
        MOCK_DEPOSITOR_STATS_CURRENT:   deps.depositorStatsCurrent,
        MOCK_MEDIAN_DEPOSIT_COUNT:      deps.medianDepositCount,
        MOCK_DEPOSIT_DISTRIBUTION:      deps.depositDistribution,
        MOCK_COHORT_CONVICTION:         deps.cohortConviction,
        MOCK_RETENTION_BY_TIER:         deps.retentionByTier,
        MOCK_CHURN_WATERFALL:           deps.churnWaterfall,
        MOCK_RETENTION_COHORTS:         deps.retentionCohorts,
        MOCK_HOLD_TIME:                 deps.holdTime,
        MOCK_CHURN:                     deps.churn,
        MOCK_REDEPOSIT_RATE:            deps.redepositRate,
        MOCK_WALLET_BALANCES:           deps.walletBalances,
        MOCK_GINI:                      deps.gini,
      });
    }).catch(() => { /* keep mock data */ });
  }, []);

  // Shadow the module-level mock imports with live data (same names → zero JSX changes)
  const {
    MOCK_HISTORY:              MOCK_HISTORY,       // eslint-disable-line no-shadow
    MOCK_POOLS:                MOCK_POOLS,         // eslint-disable-line no-shadow
    MOCK_LAST_BIG_DEPOSIT:     MOCK_LAST_BIG_DEPOSIT,     // eslint-disable-line no-shadow
    MOCK_LAST_BIG_WITHDRAWAL:  MOCK_LAST_BIG_WITHDRAWAL,  // eslint-disable-line no-shadow
    MOCK_LAST_BIG_TVL_DAY:     MOCK_LAST_BIG_TVL_DAY,     // eslint-disable-line no-shadow
    MOCK_DEPOSITOR_STATS_INCEPTION, MOCK_DEPOSITOR_STATS_CURRENT, // eslint-disable-line no-shadow
    MOCK_MEDIAN_DEPOSIT_COUNT, MOCK_DEPOSIT_DISTRIBUTION,         // eslint-disable-line no-shadow
    MOCK_COHORT_CONVICTION, MOCK_RETENTION_BY_TIER,               // eslint-disable-line no-shadow
    MOCK_CHURN_WATERFALL, MOCK_RETENTION_COHORTS,                 // eslint-disable-line no-shadow
    MOCK_HOLD_TIME, MOCK_CHURN, MOCK_REDEPOSIT_RATE,              // eslint-disable-line no-shadow
    MOCK_WALLET_BALANCES, MOCK_GINI,                              // eslint-disable-line no-shadow
    generatedAt,
  } = data;

  // MOCK_VAULT equivalent: latest snapshot
  const MOCK_VAULT = MOCK_HISTORY[MOCK_HISTORY.length - 1] ?? MOCK_DEFAULTS.MOCK_HISTORY[MOCK_DEFAULTS.MOCK_HISTORY.length - 1];

  const { snapshots, granularity } = getRangeConfig(range, MOCK_HISTORY);

  return (
      <div style={{
        minHeight: "100vh",
        background: "#000000",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ctext x='19' y='27' font-family='monospace' font-size='11' fill='%23ff6b0022'%3E%2B%3C/text%3E%3C/svg%3E")`,
      }}>
        <div style={{ padding: "32px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: "20px" }}>
          <div style={{ fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase", color: "#f5c400", textShadow: "0 0 24px rgba(245,196,0,0.45)" }}>
            Autopool Analysis System <span style={{ color: "#7a6200" }}>v1</span>
          </div>
          <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7a3300" }}>
            Updated <span style={{ color: "#ff6b00" }}>
              {generatedAt
                ? new Date(generatedAt).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false }).toUpperCase() + " UTC"
                : "Mock Data"}
            </span>
          </div>
        </div>
        <div style={{ height: 2, background: "#c1121f", boxShadow: "0 0 10px rgba(193,18,31,0.75)" }} />

        {/* ── Inner tabs ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", borderBottom: "1px solid #3a0000", padding: "0 32px" }}>
          {(["Protocol", "Autopools", "Deposits"] as const).map((t) => {
            const active = statsTab === t;
            return (
              <button
                key={t}
                onClick={() => setStatsTab(t)}
                style={{
                  fontFamily: "inherit",
                  fontSize: 12,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  padding: "12px 20px 11px",
                  background: "transparent",
                  color: active ? "#f5c400" : "#7a6200",
                  border: "none",
                  borderBottom: active ? "1px solid #f5c400" : "1px solid transparent",
                  marginBottom: -1,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ──────────────────────────────────────────── */}
        <div style={{ padding: "28px 32px" }}>

          {statsTab === "Protocol" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const Y  = "#f5c400";
            const C  = "#00ffb3";
            const R  = "#c1121f";

            const week = MOCK_HISTORY.slice(-8);
            const weekNet = (week[week.length-1].assetsDepositedTotalUSD - week[0].assetsDepositedTotalUSD)
                          - (week[week.length-1].assetsWithdrawnTotalUSD - week[0].assetsWithdrawnTotalUSD);
            const flowPos = weekNet >= 0;
            const bigTVLPos = MOCK_LAST_BIG_TVL_DAY.changeUSD >= 0;

            const fmtAmt = (v: number) => {
              const abs = Math.abs(v);
              if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
              return `$${(abs / 1_000).toFixed(0)}K`;
            };
            const NOW = new Date("2026-03-03T00:00:00Z");
            const daysAgo = (iso: string) => {
              const d = new Date(iso);
              const diff = Math.floor((NOW.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
              return diff === 0 ? "Today" : diff === 1 ? "1 day ago" : `${diff} days ago`;
            };

            const tile = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
              <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", flex: 1, minWidth: 140, background: "#000" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 12 }}>{label}</div>
                <div style={{ fontSize: 26, letterSpacing: "0.06em", lineHeight: 1, color: Y }}>{value}</div>
                {sub && <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: OD, marginTop: 8 }}>{sub}</div>}
              </div>
            );

            return (
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {tile("Total TVL", fmtAmt(MOCK_VAULT.totalAssetsUSD))}
                {tile(
                  "Weekly Flow",
                  <span style={{ color: flowPos ? C : R }}>{flowPos ? "+" : "−"}{fmtAmt(weekNet)}</span>,
                  <span style={{ color: flowPos ? C : R }}>{flowPos ? "+" : "−"}{((Math.abs(weekNet) / MOCK_VAULT.totalAssetsUSD) * 100).toFixed(2)}% of TVL</span>
                )}
                {tile("Depositors", MOCK_VAULT.totalSuppliers.toLocaleString(), "Unique Addresses")}
                {tile(
                  "Last 50K+ Entry",
                  <span style={{ color: C }}>{fmtAmt(MOCK_LAST_BIG_DEPOSIT.amountUSD)}</span>,
                  daysAgo(MOCK_LAST_BIG_DEPOSIT.datetime)
                )}
                {tile(
                  "Last 50K+ Exit",
                  <span style={{ color: R }}>{fmtAmt(MOCK_LAST_BIG_WITHDRAWAL.amountUSD)}</span>,
                  daysAgo(MOCK_LAST_BIG_WITHDRAWAL.datetime)
                )}
                {tile(
                  "Last 100K+ Day",
                  <span style={{ color: bigTVLPos ? C : R }}>{bigTVLPos ? "+" : "−"}{fmtAmt(MOCK_LAST_BIG_TVL_DAY.changeUSD)}</span>,
                  daysAgo(MOCK_LAST_BIG_TVL_DAY.date)
                )}
              </div>
            );
          })()}

          {statsTab === "Protocol" && <div style={{ borderTop: "1px solid #7a3300", margin: "20px 0 2px" }} />}

          {statsTab === "Protocol" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const Y  = "#f5c400";
            const { snapshots, granularity } = getRangeConfig(range, MOCK_HISTORY);
            // Use the same bucketing as the flows chart so x-axes share identical dates
            const tvlData = granularity === "weekly" ? getWeeklyTVL(snapshots) : snapshots.slice(1);
            const fmt = (dateStr: string) =>
              new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
            const fmtY = (v: number) => `$${(v/1_000_000).toFixed(0)}M`;
            return (
              <div style={{ marginTop: 2 }}>
                {/* Chart header */}
                <div className="nge-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${OD}`, borderBottom: "none", padding: "12px 20px", background: "#000" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: O }}>
                    Total Value Locked
                    <span style={{ fontSize: 10, color: OD, marginLeft: 12 }}>— {granularity}</span>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {(["1W","1M","YTD","1Y"] as const).map((r) => (
                      <button key={r} onClick={() => setRange(r)} style={{
                        fontFamily: "inherit", fontSize: 10, letterSpacing: "0.18em",
                        textTransform: "uppercase", padding: "4px 10px",
                        background: range === r ? OD : "transparent",
                        color: range === r ? Y : OD,
                        border: `1px solid ${range === r ? O : OD}`,
                        cursor: "pointer",
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, background: "#000", padding: "16px 8px 8px 0" }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={tvlData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={Y} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={Y} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1a0a00" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={fmt}
                        tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={{ stroke: OD }}
                        interval="preserveStartEnd"
                        minTickGap={48}
                        padding={{ left: 0, right: 0 }}
                      />
                      <YAxis
                        tickFormatter={fmtY}
                        tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const v = Number(payload[0].value);
                          return (
                            <div style={{ background: "#0a0000", border: `1px solid ${O}`, padding: "8px 12px", fontSize: 10, fontFamily: "inherit", letterSpacing: "0.08em" }}>
                              <div style={{ color: OD, marginBottom: 4 }}>{label}</div>
                              <div style={{ color: Y }}>${(v/1_000_000).toFixed(2)}M</div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="totalAssetsUSD" fill="transparent" stroke="none" isAnimationActive={false} />
                      <Area dataKey="totalAssetsUSD" stroke={Y} strokeWidth={1.5} fill="url(#tvlGrad)" dot={false} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {statsTab === "Protocol" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const Y  = "#f5c400";
            const G  = "#00ffb3";
            const R  = "#c1121f";
            const { snapshots, granularity } = getRangeConfig(range, MOCK_HISTORY);
            const flows = granularity === "weekly"
              ? getWeeklyFlows(snapshots, "Total")
              : getDailyFlows(snapshots, "Total").slice(1);
            const fmtY = (v: number) => {
              const abs = Math.abs(v);
              if (abs >= 1_000_000) return `${v < 0 ? "−" : ""}$${(abs/1_000_000).toFixed(0)}M`;
              return `${v < 0 ? "−" : ""}$${(abs/1_000).toFixed(0)}K`;
            };
            const fmtAmt2 = (v: number) => {
              const abs = Math.abs(v);
              return abs >= 1_000_000 ? `$${(abs/1_000_000).toFixed(2)}M` : `$${(abs/1_000).toFixed(0)}K`;
            };
            return (
              <div style={{ marginTop: 2 }}>
                <div className="nge-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${OD}`, borderBottom: "none", padding: "12px 20px", background: "#000" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: O }}>
                      Net Flows
                      <span style={{ fontSize: 10, color: OD, marginLeft: 12 }}>— {granularity}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      <span style={{ color: G }}>▮ Net In</span>
                      <span style={{ color: R }}>▮ Net Out</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {(["1W","1M","YTD","1Y"] as const).map((r) => (
                      <button key={r} onClick={() => setRange(r)} style={{
                        fontFamily: "inherit", fontSize: 10, letterSpacing: "0.18em",
                        textTransform: "uppercase", padding: "4px 10px",
                        background: range === r ? "#7a3300" : "transparent",
                        color: range === r ? "#f5c400" : "#7a3300",
                        border: `1px solid ${range === r ? "#ff6b00" : "#7a3300"}`,
                        cursor: "pointer",
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, background: "#000", padding: "16px 8px 8px 0" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={flows} margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barCategoryGap="20%">
                      <CartesianGrid stroke="#1a0a00" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                        tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={{ stroke: OD }}
                        interval="preserveStartEnd"
                        minTickGap={48}
                        padding={{ left: 0, right: 0 }}
                      />
                      <YAxis
                        tickFormatter={fmtY}
                        tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                      />
                      <ReferenceLine y={0} stroke={OD} strokeWidth={1} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const pt = payload[0]?.payload;
                          const dep = pt?.deposits ?? 0;
                          const wit = pt?.withdrawals ?? 0;
                          const net = pt?.net ?? 0;
                          return (
                            <div style={{ background: "#0a0000", border: `1px solid ${O}`, padding: "8px 12px", fontSize: 10, fontFamily: "inherit", letterSpacing: "0.08em" }}>
                              <div style={{ color: OD, marginBottom: 6 }}>{label}</div>
                              <div style={{ color: G, marginBottom: 2 }}>IN   +{fmtAmt2(dep)}</div>
                              <div style={{ color: R, marginBottom: 4 }}>OUT  −{fmtAmt2(wit)}</div>
                              <div style={{ color: net >= 0 ? G : R, borderTop: `1px solid ${OD}`, marginTop: 2, paddingTop: 4 }}>NET  {net >= 0 ? "+" : "−"}{fmtAmt2(Math.abs(net))}</div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="net" maxBarSize={14} radius={[1, 1, 1, 1]} isAnimationActive={false}>
                        {flows.map((entry, i) => (
                          <Cell key={i} fill={entry.net >= 0 ? G : R} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {statsTab === "Protocol" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const Y  = "#f5c400";
            const STABLES = "#f5c400";
            const ETH_COL = "#00c8ff";
            const { snapshots, granularity } = getRangeConfig(range, MOCK_HISTORY);
            const raw = granularity === "weekly" ? getWeeklyTVL(snapshots) : snapshots.slice(1);
            const chartData = raw.map((s) => {
              const total = s.totalAssetsUSD || 1;
              return {
                date:       s.date,
                totalUSD:   s.totalAssetsUSD,
                stablesPct: (s.usdPoolAssetsUSD / total) * 100,
                topPct:     100,
                ethPct:     (s.ethPoolAssetsUSD  / total) * 100,
                stablesUSD: s.usdPoolAssetsUSD,
                ethUSD:     s.ethPoolAssetsUSD,
              };
            });
            const fmt = (d: string) =>
              new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
            return (
              <div style={{ marginTop: 2 }}>
                <div className="nge-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${OD}`, borderBottom: "none", padding: "12px 20px", background: "#000" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: O }}>
                      Dominance
                      <span style={{ fontSize: 10, color: OD, marginLeft: 12 }}>— {granularity} · % of tvl</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, color: OD }}>
                        <span style={{ width: 7, height: 7, background: STABLES, display: "inline-block" }} />
                        Stables
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, color: OD }}>
                        <span style={{ width: 7, height: 7, background: ETH_COL, display: "inline-block" }} />
                        ETH
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {(["1W","1M","YTD","1Y"] as const).map((r) => (
                      <button key={r} onClick={() => setRange(r)} style={{
                        fontFamily: "inherit", fontSize: 10, letterSpacing: "0.18em",
                        textTransform: "uppercase", padding: "4px 10px",
                        background: range === r ? OD : "transparent",
                        color: range === r ? Y : OD,
                        border: `1px solid ${range === r ? O : OD}`,
                        cursor: "pointer",
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, background: "#000", padding: "16px 8px 8px 0" }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="ngStablesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={STABLES} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={STABLES} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="ngEthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={ETH_COL} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={ETH_COL} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1a0a00" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={fmt}
                        tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={{ stroke: OD }}
                        interval="preserveStartEnd"
                        minTickGap={48}
                        padding={{ left: 0, right: 0 }}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        width={52}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const pt = payload[0].payload;
                          const fmtUSD = (v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2)}M` : `$${(v/1_000).toFixed(0)}K`;
                          return (
                            <div style={{ background: "#0a0000", border: `1px solid ${O}`, padding: "8px 12px", fontSize: 10, fontFamily: "inherit", letterSpacing: "0.08em" }}>
                              <div style={{ color: OD, marginBottom: 6 }}>{label}</div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 2 }}>
                                <span style={{ color: STABLES }}>Stables</span>
                                <span style={{ color: "#ccc" }}>{pt.stablesPct.toFixed(1)}% <span style={{ color: OD }}>({fmtUSD(pt.stablesUSD)})</span></span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 4 }}>
                                <span style={{ color: ETH_COL }}>ETH</span>
                                <span style={{ color: "#ccc" }}>{pt.ethPct.toFixed(1)}% <span style={{ color: OD }}>({fmtUSD(pt.ethUSD)})</span></span>
                              </div>
                              <div style={{ borderTop: `1px solid ${OD}`, paddingTop: 4, color: OD, display: "flex", justifyContent: "space-between" }}>
                                <span>Total</span>
                                <span>{fmtUSD(pt.totalUSD)}</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="topPct" fill="transparent" stroke="none" isAnimationActive={false} />
                      <Area type="monotone" dataKey="topPct"     stroke={ETH_COL} strokeWidth={1.5} fill="url(#ngEthGrad)"    dot={false} activeDot={false} isAnimationActive={false} />
                      <Area type="monotone" dataKey="stablesPct" stroke={STABLES} strokeWidth={1.5} fill="url(#ngStablesGrad)" dot={false} activeDot={{ r: 3, fill: STABLES, strokeWidth: 0 }} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {statsTab === "Autopools" && (() => {
            const OD = "#7a3300";
            const Y  = "#f5c400";
            const C  = "#00ffb3";
            const R  = "#c1121f";

            const fmtUSD2 = (v: number) => {
              const abs = Math.abs(v);
              if (abs >= 1_000_000) return `$${(abs/1_000_000).toFixed(2)}M`;
              return `$${(abs/1_000).toFixed(0)}K`;
            };

            const sorted = [...MOCK_POOLS].filter(p => !p.shutdown);
            const topInflow  = [...sorted].sort((a, b) => b.weeklyNetFlowUSD - a.weeklyNetFlowUSD)[0];
            const topOutflow = [...sorted].sort((a, b) => a.weeklyNetFlowUSD - b.weeklyNetFlowUSD)[0];
            const mostActive = [...sorted].sort((a, b) => Math.abs(b.weeklyNetFlowUSD) - Math.abs(a.weeklyNetFlowUSD))[0];

            const spotTile = (label: string, pool: typeof MOCK_POOLS[0], value: React.ReactNode, valueColor: string, subLabel: string) => (
              <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", flex: 1, minWidth: 180, background: "#000" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 12 }}>{label}</div>
                <div style={{ fontSize: 13, letterSpacing: "0.14em", color: Y, marginBottom: 6 }}>{pool.symbol}</div>
                <div style={{ fontSize: 24, letterSpacing: "0.06em", lineHeight: 1, color: valueColor }}>{value}</div>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: OD, marginTop: 8 }}>{subLabel}</div>
              </div>
            );

            return (
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 2 }}>
                {spotTile(
                  "Largest Inflow",
                  topInflow,
                  `+${fmtUSD2(topInflow.weeklyNetFlowUSD)}`,
                  C,
                  "Weekly Net Inflow"
                )}
                {spotTile(
                  "Largest Outflow",
                  topOutflow,
                  `−${fmtUSD2(Math.abs(topOutflow.weeklyNetFlowUSD))}`,
                  R,
                  "Weekly Net Outflow"
                )}
                {spotTile(
                  "Most Active",
                  mostActive,
                  fmtUSD2(Math.abs(mostActive.weeklyNetFlowUSD)),
                  Y,
                  "Weekly Gross Flow"
                )}
              </div>
            );
          })()}

          {statsTab === "Autopools" && <div style={{ borderTop: "1px solid #7a3300", margin: "20px 0 2px" }} />}

          {statsTab === "Autopools" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const Y  = "#f5c400";
            const G  = "#00ffb3";
            const R  = "#c1121f";
            const ETH_BLUE = "#00c8ff";
            const fmtUSD = (n: number) => {
              const abs = Math.abs(n); const sign = n < 0 ? "−" : "";
              if (abs >= 1_000_000) return `${sign}$${(abs/1_000_000).toFixed(2)}M`;
              return `${sign}$${(abs/1_000).toFixed(0)}K`;
            };
            const fmtETH = (n: number) => {
              const abs = Math.abs(n);
              if (abs >= 1000) return `Ξ${(abs/1000).toFixed(1)}K`;
              if (abs >= 1)    return `Ξ${abs.toFixed(2)}`;
              return `Ξ${abs.toFixed(4)}`;
            };
            // Directional elbow sparkline: flat baseline → elbow at 50% → up/down to end.
            // Displacement is proportional to % change; ±10% = max (top/bottom edge).
            const Sparkline = ({ data }: { data?: number[] }) => {
              const W = 56, H = 28, pad = 3;
              if (!data || data.length < 2) return <svg width={W} height={H} />;
              const prev = data[data.length - 2];
              const curr = data[data.length - 1];
              if (prev <= 0) return <svg width={W} height={H} />;
              const pct     = (curr - prev) / prev;
              const clamped = Math.max(-0.10, Math.min(0.10, pct));
              const midY    = H / 2;
              const endY    = midY - (clamped / 0.10) * (midY - pad);
              const lineColor = Math.abs(pct) < 0.005 ? O : pct > 0 ? G : R;
              return (
                <svg width={W} height={H} style={{ display: "block", flexShrink: 0 }}>
                  <polyline
                    points={`0,${midY} ${W/2},${midY} ${W},${endY}`}
                    fill="none" stroke={lineColor} strokeWidth={1.5}
                    strokeLinejoin="round" strokeLinecap="round"
                  />
                </svg>
              );
            };
            const hasEthPools = MOCK_POOLS.some(p => p.denom === "ETH" && !p.shutdown);
            return (
              <div style={{ marginTop: 2 }}>
                {/* ETH/USD toggle — only shown when ETH pools exist */}
                {hasEthPools && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <span style={{ fontSize: 9, letterSpacing: "0.18em", color: OD, marginRight: 6, textTransform: "uppercase" }}>ETH pools</span>
                      {(["ETH", "USD"] as const).map(d => (
                        <button key={d} onClick={() => setEthPoolDenom(d)} style={{
                          fontFamily: "inherit", fontSize: 9, letterSpacing: "0.18em",
                          textTransform: "uppercase", padding: "3px 8px",
                          background: ethPoolDenom === d ? (d === "ETH" ? ETH_BLUE : OD) : "transparent",
                          color: ethPoolDenom === d ? "#000" : OD,
                          border: `1px solid ${ethPoolDenom === d ? (d === "ETH" ? ETH_BLUE : O) : OD}`,
                          cursor: "pointer",
                        }}>{d}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2 }}>
                  {MOCK_POOLS.map((pool) => {
                    const flowNeutral = Math.abs(pool.weeklyNetFlowUSD) < 1_000;
                    const flowPos     = pool.weeklyNetFlowUSD > 0;
                    const flowColor   = flowNeutral ? O : (flowPos ? G : R);
                    const denomColor  = pool.denom === "ETH" ? ETH_BLUE : Y;
                    const showInETH   = pool.denom === "ETH" && ethPoolDenom === "ETH";
                    const tvlDisplay  = showInETH ? fmtETH(pool.tvlNative) : fmtUSD(pool.tvlUSD);
                    const flowDisplay = showInETH
                      ? `${flowNeutral ? "►" : (flowPos ? "▲" : "▼")} ${fmtETH(Math.abs(pool.weeklyNetFlowNative))}`
                      : `${flowNeutral ? "►" : (flowPos ? "▲" : "▼")} ${fmtUSD(Math.abs(pool.weeklyNetFlowUSD))}`;
                    return (
                      <div key={pool.id} className="nge-panel" onClick={() => setSelectedPool(pool)} style={{ border: `1px solid ${OD}`, background: "#000", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, cursor: "pointer" }}>
                        {/* Header: symbol + badges + sparkline */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, letterSpacing: "0.14em", color: Y }}>{pool.symbol}</span>
                              {pool.paused && <span style={{ fontSize: 9, letterSpacing: "0.1em", padding: "1px 5px", border: `1px solid ${R}`, color: R }}>PAUSED</span>}
                            </div>
                            <div style={{ display: "flex", gap: 5 }}>
                              <span style={{ fontSize: 9, letterSpacing: "0.1em", padding: "1px 6px", border: `1px solid ${denomColor}`, color: denomColor }}>{pool.denomToken}</span>
                              <span style={{ fontSize: 9, letterSpacing: "0.1em", padding: "1px 6px", border: `1px solid ${OD}`, color: OD }}>{pool.chain}</span>
                            </div>
                          </div>
                          <Sparkline data={pool.tvlWeekly} />
                        </div>
                        {/* Divider */}
                        <div style={{ borderTop: `1px solid ${OD}` }} />
                        {/* Metrics */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[
                            { label: "TVL",         value: tvlDisplay,                      color: "#ccc"      },
                            { label: "Weekly Flow",  value: flowDisplay,                     color: flowColor   },
                            { label: "Depositors",   value: pool.depositors.toLocaleString(), color: "#ccc"     },
                          ].map(({ label, value, color }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: OD }}>{label}</span>
                              <span style={{ fontSize: 12, letterSpacing: "0.06em", color }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {statsTab === "Deposits" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const Y  = "#f5c400";
            const G  = "#00ffb3";
            const R  = "#c1121f";
            const AM = "#f5a623";
            const churnColor = (v: number) => v < 30 ? G : v < 50 ? AM : R;
            const ib = (text: string) => (
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6 }}>
                <div
                  onMouseEnter={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"; }}
                  onMouseLeave={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "none"; }}
                  style={{ width: 12, height: 12, borderRadius: "50%", border: `1px solid ${OD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: OD, cursor: "default", userSelect: "none", letterSpacing: 0, flexShrink: 0 }}
                >i</div>
                <div style={{ display: "none", position: "absolute", top: 18, left: 0, zIndex: 50, background: "#0a0000", border: `1px solid ${O}`, padding: "10px 14px", width: 240, fontSize: 10, letterSpacing: "0.06em", textTransform: "none", color: "#ccc", lineHeight: 1.6, pointerEvents: "none" }}>
                  {text}
                </div>
              </div>
            );
            return (
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", flex: 1, minWidth: 180, background: "#000" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 12, display: "flex", alignItems: "center" }}>
                    Median Hold Time
                    {ib("Time from a wallet's first deposit to its first full exit. Median is robust to outliers; mean is pulled up by long-term holders.")}
                  </div>
                  <div style={{ display: "flex", gap: 32 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD, marginBottom: 6 }}>Median</div>
                      <div style={{ fontSize: 26, letterSpacing: "0.06em", lineHeight: 1, color: Y }}>{MOCK_HOLD_TIME.medianDays}<span style={{ fontSize: 11, color: OD, marginLeft: 4 }}>days</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD, marginBottom: 6 }}>Mean</div>
                      <div style={{ fontSize: 26, letterSpacing: "0.06em", lineHeight: 1, color: Y }}>{MOCK_HOLD_TIME.meanDays}<span style={{ fontSize: 11, color: OD, marginLeft: 4 }}>days</span></div>
                    </div>
                  </div>
                </div>
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", flex: 1, minWidth: 220, background: "#000" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 12, display: "flex", alignItems: "center" }}>
                    Churn Rate
                    {ib("% of wallets that deposited and then fully exited within the given window. High churn suggests users are not finding long-term value.")}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    {([{ label: "30d", value: MOCK_CHURN.d30 }, { label: "60d", value: MOCK_CHURN.d60 }, { label: "90d", value: MOCK_CHURN.d90 }] as const).map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD }}>{label}</div>
                        <div style={{ fontSize: 26, letterSpacing: "0.06em", lineHeight: 1, color: churnColor(value) }}>{value}<span style={{ fontSize: 11, marginLeft: 2, color: churnColor(value) }}>%</span></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", flex: 1, minWidth: 140, background: "#000" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 12, display: "flex", alignItems: "center" }}>
                    Re-deposit Rate
                    {ib("% of wallets that fully withdrew and later made a new deposit. A high rate signals trust in the protocol despite a temporary exit.")}
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD, marginBottom: 6 }}>Rate</div>
                  <div style={{ fontSize: 26, letterSpacing: "0.06em", lineHeight: 1, color: G }}>{MOCK_REDEPOSIT_RATE}<span style={{ fontSize: 11, marginLeft: 2, color: G }}>%</span></div>
                </div>
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", flex: 2, minWidth: 280, background: "#000" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 4, display: "flex", alignItems: "center" }}>
                    Position Size Change by Cohort
                    {ib("For wallets still holding today, how has their position size changed since their first deposit? Grouped by how long ago they first deposited. Positive % = wallets have added more over time (conviction). Negative % = wallets have trimmed.")}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: OD, marginBottom: 12 }}>Median change since first deposit</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    {MOCK_COHORT_CONVICTION.map((c) => {
                      const pos = c.changePct >= 0;
                      const col = pos ? G : R;
                      return (
                        <div key={c.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: OD }}>{c.label}</span>
                          <div style={{ fontSize: 22, letterSpacing: "0.04em", lineHeight: 1, color: col }}>
                            {pos ? "+" : ""}{c.changePct}<span style={{ fontSize: 10, marginLeft: 2, color: col }}>%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {statsTab === "Deposits" && (
            <div style={{ padding: "20px 0 2px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "#ff6b00" }}>Retention</span>
              <div style={{ flex: 1, height: 1, background: "#7a3300" }} />
            </div>
          )}

          {statsTab === "Deposits" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const TIER_COLORS = ["#e05252","#e07c52","#daa320","#a3be8c","#4dbb6e","#52b0d6","#a78bfa"];
            const TIERS = ["t1","t2","t3","t4","t5","t6","t7"] as const;
            const RETENTION_INFO = "Survival curves showing what % of wallets in each deposit-size tier are still holding at N days after their first deposit. If larger depositors stay longer, the curves for higher tiers sit above the lower ones and decay more slowly.";
            return (
              <div style={{ marginTop: 2 }}>
                <div className="nge-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${OD}`, borderBottom: "none", padding: "12px 20px", background: "#000" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: O }}>
                    Retention by Deposit Tier
                    <span style={{ fontSize: 10, color: OD }}>— % of wallets still holding · days since first deposit</span>
                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                      <div
                        onMouseEnter={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"; }}
                        onMouseLeave={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "none"; }}
                        style={{ width: 13, height: 13, borderRadius: "50%", border: `1px solid ${OD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: OD, cursor: "default", userSelect: "none", letterSpacing: 0, flexShrink: 0 }}
                      >i</div>
                      <div style={{ display: "none", position: "absolute", top: 20, left: 0, zIndex: 50, background: "#0a0000", border: `1px solid ${O}`, padding: "10px 14px", width: 280, fontSize: 10, letterSpacing: "0.06em", textTransform: "none", color: "#ccc", lineHeight: 1.6, pointerEvents: "none" }}>
                        {RETENTION_INFO}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, background: "#000", padding: "16px 8px 8px 0" }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={MOCK_RETENTION_BY_TIER} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#1a0a00" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="day"
                        type="number"
                        domain={[0, 365]}
                        ticks={[0, 30, 60, 90, 120, 180, 240, 300, 365]}
                        tickFormatter={(v) => v === 0 ? "0" : `${v}d`}
                        tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={{ stroke: OD }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div style={{ background: "#0a0000", border: `1px solid ${O}`, padding: "8px 12px", fontSize: 10, fontFamily: "inherit", letterSpacing: "0.08em" }}>
                              <div style={{ color: OD, marginBottom: 6 }}>Day {label}</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {[...payload].reverse().map((p) => (
                                  <div key={p.dataKey as string} style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                                    <span style={{ color: p.color }}>{RETENTION_TIER_LABELS[p.dataKey as string]}</span>
                                    <span style={{ color: p.color }}>{Number(p.value).toFixed(0)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }}
                      />
                      {TIERS.map((key, i) => (
                        <Line key={key} dataKey={key} stroke={TIER_COLORS[i]} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "10px 20px 6px" }}>
                    {TIERS.map((key, i) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 16, height: 2, background: TIER_COLORS[i] }} />
                        <span style={{ fontSize: 10, color: OD, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {RETENTION_TIER_LABELS[key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {statsTab === "Deposits" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const G  = "#00ffb3";
            const AM = "#f5a623";
            const R  = "#c1121f";
            const cols = [
              { key: "d30"  as const, label: "30d"  },
              { key: "d60"  as const, label: "60d"  },
              { key: "d90"  as const, label: "90d"  },
              { key: "d180" as const, label: "180d" },
            ];
            const cellColor = (v: number | null) =>
              v === null ? OD : v >= 65 ? G : v >= 48 ? AM : R;
            const cellBg = (v: number | null) =>
              v === null ? "transparent"
              : v >= 65 ? "rgba(0,255,179,0.07)"
              : v >= 48 ? "rgba(245,166,35,0.07)"
              : "rgba(193,18,31,0.07)";
            const COHORT_INFO = "Each row is a group of wallets that made their first deposit in that month. Each column shows what % of that group was still holding at 30, 60, 90, or 180 days after joining. — means the time window has not yet elapsed.";
            const CHURN_INFO  = "Inflows show TVL deposited by wallets making their first deposit in that month. Outflows show TVL subsequently withdrawn by those same wallets upon full exit. Both bars refer to the same cohort — this is not a measure of total protocol flows. * = month-to-date.";
            const fmtY = (v: number) => {
              const abs = Math.abs(v);
              return abs >= 1_000_000 ? `$${(abs/1_000_000).toFixed(0)}M` : `$${(abs/1_000).toFixed(0)}K`;
            };
            const infoBtn = (text: string, right = false) => (
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <div
                  onMouseEnter={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"; }}
                  onMouseLeave={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "none"; }}
                  style={{ width: 13, height: 13, borderRadius: "50%", border: `1px solid ${OD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: OD, cursor: "default", userSelect: "none", letterSpacing: 0, flexShrink: 0 }}
                >i</div>
                <div style={{ display: "none", position: "absolute", top: 20, ...(right ? { right: 0 } : { left: 0 }), zIndex: 50, background: "#0a0000", border: `1px solid ${O}`, padding: "10px 14px", width: 260, fontSize: 10, letterSpacing: "0.06em", textTransform: "none", color: "#ccc", lineHeight: 1.6, pointerEvents: "none" }}>
                  {text}
                </div>
              </div>
            );
            return (
              <div style={{ display: "flex", gap: 2, alignItems: "stretch" }}>

                {/* Left: cohort retention heatmap */}
                <div style={{ flexShrink: 0 }}>
                  <div className="nge-panel" style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${OD}`, borderBottom: "none", padding: "12px 20px", background: "#000", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: O }}>
                    Cohort Retention
                    <span style={{ fontSize: 10, color: OD }}>— % still holding at N days</span>
                    {infoBtn(COHORT_INFO)}
                  </div>
                  <div className="nge-panel" style={{ border: `1px solid ${OD}`, background: "#000", padding: "16px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "56px repeat(4, 68px)", marginBottom: 4 }}>
                      <div />
                      {cols.map(c => (
                        <div key={c.key} style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: OD, textAlign: "center" }}>{c.label}</div>
                      ))}
                    </div>
                    {MOCK_RETENTION_COHORTS.map((row) => (
                      <div key={row.label} style={{ display: "grid", gridTemplateColumns: "56px repeat(4, 68px)", marginBottom: 2 }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.08em", color: OD, display: "flex", alignItems: "center" }}>{row.label}</div>
                        {cols.map(c => {
                          const v = row[c.key] as number | null;
                          return (
                            <div key={c.key} style={{ background: cellBg(v), display: "flex", alignItems: "center", justifyContent: "center", height: 26, marginLeft: 2, fontSize: v === null ? 10 : 11, letterSpacing: "0.04em", color: cellColor(v) }}>
                              {v === null ? "—" : `${v}%`}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                      {([[G, "rgba(0,255,179,0.07)", "≥65%"], [AM, "rgba(245,166,35,0.07)", "48–64%"], [R, "rgba(193,18,31,0.07)", "<48%"]] as const).map(([color, bg, label]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 10, height: 10, background: bg, border: `1px solid ${color}` }} />
                          <span style={{ fontSize: 10, color: OD, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: churn waterfall */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div className="nge-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${OD}`, borderBottom: "none", padding: "12px 20px", background: "#000" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: O }}>
                      Churn Waterfall
                      <span style={{ fontSize: 10, color: OD }}>— depositor tvl in vs out</span>
                      <span style={{ fontSize: 10, color: OD }}>* mtd</span>
                      {infoBtn(CHURN_INFO, true)}
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      <span style={{ color: G }}>▮ Inflow</span>
                      <span style={{ color: R }}>▮ Outflow</span>
                    </div>
                  </div>
                  <div className="nge-panel" style={{ border: `1px solid ${OD}`, background: "#000", padding: "16px 8px 8px 0", flex: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={MOCK_CHURN_WATERFALL} margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barCategoryGap="22%">
                        <CartesianGrid stroke="#1a0a00" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }} tickLine={false} axisLine={{ stroke: OD }} />
                        <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }} tickLine={false} axisLine={false} width={52} />
                        <ReferenceLine y={0} stroke={OD} strokeWidth={1} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as { label: string; inflow: number; outflow: number };
                            const net = d.inflow + d.outflow;
                            const fmt = (v: number) => `$${(Math.abs(v)/1_000_000).toFixed(2)}M`;
                            return (
                              <div style={{ background: "#0a0000", border: `1px solid ${O}`, padding: "8px 12px", fontSize: 10, fontFamily: "inherit", letterSpacing: "0.08em" }}>
                                <div style={{ color: OD, marginBottom: 6 }}>{d.label}</div>
                                <div style={{ color: G, marginBottom: 2 }}>IN   +{fmt(d.inflow)}</div>
                                <div style={{ color: R, marginBottom: 4 }}>OUT  −{fmt(Math.abs(d.outflow))}</div>
                                <div style={{ color: net >= 0 ? G : R, borderTop: `1px solid ${OD}`, marginTop: 2, paddingTop: 4 }}>NET  {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}</div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="inflow"  fill={G} opacity={0.7} isAnimationActive={false} />
                        <Bar dataKey="outflow" fill={R} opacity={0.7} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            );
          })()}

          {statsTab === "Deposits" && (
            <div style={{ padding: "20px 0 2px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "#ff6b00" }}>Deposit Behavior</span>
              <div style={{ flex: 1, height: 1, background: "#7a3300" }} />
            </div>
          )}

          {statsTab === "Deposits" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const AM = "#f5a623";
            const fmtUSD = (v: number) => v >= 1_000_000
              ? `$${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `$${Math.round(v / 1_000)}K`
              : `$${v}`;
            return (
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 12 }}>
                {/* Deposit size since inception */}
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", flex: 1, minWidth: 180, background: "#000" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 12 }}>
                    Deposit Size — Since Inception
                  </div>
                  <div style={{ display: "flex", gap: 28 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD, marginBottom: 4 }}>Median</div>
                      <div style={{ fontSize: 24, letterSpacing: "0.04em", color: AM, lineHeight: 1 }}>
                        {fmtUSD(MOCK_DEPOSITOR_STATS_INCEPTION.medianDepositUSD)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD, marginBottom: 4 }}>Mean</div>
                      <div style={{ fontSize: 24, letterSpacing: "0.04em", color: AM, lineHeight: 1 }}>
                        {fmtUSD(MOCK_DEPOSITOR_STATS_INCEPTION.meanDepositUSD)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deposit size current depositors */}
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", flex: 1, minWidth: 180, background: "#000" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 12 }}>
                    Deposit Size — Current Holders
                  </div>
                  <div style={{ display: "flex", gap: 28 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD, marginBottom: 4 }}>Median</div>
                      <div style={{ fontSize: 24, letterSpacing: "0.04em", color: AM, lineHeight: 1 }}>
                        {fmtUSD(MOCK_DEPOSITOR_STATS_CURRENT.medianDepositUSD)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD, marginBottom: 4 }}>Mean</div>
                      <div style={{ fontSize: 24, letterSpacing: "0.04em", color: AM, lineHeight: 1 }}>
                        {fmtUSD(MOCK_DEPOSITOR_STATS_CURRENT.meanDepositUSD)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Median deposit count */}
                <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", flex: "0 0 auto", minWidth: 160, background: "#000" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 12 }}>
                    Median Deposit Count
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD, marginBottom: 4 }}>Per Wallet</div>
                  <div style={{ fontSize: 24, letterSpacing: "0.04em", color: AM, lineHeight: 1 }}>
                    {MOCK_MEDIAN_DEPOSIT_COUNT.toFixed(1)}
                    <span style={{ fontSize: 11, color: OD, marginLeft: 6 }}>txns</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {statsTab === "Deposits" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const G  = "#00ffb3";
            const AM = "#f5a623";
            const peakCount = Math.max(...MOCK_DEPOSIT_DISTRIBUTION.map(d => d.count));
            return (
              <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", marginTop: 2 }}>
                {/* header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: O }}>
                      Deposit Size Distribution
                    </span>
                    {/* info button */}
                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6 }}>
                      <div
                        onMouseEnter={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"; }}
                        onMouseLeave={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "none"; }}
                        style={{ width: 12, height: 12, borderRadius: "50%", border: `1px solid ${OD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: OD, cursor: "default", userSelect: "none", letterSpacing: 0, flexShrink: 0 }}
                      >i</div>
                      <div style={{ display: "none", position: "absolute", top: 18, left: 0, zIndex: 50, background: "#0a0000", border: `1px solid ${O}`, padding: "10px 14px", width: 260, fontSize: 10, letterSpacing: "0.06em", textTransform: "none", color: "#ccc", lineHeight: 1.6, pointerEvents: "none" }}>
                        Current holders bucketed by live position size. Log scale on the Y-axis prevents large buckets from dwarfing small ones. A bimodal shape indicates a retail cluster and a whale cluster with distinct behaviour.
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: OD, marginBottom: 16 }}>
                  current holders by position size — log scale
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={MOCK_DEPOSIT_DISTRIBUTION} margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap="28%">
                    <CartesianGrid stroke={OD} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                      tickLine={false}
                      axisLine={{ stroke: OD }}
                    />
                    <YAxis
                      scale="log"
                      domain={[1, "auto"]}
                      tickFormatter={(v: number) => v >= 1000 ? `${v / 1000}K` : `${v}`}
                      tick={{ fontSize: 11, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      allowDataOverflow
                    />
                    <Tooltip
                      cursor={{ fill: OD, opacity: 0.2 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { label: string; count: number };
                        return (
                          <div style={{ background: "#0a0a0a", border: `1px solid ${O}`, padding: "8px 12px", fontSize: 11, fontFamily: "inherit", letterSpacing: "0.08em" }}>
                            <div style={{ color: OD, marginBottom: 4 }}>{d.label}</div>
                            <div style={{ color: G }}>{d.count.toLocaleString()} wallets</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" isAnimationActive={false}>
                      {MOCK_DEPOSIT_DISTRIBUTION.map((entry, i) => (
                        <Cell key={i} fill={entry.count === peakCount ? G : AM} fillOpacity={entry.count === peakCount ? 0.85 : 0.4} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          {statsTab === "Deposits" && (
            <div style={{ padding: "20px 0 2px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "#ff6b00" }}>Concentration Risk</span>
              <div style={{ flex: 1, height: 1, background: "#7a3300" }} />
            </div>
          )}

          {statsTab === "Deposits" && (() => {
            const O  = "#ff6b00";
            const OD = "#7a3300";
            const AM = "#f5a623";
            const R  = "#c1121f";
            const giniColor = MOCK_GINI < 0.5 ? "#00ffb3" : MOCK_GINI < 0.75 ? AM : R;
            const sorted = [...MOCK_WALLET_BALANCES].sort((a, b) => a - b);
            const n = sorted.length;
            const total = sorted.reduce((s, v) => s + v, 0);
            const step = Math.max(1, Math.floor(n / 120));
            const points: { x: number; curve: number; equality: number }[] = [{ x: 0, curve: 0, equality: 0 }];
            let cumSum = 0;
            for (let i = 0; i < n; i++) {
              cumSum += sorted[i];
              if ((i + 1) % step === 0 || i === n - 1) {
                const x = Math.round(((i + 1) / n) * 1000) / 10;
                points.push({ x, curve: Math.round((cumSum / total) * 1000) / 10, equality: x });
              }
            }
            return (
              <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "16px 20px", marginTop: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: O }}>
                    Gini Coefficient
                  </span>
                  <div style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6 }}>
                    <div
                      onMouseEnter={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"; }}
                      onMouseLeave={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = "none"; }}
                      style={{ width: 12, height: 12, borderRadius: "50%", border: `1px solid ${OD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: OD, cursor: "default", userSelect: "none", letterSpacing: 0, flexShrink: 0 }}
                    >i</div>
                    <div style={{ display: "none", position: "absolute", top: 18, left: 0, zIndex: 50, background: "#0a0000", border: `1px solid ${O}`, padding: "10px 14px", width: 260, fontSize: 10, letterSpacing: "0.06em", textTransform: "none", color: "#ccc", lineHeight: 1.6, pointerEvents: "none" }}>
                      The Lorenz curve plots the bottom X% of wallets against their share of total TVL. A perfectly equal distribution follows the diagonal. The Gini coefficient measures the gap between the two — 0 = perfect equality, 1 = one wallet holds everything. Values above 0.75 indicate high whale concentration.
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: OD, marginBottom: 16 }}>
                  cumulative share of wallets vs cumulative share of tvl
                </div>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", top: 8, left: 44, zIndex: 1 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: OD, marginBottom: 3 }}>Gini</div>
                    <div style={{ fontSize: 22, letterSpacing: "0.04em", lineHeight: 1, color: giniColor }}>{MOCK_GINI.toFixed(2)}</div>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={points} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                      <CartesianGrid stroke={OD} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={{ stroke: OD }}
                        ticks={[0, 25, 50, 75, 100]}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: OD, fontFamily: "inherit", letterSpacing: "0.06em" }}
                        tickLine={false}
                        axisLine={false}
                        ticks={[0, 25, 50, 75, 100]}
                        width={36}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const curve = payload.find((p) => p.dataKey === "curve");
                          if (!curve) return null;
                          const actual = Number(curve.value);
                          const equal = Number(label);
                          return (
                            <div style={{ background: "#0a0000", border: `1px solid ${O}`, padding: "8px 12px", fontSize: 11, fontFamily: "inherit", letterSpacing: "0.08em" }}>
                              <div style={{ color: OD, marginBottom: 8 }}>bottom {equal.toFixed(1)}% of wallets</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                                  <span style={{ color: OD }}>equal share</span>
                                  <span style={{ color: OD }}>{equal.toFixed(1)}%</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                                  <span style={{ color: OD }}>actual</span>
                                  <span style={{ color: AM }}>{actual.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line dataKey="equality" dot={false} stroke={OD} strokeWidth={1} strokeDasharray="4 4" legendType="none" isAnimationActive={false} />
                      <Line dataKey="curve" dot={false} stroke={AM} strokeWidth={1.5} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

        </div>

        </div>

      {/* ── Pool detail overlay ───────────────────────────────────────────────── */}
      {selectedPool && (() => {
        const pool = selectedPool;
        const O  = "#ff6b00";
        const OD = "#7a3300";
        const Y  = "#f5c400";
        const G  = "#00ffb3";
        const R  = "#c1121f";
        const denomColor = pool.denom === "ETH" ? "#00c8ff" : Y;
        const hist = pool.poolHistory ?? [];
        const flowPos = (pool.weeklyNetFlowUSD ?? 0) >= 0;

        const fmtAmt = (v: number) => {
          const abs = Math.abs(v);
          if (abs >= 1_000_000) return `$${(abs/1_000_000).toFixed(2)}M`;
          return `$${(abs/1_000).toFixed(0)}K`;
        };
        const fmtY = (v: number) => `$${(v/1_000_000).toFixed(1)}M`;
        const fmt  = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

        const NOW_OVERLAY = new Date();
        const daysAgo = (iso: string) => {
          const diff = Math.floor((NOW_OVERLAY.getTime() - new Date(iso).getTime()) / 86400000);
          return diff === 0 ? "Today" : diff === 1 ? "1 day ago" : `${diff} days ago`;
        };

        const tile = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
          <div className="nge-panel" style={{ border: `1px solid ${OD}`, padding: "14px 18px", flex: 1, minWidth: 130, background: "#000" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b85000", marginBottom: 10 }}>{label}</div>
            <div style={{ fontSize: 22, letterSpacing: "0.06em", lineHeight: 1, color: Y }}>{value}</div>
            {sub && <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: OD, marginTop: 6 }}>{sub}</div>}
          </div>
        );

        // Slice history for charts — last 30 days by default
        const chartData = hist.slice(-30);

        return (
          <div
            onClick={() => setSelectedPool(null)}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", overflowY: "auto" }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: "#000", border: `1px solid ${O}`, boxShadow: `0 0 40px rgba(255,107,0,0.2)`, width: "100%", maxWidth: 860, padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 18, letterSpacing: "0.18em", color: Y, marginBottom: 8 }}>{pool.symbol}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 9, letterSpacing: "0.1em", padding: "2px 7px", border: `1px solid ${denomColor}`, color: denomColor }}>{pool.denomToken}</span>
                    <span style={{ fontSize: 9, letterSpacing: "0.1em", padding: "2px 7px", border: `1px solid ${OD}`, color: OD }}>{pool.chain}</span>
                    {pool.paused && <span style={{ fontSize: 9, letterSpacing: "0.1em", padding: "2px 7px", border: `1px solid ${R}`, color: R }}>PAUSED</span>}
                  </div>
                </div>
                <button onClick={() => setSelectedPool(null)} style={{ fontFamily: "inherit", fontSize: 18, background: "transparent", border: "none", color: OD, cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
              </div>

              <div style={{ height: 1, background: R, boxShadow: `0 0 8px rgba(193,18,31,0.6)` }} />

              {/* Stat tiles */}
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {tile("Total TVL", fmtAmt(pool.tvlUSD))}
                {tile(
                  "Weekly Flow",
                  <span style={{ color: Math.abs(pool.weeklyNetFlowUSD) < 1000 ? O : flowPos ? G : R }}>
                    {Math.abs(pool.weeklyNetFlowUSD) < 1000 ? "►" : flowPos ? "▲" : "▼"} {fmtAmt(Math.abs(pool.weeklyNetFlowUSD))}
                  </span>,
                  <span style={{ color: Math.abs(pool.weeklyNetFlowUSD) < 1000 ? O : flowPos ? G : R }}>
                    {flowPos ? "+" : "−"}{((Math.abs(pool.weeklyNetFlowUSD) / (pool.tvlUSD || 1)) * 100).toFixed(2)}% of TVL
                  </span>
                )}
                {tile("Depositors", pool.depositors.toLocaleString(), "Unique Addresses")}
                {pool.holdTime && tile("Median Hold", `${pool.holdTime.medianDays}d`, `Mean ${pool.holdTime.meanDays}d`)}
                {pool.lastBig100kDay
                  ? tile("Last 100K+ Day",
                      <span style={{ color: pool.lastBig100kDay.changeUSD >= 0 ? G : R }}>
                        {pool.lastBig100kDay.changeUSD >= 0 ? "+" : "−"}{fmtAmt(Math.abs(pool.lastBig100kDay.changeUSD))}
                      </span>,
                      daysAgo(pool.lastBig100kDay.date))
                  : tile("Last 100K+ Day", <span style={{ color: OD }}>—</span>, "none in history")
                }
              </div>

              {/* TVL Chart */}
              {chartData.length > 1 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: O, marginBottom: 8 }}>Total Value Locked — 30d</div>
                  <div className="nge-panel" style={{ border: `1px solid ${OD}`, background: "#000", padding: "12px 4px 4px" }}>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={OD} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 9, fill: OD, fontFamily: "inherit" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tickFormatter={fmtY} tick={{ fontSize: 9, fill: OD, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={52} />
                        <Tooltip contentStyle={{ background: "#0a0000", border: `1px solid ${O}`, fontSize: 10, fontFamily: "inherit" }} labelStyle={{ color: O }} itemStyle={{ color: Y }}
                          formatter={(v: number) => [fmtAmt(v), "TVL"]} labelFormatter={fmt} />
                        <Line type="monotone" dataKey="tvlUSD" stroke={Y} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Net Flows Chart */}
              {chartData.length > 1 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: O, marginBottom: 8 }}>Net Flows — 30d</div>
                  <div className="nge-panel" style={{ border: `1px solid ${OD}`, background: "#000", padding: "12px 4px 4px" }}>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={OD} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 9, fill: OD, fontFamily: "inherit" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tickFormatter={fmtAmt} tick={{ fontSize: 9, fill: OD, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={52} />
                        <Tooltip contentStyle={{ background: "#0a0000", border: `1px solid ${O}`, fontSize: 10, fontFamily: "inherit" }} labelStyle={{ color: O }} itemStyle={{ color: Y }}
                          formatter={(v: number) => [fmtAmt(v), "Net Flow"]} labelFormatter={fmt} />
                        <ReferenceLine y={0} stroke={OD} />
                        <Bar dataKey="netFlowUSD" radius={[2,2,0,0]}>
                          {chartData.map((d, i) => <Cell key={i} fill={d.netFlowUSD >= 0 ? G : R} fillOpacity={0.8} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {chartData.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", fontSize: 11, color: OD, letterSpacing: "0.15em" }}>NO HISTORY DATA — run fetch-stats.js to populate</div>
              )}
            </div>
          </div>
        );
      })()}

      </div>
    );
}
