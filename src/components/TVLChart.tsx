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
import type { DaySnapshot, Granularity, Denom } from "@/lib/mock";
import { getWeeklyTVL } from "@/lib/mock";

export function fmtAxisUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtAxisETH(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function ETHAxisTick(props: { x?: number; y?: number; payload?: { value: number } }) {
  const { x = 0, y = 0, payload } = props;
  if (!payload) return null;
  const n = payload.value;
  const num = fmtAxisETH(n);
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="var(--text-secondary)" fontFamily="inherit" fontSize={10}>
      <tspan fontSize={7.5} dy={1}>Ξ</tspan>
      <tspan dy={-1}>{num}</tspan>
    </text>
  );
}

function ChartTooltip({
  active, payload, label, granularity, denom,
}: {
  active?: boolean;
  payload?: { value: number; payload: DaySnapshot }[];
  label?: string;
  granularity: Granularity;
  denom: Denom;
}) {
  if (!active || !payload?.length) return null;
  const d = label ? parseISO(label) : null;
  const dateLabel = d
    ? granularity === "weekly" ? `w/c ${format(d, "dd MMM yyyy")}` : format(d, "dd MMM yyyy")
    : "";
  const v = payload[0].value;
  const snap = payload[0].payload;
  const secondary = denom === "ETH"
    ? `$${(snap.ethPoolAssetsUSD / 1_000_000).toFixed(2)}M`
    : null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "8px 12px", fontFamily: "inherit", fontSize: 12 }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{dateLabel}</div>
      <div style={{ color: "var(--accent)", letterSpacing: "0.05em" }}>
        {denom === "ETH"
          ? <><span style={{ fontSize: "0.75em" }}>Ξ</span>{v.toFixed(2)}</>
          : fmtAxisUSD(v)
        }
      </div>
      {secondary && <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>{secondary}</div>}
    </div>
  );
}

interface TVLChartProps {
  data: DaySnapshot[];
  granularity: Granularity;
  denom: Denom;
}

export function TVLChart({ data, granularity, denom }: TVLChartProps) {
  const visible = data.slice(1);
  const chartData = granularity === "weekly" ? getWeeklyTVL(visible) : visible;

  const dataKey = denom === "ETH" ? "ethPoolAssetsETH"
    : denom === "USD" ? "usdPoolAssetsUSD"
    : "totalAssetsUSD";
  const tickFmtr = denom === "ETH" ? fmtAxisETH : fmtAxisUSD;

  return (
    <section style={{ marginTop: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          01
        </span>
        <h2
          style={{
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Total Value Locked
        </h2>
        <span
          style={{ fontSize: 12, color: "var(--text-dim)", letterSpacing: "0.1em" }}
        >
          — {granularity} · {denom.toLowerCase()}
        </span>
      </div>

      <div
        style={{ border: "1px solid var(--border)", padding: "20px 0 16px 0" }}
      >
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart
            data={chartData}
            margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c8ff00" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#c8ff00" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="1 3"
              stroke="var(--border)"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tick={{
                fill: "var(--text-secondary)",
                fontSize: 12,
                fontFamily: "inherit",
              }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                v ? format(parseISO(v), "dd MMM") : ""
              }
              interval="preserveStartEnd"
              minTickGap={48}
              padding={{ left: 0, right: 0 }}
            />

            <YAxis
              tick={denom === "ETH"
                ? <ETHAxisTick />
                : { fill: "var(--text-secondary)", fontSize: 12, fontFamily: "inherit" }
              }
              tickLine={false}
              axisLine={false}
              tickFormatter={denom === "ETH" ? undefined : tickFmtr}
              width={72}
              tickMargin={8}
              domain={["auto", "auto"]}
            />

            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              content={<ChartTooltip granularity={granularity} denom={denom} />}
            />

            <Bar dataKey={dataKey} fill="transparent" stroke="none" isAnimationActive={false} />

            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="#c8ff00"
              strokeWidth={1.5}
              fill="url(#tvlGrad)"
              dot={false}
              activeDot={{ r: 3, fill: "#c8ff00", strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
