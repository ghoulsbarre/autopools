"use client";

import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DaySnapshot, Granularity } from "@/lib/mock";
import { getWeeklyTVL } from "@/lib/mock";
import { fmtAxisUSD } from "@/components/TVLChart";

interface DomPoint {
  date: string;
  totalUSD: number;
  stablesPct: number;
  topPct: number;
  ethPct: number;
  stablesUSD: number;
  ethUSD: number;
}

function toDomPoints(snapshots: DaySnapshot[]): DomPoint[] {
  return snapshots.map((s) => {
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
}

function ChartTooltip({
  active, payload, label, granularity,
}: {
  active?: boolean;
  payload?: { value: number; payload: DomPoint }[];
  label?: string;
  granularity: Granularity;
}) {
  if (!active || !payload?.length || !label) return null;
  const d = parseISO(label);
  const dateLabel = granularity === "weekly"
    ? `w/c ${format(d, "dd MMM yyyy")}`
    : format(d, "dd MMM yyyy");

  const pt = payload[0].payload;
  const stPct  = pt.stablesPct.toFixed(1);
  const ethPct = pt.ethPct.toFixed(1);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "8px 12px", fontFamily: "inherit", fontSize: 12, minWidth: 160 }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: 6 }}>{dateLabel}</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 2 }}>
        <span style={{ color: "#3DAEAA" }}>Stables</span>
        <span style={{ color: "var(--text-primary)" }}>
          {stPct}% <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>({fmtAxisUSD(pt.stablesUSD)})</span>
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
        <span style={{ color: "#2E70AA" }}>ETH</span>
        <span style={{ color: "var(--text-primary)" }}>
          {ethPct}% <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>({fmtAxisUSD(pt.ethUSD)})</span>
        </span>
      </div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4, color: "var(--text-secondary)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
        <span>Total</span>
        <span>{fmtAxisUSD(pt.totalUSD)}</span>
      </div>
    </div>
  );
}

interface DominanceChartProps {
  data: DaySnapshot[];
  granularity: Granularity;
}

export function DominanceChart({ data, granularity }: DominanceChartProps) {
  const visible = data.slice(1);
  const raw     = granularity === "weekly" ? getWeeklyTVL(visible) : visible;
  const chartData = toDomPoints(raw);

  return (
    <section style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            03
          </span>
          <h2 style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 400, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-primary)", margin: 0 }}>
            Dominance
          </h2>
          <span style={{ fontSize: 12, color: "var(--text-dim)", letterSpacing: "0.1em" }}>
            — {granularity} · % of tvl
          </span>
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, fontSize: 12, letterSpacing: "0.1em" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
            <span style={{ width: 8, height: 8, background: "#3DAEAA", opacity: 0.7, display: "inline-block" }} />
            Stables
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
            <span style={{ width: 8, height: 8, background: "#2E70AA", opacity: 0.7, display: "inline-block" }} />
            ETH
          </span>
        </div>
      </div>

      <div style={{ border: "1px solid var(--border)", padding: "20px 0 16px 0" }}>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="stablesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3DAEAA" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3DAEAA" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="ethGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2E70AA" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2E70AA" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="var(--border-subtle)"
            strokeDasharray="2 4"
          />

          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 12, fontFamily: "inherit" }}
            tickFormatter={(v) => v ? format(parseISO(v), "dd MMM") : ""}
            interval="preserveStartEnd"
            minTickGap={48}
            padding={{ left: 0, right: 0 }}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 12, fontFamily: "inherit" }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            width={72}
            tickMargin={8}
          />

          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={<ChartTooltip granularity={granularity} />}
          />

          {/* Invisible bar forces scaleBand — keeps x-axis aligned with other charts */}
          <Bar dataKey="topPct" fill="transparent" stroke="none" isAnimationActive={false} />
          {/* ETH fills 0→100 as background; Stables fills 0→stablesPct on top */}
          <Area
            type="monotone"
            dataKey="topPct"
            stroke="#2E70AA"
            strokeWidth={1.5}
            fill="url(#ethGrad)"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="stablesPct"
            stroke="#3DAEAA"
            strokeWidth={1.5}
            fill="url(#stablesGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "#3DAEAA", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </section>
  );
}
