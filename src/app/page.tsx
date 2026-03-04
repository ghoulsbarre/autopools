"use client";

import { useState } from "react";
import {
  MOCK_HISTORY, MOCK_VAULT, MOCK_POOLS, getRangeConfig,
  MOCK_LAST_BIG_DEPOSIT, MOCK_LAST_BIG_WITHDRAWAL, MOCK_LAST_BIG_TVL_DAY,
  MOCK_DEPOSITOR_STATS_INCEPTION, MOCK_DEPOSITOR_STATS_CURRENT,
  MOCK_TOP10_PCT, MOCK_GINI, MOCK_HOLD_TIME, MOCK_CHURN, MOCK_REDEPOSIT_RATE,
  MOCK_MEDIAN_DEPOSIT_COUNT, MOCK_COHORT_CONVICTION, MOCK_WALLET_BALANCES,
  MOCK_DEPOSIT_DISTRIBUTION, MOCK_RETENTION_COHORTS, MOCK_CHURN_WATERFALL,
  MOCK_RETENTION_BY_TIER, RETENTION_TIER_LABELS,
} from "@/lib/mock";
import type { TimeRange, Denom } from "@/lib/mock";
import { TVLChart } from "@/components/TVLChart";
import { NetFlowsChart } from "@/components/NetFlowsChart";
import { DominanceChart } from "@/components/DominanceChart";
import { StatBar } from "@/components/StatBar";
import { PoolList } from "@/components/PoolList";
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

const TABS = ["Protocol Intel", "Pool Intel", "Statistics"] as const;
type TabLabel = (typeof TABS)[number];

const TIME_RANGES: TimeRange[] = ["1W", "1M", "YTD", "1Y"];
const DENOMS: Denom[] = ["Total", "USD", "ETH"];

function fmtUSD(n: number, decimals = 2): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(decimals)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(decimals)}K`;
  return `${sign}$${abs.toFixed(decimals)}`;
}

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function fmtEventDatetime(iso: string): string {
  const d = new Date(iso);
  const mon = MONTHS[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh  = String(d.getUTCHours()).padStart(2, "0");
  const mm  = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mon} ${day} · ${hh}:${mm} UTC`;
}

function fmtEventDate(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${MONTHS[parseInt(m) - 1]} ${d}`;
}


function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          width: 13, height: 13, borderRadius: "50%",
          border: "1px solid var(--text-dim)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "var(--text-dim)", cursor: "default",
          letterSpacing: 0, flexShrink: 0, userSelect: "none",
        }}
      >
        i
      </div>
      {visible && (
        <div style={{
          position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)",
          zIndex: 20, background: "var(--surface)", border: "1px solid var(--border)",
          padding: "10px 14px", width: 280, fontSize: 12,
          letterSpacing: "0.06em", color: "var(--text-secondary)", lineHeight: 1.7,
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

function DepositSizeTile({ subtitle, median, mean }: { subtitle: string; median: number; mean: number }) {
  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 28px", minWidth: 240 }}>
      <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
        Deposit Size
      </div>
      <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
        {subtitle}
      </div>
      <div style={{ display: "flex", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>Median</span>
          <div style={{ fontSize: 28, letterSpacing: "0.04em", color: "var(--text-primary)", lineHeight: 1 }}>{fmtUSD(median, 1)}</div>
        </div>
        <div style={{ width: 1, background: "var(--border-subtle)", alignSelf: "stretch" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>Mean</span>
          <div style={{ fontSize: 28, letterSpacing: "0.04em", color: "var(--text-primary)", lineHeight: 1 }}>{fmtUSD(mean, 1)}</div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = useState<TabLabel>("Protocol Intel");
  const [range, setRange] = useState<TimeRange>("1M");
  const [denom, setDenom] = useState<Denom>("Total");

  const { snapshots, granularity } = getRangeConfig(range);

  // ── Stat bar — static, always total / latest ─────────────────────────────
  const week7 = MOCK_HISTORY.slice(-8);
  const weekDep = week7[week7.length - 1].assetsDepositedTotalUSD - week7[0].assetsDepositedTotalUSD;
  const weekWit = week7[week7.length - 1].assetsWithdrawnTotalUSD - week7[0].assetsWithdrawnTotalUSD;
  const weekNet = weekDep - weekWit;
  const weeklyFlowLabel    = fmtUSD(weekNet);
  const weeklyFlowPositive = weekNet >= 0;

  // Notable events
  const bigTVLPositive = MOCK_LAST_BIG_TVL_DAY.changeUSD >= 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.25em", color: "var(--text-secondary)", marginRight: 16 }}>
            //
          </span>
          <h1
            style={{
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 400,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Autopools Intel
          </h1>
        </div>
        {/* In production, replace this static value with the timestamp of the most recent data fetch */}
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>
          Updated Mar 03 2026 00:00 UTC
        </div>
      </header>

      {/* ── Stat bar ────────────────────────────────────────────────── */}
      <StatBar
        stats={[
          { label: "TVL",         value: fmtUSD(MOCK_VAULT.totalAssetsUSD) },
          { label: "Weekly Flow", value: weeklyFlowLabel, positive: weeklyFlowPositive },
          { label: "Depositors",  value: MOCK_VAULT.totalSuppliers.toLocaleString() },
          {
            label: "Last 50K+ Entry",
            value: fmtUSD(MOCK_LAST_BIG_DEPOSIT.amountUSD),
            valueColor: "var(--green)",
            subLabel: fmtEventDatetime(MOCK_LAST_BIG_DEPOSIT.datetime),
          },
          {
            label: "Last 50K+ Exit",
            value: fmtUSD(MOCK_LAST_BIG_WITHDRAWAL.amountUSD),
            valueColor: "var(--red)",
            subLabel: fmtEventDatetime(MOCK_LAST_BIG_WITHDRAWAL.datetime),
          },
          {
            label: "Last 100K+ Day",
            value: fmtUSD(MOCK_LAST_BIG_TVL_DAY.changeUSD),
            valueColor: bigTVLPositive ? "var(--green)" : "var(--red)",
            subLabel: fmtEventDate(MOCK_LAST_BIG_TVL_DAY.date),
          },
        ]}
      />

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: "1px solid var(--border)", padding: "0 32px", display: "flex" }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: "inherit",
                fontSize: 12,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "14px 20px 13px",
                background: "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                border: "none",
                borderBottom: active ? "1px solid var(--accent)" : "1px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                transition: "color 0.1s",
              }}
            >
              {t}
            </button>
          );
        })}
      </nav>

      {/* ── Tab content ─────────────────────────────────────────────── */}
      <main style={{ padding: "0 32px 48px" }}>
        {tab === "Protocol Intel" && (
          <>
            {/* Controls */}
            <div style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "var(--bg)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 0",
              marginLeft: -32,
              marginRight: -32,
              paddingLeft: 32,
              paddingRight: 32,
            }}>

              {/* Time range */}
              <div style={{ display: "flex", gap: 4 }}>
                {TIME_RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    style={{
                      fontFamily: "inherit",
                      fontSize: 12,
                      letterSpacing: "0.1em",
                      padding: "4px 14px",
                      background: range === r ? "var(--accent)" : "transparent",
                      color: range === r ? "#0a0a0a" : "var(--text-secondary)",
                      border: "1px solid",
                      borderColor: range === r ? "var(--accent)" : "var(--border)",
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Pool filter */}
              <div style={{ display: "flex", gap: 4 }}>
                {DENOMS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDenom(d)}
                    style={{
                      fontFamily: "inherit",
                      fontSize: 12,
                      letterSpacing: "0.1em",
                      padding: "4px 14px",
                      background: denom === d ? "var(--text-secondary)" : "transparent",
                      color: denom === d ? "#0a0a0a" : "var(--text-secondary)",
                      border: "1px solid",
                      borderColor: denom === d ? "var(--text-secondary)" : "var(--border)",
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <TVLChart data={snapshots} granularity={granularity} denom={denom} />
            <NetFlowsChart data={snapshots} granularity={granularity} denom={denom} />
            <DominanceChart data={snapshots} granularity={granularity} />
          </>
        )}

        {tab === "Pool Intel" && (
          <PoolList pools={MOCK_POOLS} />
        )}

        {tab === "Statistics" && (
          <div style={{ paddingTop: 40 }}>

            {/* ── Depositor Behavior ───────────────────────────────────── */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-secondary)" }}>01</span>
                <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-primary)" }}>Depositor Behavior</span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>

                {/* Tile: Median hold time */}
                <div style={{ border: "1px solid var(--border)", padding: "20px 28px", minWidth: 200 }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
                    Median Hold Time
                  </div>
                  <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                    first deposit → first full exit
                  </div>
                  <div style={{ display: "flex", gap: 40 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>Median</span>
                      <div style={{ fontSize: 28, letterSpacing: "0.04em", color: "var(--text-primary)", lineHeight: 1 }}>
                        {MOCK_HOLD_TIME.medianDays}
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 4 }}>days</span>
                      </div>
                    </div>
                    <div style={{ width: 1, background: "var(--border-subtle)", alignSelf: "stretch" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>Mean</span>
                      <div style={{ fontSize: 28, letterSpacing: "0.04em", color: "var(--text-primary)", lineHeight: 1 }}>
                        {MOCK_HOLD_TIME.meanDays}
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 4 }}>days</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tile: Churn rate */}
                <div style={{ border: "1px solid var(--border)", padding: "20px 28px" }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
                    Churn Rate
                  </div>
                  <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                    wallets fully exited within N days of deposit
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    {([
                      { label: "30d", value: MOCK_CHURN.d30 },
                      { label: "60d", value: MOCK_CHURN.d60 },
                      { label: "90d", value: MOCK_CHURN.d90 },
                    ] as const).map(({ label, value }) => {
                      const color = value < 30 ? "var(--green)" : value < 50 ? "var(--amber)" : "var(--red)";
                      return (
                        <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>{label}</span>
                          <div style={{ fontSize: 28, letterSpacing: "0.04em", color, lineHeight: 1 }}>
                            {value}<span style={{ fontSize: 12, marginLeft: 2, color }}>%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tile: Re-deposit rate */}
                <div style={{ border: "1px solid var(--border)", padding: "20px 28px", minWidth: 200 }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
                    Re-deposit Rate
                  </div>
                  <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                    of wallets that withdrew and came back
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>rate</span>
                    <div style={{ fontSize: 28, letterSpacing: "0.04em", color: "var(--green)", lineHeight: 1 }}>
                      {MOCK_REDEPOSIT_RATE}<span style={{ fontSize: 12, marginLeft: 2, color: "var(--green)" }}>%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Cohort retention heatmap + churn waterfall */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginTop: 24, alignItems: "stretch" }}>

              {/* — Heatmap — */}
              {(() => {
                const cols: { key: keyof typeof MOCK_RETENTION_COHORTS[0]; label: string }[] = [
                  { key: "d30",  label: "30d"  },
                  { key: "d60",  label: "60d"  },
                  { key: "d90",  label: "90d"  },
                  { key: "d180", label: "180d" },
                ];
                const cellColor = (v: number | null): string => {
                  if (v === null) return "var(--text-dim)";
                  if (v >= 65) return "var(--green)";
                  if (v >= 48) return "var(--amber)";
                  return "var(--red)";
                };
                const cellBg = (v: number | null): string => {
                  if (v === null) return "transparent";
                  if (v >= 65) return "rgba(74,222,128,0.07)";
                  if (v >= 48) return "rgba(251,191,36,0.07)";
                  return "rgba(248,113,113,0.07)";
                };
                return (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                        Cohort Retention
                      </div>
                      <InfoTooltip text="Each row is a group of wallets that made their first deposit in that month. Each column shows what percentage of that group was still holding at 30, 60, 90, or 180 days after joining. Null cells mean the time window has not yet elapsed." />
                    </div>
                    <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                      % of cohort still holding at N days after first deposit
                    </div>
                    {/* Header row */}
                    <div style={{ display: "grid", gridTemplateColumns: "56px repeat(4, 72px)", marginBottom: 4 }}>
                      <div />
                      {cols.map(c => (
                        <div key={c.key} style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", textAlign: "center" }}>
                          {c.label}
                        </div>
                      ))}
                    </div>
                    {/* Data rows */}
                    {MOCK_RETENTION_COHORTS.map((row) => (
                      <div key={row.label} style={{ display: "grid", gridTemplateColumns: "56px repeat(4, 72px)", marginBottom: 2 }}>
                        <div style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--text-dim)", display: "flex", alignItems: "center" }}>
                          {row.label}
                        </div>
                        {cols.map(c => {
                          const v = row[c.key] as number | null;
                          return (
                            <div key={c.key} style={{
                              background: cellBg(v),
                              display: "flex", alignItems: "center", justifyContent: "center",
                              height: 28, marginLeft: 2,
                              fontSize: v === null ? 10 : 11,
                              letterSpacing: "0.04em",
                              color: cellColor(v),
                            }}>
                              {v === null ? "—" : `${v}%`}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {/* Legend */}
                    <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                      {[["var(--green)", "rgba(74,222,128,0.07)", "≥65%"], ["var(--amber)", "rgba(251,191,36,0.07)", "48–64%"], ["var(--red)", "rgba(248,113,113,0.07)", "<48%"]].map(([color, bg, label]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 12, height: 12, background: bg, border: `1px solid ${color}`, opacity: 0.8 }} />
                          <span style={{ fontSize: 12, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* — Churn waterfall — */}
              <div style={{ flex: 1, minWidth: 340, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    Churn Waterfall
                  </div>
                  <InfoTooltip text="Inflows show TVL deposited by wallets making their first ever deposit in that month. Outflows show TVL subsequently withdrawn by those same wallets upon full exit. Both bars always refer to the same cohort — this is not a measure of total protocol flows." />
                </div>
                <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                  monthly depositor tvl in vs out
                </div>
                <div style={{ flex: 1, minHeight: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_CHURN_WATERFALL} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="22%">
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "var(--text-dim)", fontFamily: "inherit", letterSpacing: "0.06em" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      tickFormatter={(v) => `$${Math.abs(v) >= 1_000_000 ? `${(Math.abs(v) / 1_000_000).toFixed(0)}M` : `${(Math.abs(v) / 1_000).toFixed(0)}K`}`}
                      tick={{ fontSize: 12, fill: "var(--text-dim)", fontFamily: "inherit", letterSpacing: "0.06em" }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
                    <Tooltip
                      cursor={{ fill: "var(--border)", opacity: 0.2 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { label: string; inflow: number; outflow: number };
                        const net = d.inflow + d.outflow;
                        const fmtM = (v: number) => `$${(Math.abs(v) / 1_000_000).toFixed(2)}M`;
                        return (
                          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "8px 12px", fontSize: 12, fontFamily: "inherit", letterSpacing: "0.06em" }}>
                            <div style={{ color: "var(--text-dim)", marginBottom: 6 }}>{d.label}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                                <span style={{ color: "var(--text-dim)" }}>in</span>
                                <span style={{ color: "var(--green)" }}>{fmtM(d.inflow)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                                <span style={{ color: "var(--text-dim)" }}>out</span>
                                <span style={{ color: "var(--red)" }}>−{fmtM(d.outflow)}</span>
                              </div>
                              <div style={{ borderTop: "1px solid var(--border)", marginTop: 3, paddingTop: 3, display: "flex", justifyContent: "space-between", gap: 20 }}>
                                <span style={{ color: "var(--text-dim)" }}>net</span>
                                <span style={{ color: net >= 0 ? "var(--green)" : "var(--red)" }}>{net >= 0 ? "+" : "−"}{fmtM(net)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="inflow"  fill="var(--green)" opacity={0.7} isAnimationActive={false} />
                    <Bar dataKey="outflow" fill="var(--red)"   opacity={0.7} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                </div>{/* flex: 1 chart wrapper */}
              </div>

              </div>{/* end flex row */}

              {/* Retention curve by deposit tier */}
              <div style={{ marginTop: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    Retention by Deposit Tier
                  </div>
                  <InfoTooltip text="Survival curves showing what % of wallets in each deposit-size tier are still holding at N days after their first deposit. If larger depositors stay longer, the curves for higher tiers will sit above the lower tier curves and decay more slowly." />
                </div>
                <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                  % of wallets still holding · days since first deposit
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={MOCK_RETENTION_BY_TIER} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="day"
                      type="number"
                      domain={[0, 365]}
                      ticks={[0, 30, 60, 90, 120, 180, 240, 300, 365]}
                      tickFormatter={(v) => v === 0 ? "0" : `${v}d`}
                      tick={{ fontSize: 12, fill: "var(--text-dim)", fontFamily: "inherit", letterSpacing: "0.06em" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 12, fill: "var(--text-dim)", fontFamily: "inherit", letterSpacing: "0.06em" }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "8px 12px", fontSize: 12, fontFamily: "inherit", letterSpacing: "0.06em" }}>
                            <div style={{ color: "var(--text-dim)", marginBottom: 6 }}>Day {label}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {[...payload].reverse().map((p) => (
                                <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                                  <span style={{ color: p.color }}>{RETENTION_TIER_LABELS[p.dataKey as string]}</span>
                                  <span style={{ color: p.color }}>{Number(p.value).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    {(["t1","t2","t3","t4","t5","t6","t7"] as const).map((key, i) => {
                      const colors = ["#e05252","#e07c52","#daa320","#a3be8c","#4dbb6e","#52b0d6","#a78bfa"];
                      return (
                        <Line
                          key={key}
                          dataKey={key}
                          stroke={colors[i]}
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
                  {(["t1","t2","t3","t4","t5","t6","t7"] as const).map((key, i) => {
                    const colors = ["#e05252","#e07c52","#daa320","#a3be8c","#4dbb6e","#52b0d6","#a78bfa"];
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 16, height: 2, background: colors[i] }} />
                        <span style={{ fontSize: 12, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {RETENTION_TIER_LABELS[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* ── Deposit Patterns ─────────────────────────────────────── */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-secondary)" }}>02</span>
                <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-primary)" }}>Deposit Patterns</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>

                <DepositSizeTile
                  subtitle="since inception"
                  median={MOCK_DEPOSITOR_STATS_INCEPTION.medianDepositUSD}
                  mean={MOCK_DEPOSITOR_STATS_INCEPTION.meanDepositUSD}
                />
                <DepositSizeTile
                  subtitle="current depositors"
                  median={MOCK_DEPOSITOR_STATS_CURRENT.medianDepositUSD}
                  mean={MOCK_DEPOSITOR_STATS_CURRENT.meanDepositUSD}
                />

                {/* Tile: Median deposit count per wallet */}
                <div style={{ border: "1px solid var(--border)", padding: "20px 28px", minWidth: 200 }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
                    Median Deposit Count
                  </div>
                  <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                    discrete deposit txns per wallet
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>median</span>
                    <div style={{ fontSize: 28, letterSpacing: "0.04em", color: "var(--text-primary)", lineHeight: 1 }}>
                      {MOCK_MEDIAN_DEPOSIT_COUNT.toFixed(1)}
                      <span style={{ fontSize: 12, marginLeft: 4, color: "var(--text-secondary)" }}>txns</span>
                    </div>
                  </div>
                </div>

                {/* Tile: Cohort conviction */}
                <div style={{ border: "1px solid var(--border)", padding: "20px 28px", minWidth: 400 }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
                    Position Size Change by Cohort
                  </div>
                  <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                    median change since first deposit
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    {MOCK_COHORT_CONVICTION.map((c) => {
                      const pos = c.changePct >= 0;
                      const color = pos ? "var(--green)" : "var(--red)";
                      return (
                        <div key={c.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>{c.label}</span>
                          <div style={{ fontSize: 28, letterSpacing: "0.04em", color, lineHeight: 1 }}>
                            {pos ? "+" : ""}{c.changePct}<span style={{ fontSize: 12, marginLeft: 2, color }}>%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Deposit size distribution histogram */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    Deposit Size Distribution
                  </div>
                  <InfoTooltip text="Current holders bucketed by live position size (shares × NAV per share in USD). Log scale on the Y axis prevents large buckets from dwarfing small ones. A bimodal shape — two peaks with a gap — indicates a retail cluster and a whale cluster with distinct behaviour." />
                </div>
                <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                  current holders by position size — log scale
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={MOCK_DEPOSIT_DISTRIBUTION} margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap="28%">
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "var(--text-dim)", fontFamily: "inherit", letterSpacing: "0.06em" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      scale="log"
                      domain={[1, "auto"]}
                      tickFormatter={(v) => v >= 1000 ? `${v / 1000}K` : `${v}`}
                      tick={{ fontSize: 12, fill: "var(--text-dim)", fontFamily: "inherit", letterSpacing: "0.06em" }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      allowDataOverflow
                    />
                    <Tooltip
                      cursor={{ fill: "var(--border)", opacity: 0.3 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { label: string; count: number };
                        return (
                          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "8px 12px", fontSize: 12, fontFamily: "inherit", letterSpacing: "0.06em" }}>
                            <div style={{ color: "var(--text-dim)", marginBottom: 4 }}>{d.label}</div>
                            <div style={{ color: "var(--text-primary)" }}>{d.count.toLocaleString()} wallets</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" isAnimationActive={false}>
                      {MOCK_DEPOSIT_DISTRIBUTION.map((entry, i) => {
                        const peak = entry.count === Math.max(...MOCK_DEPOSIT_DISTRIBUTION.map(d => d.count));
                        return <Cell key={i} fill={peak ? "var(--accent)" : "var(--border)"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>

            {/* ── Concentration Risk ───────────────────────────────────── */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-secondary)" }}>03</span>
                <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-primary)" }}>Concentration Risk</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>

                {/* Top 10 wallet concentration */}
                <div style={{ border: "1px solid var(--border)", padding: "20px 28px", minWidth: 180 }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
                    Top 10 Wallets % of TVL
                  </div>
                  <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                    combined share of total deposits
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>concentration</span>
                    <div style={{ fontSize: 28, letterSpacing: "0.04em", color: "var(--text-primary)", lineHeight: 1 }}>
                      {MOCK_TOP10_PCT.toFixed(1)}<span style={{ fontSize: 12, marginLeft: 2, color: "var(--text-secondary)" }}>%</span>
                    </div>
                  </div>
                  <div style={{ position: "relative", height: 3, background: "var(--border)" }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, height: "100%",
                      width: `${MOCK_TOP10_PCT}%`, background: "var(--accent)",
                    }} />
                  </div>
                </div>

              </div>

              {/* Lorenz curve */}
              {(() => {
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
                    points.push({
                      x,
                      curve: Math.round((cumSum / total) * 1000) / 10,
                      equality: x,
                    });
                  }
                }
                return (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
                      Gini Coefficient
                    </div>
                    <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                      cumulative share of wallets vs cumulative share of tvl
                    </div>
                    <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", top: 8, left: 44, zIndex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 3 }}>Gini</div>
                      <div style={{ fontSize: 22, letterSpacing: "0.04em", lineHeight: 1, color: MOCK_GINI < 0.5 ? "var(--green)" : MOCK_GINI < 0.75 ? "var(--amber)" : "var(--red)" }}>{MOCK_GINI.toFixed(2)}</div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={points} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="x"
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 12, fill: "var(--text-dim)", fontFamily: "inherit", letterSpacing: "0.06em" }}
                          tickLine={false}
                          axisLine={{ stroke: "var(--border)" }}
                          ticks={[0, 25, 50, 75, 100]}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 12, fill: "var(--text-dim)", fontFamily: "inherit", letterSpacing: "0.06em" }}
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
                              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "8px 12px", fontSize: 12, fontFamily: "inherit", letterSpacing: "0.06em" }}>
                                <div style={{ color: "var(--text-dim)", marginBottom: 8 }}>
                                  bottom {equal.toFixed(1)}% of wallets
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                                    <span style={{ color: "var(--text-dim)" }}>equal share</span>
                                    <span style={{ color: "var(--text-dim)" }}>{equal.toFixed(1)}%</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                                    <span style={{ color: "var(--text-dim)" }}>actual</span>
                                    <span style={{ color: "var(--accent)" }}>{actual.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }}
                        />
                        {/* Perfect equality reference */}
                        <Line dataKey="equality" dot={false} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" legendType="none" isAnimationActive={false} />
                        {/* Actual Lorenz curve */}
                        <Line dataKey="curve" dot={false} stroke="var(--accent)" strokeWidth={1.5} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
