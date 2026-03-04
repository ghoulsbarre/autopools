"use client";

import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { FlowPoint, DaySnapshot, Granularity, Denom } from "@/lib/mock";
import { getDailyFlows, getWeeklyFlows } from "@/lib/mock";
import { fmtAxisUSD } from "@/components/TVLChart";

function fmtUSD(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtETH(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const num = abs >= 1_000 ? `${sign}${(abs / 1_000).toFixed(1)}K` : `${sign}${abs.toFixed(2)}`;
  return <><span style={{ fontSize: "0.75em" }}>Ξ</span>{num}</>;
}

function fmtAxisETHNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return abs >= 1_000 ? `${sign}${(abs / 1_000).toFixed(1)}K` : `${sign}${abs.toFixed(0)}`;
}

function ETHAxisTick(props: { x?: number; y?: number; payload?: { value: number } }) {
  const { x = 0, y = 0, payload } = props;
  if (!payload) return null;
  const num = fmtAxisETHNum(payload.value);
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="var(--text-secondary)" fontFamily="inherit" fontSize={10}>
      <tspan fontSize={7.5} dy={1}>Ξ</tspan>
      <tspan dy={-1}>{num}</tspan>
    </text>
  );
}

function fmtAxis(n: number, denom: Denom) {
  return denom === "ETH" ? fmtAxisETHNum(n) : fmtAxisUSD(n);
}

function ChartTooltip({
  active, payload, label, granularity, rawFlows, denom,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  granularity: Granularity;
  rawFlows: FlowPoint[];
  denom: Denom;
}) {
  if (!active || !payload?.length || !label) return null;
  const point = rawFlows.find((f) => f.date === label);
  const d = parseISO(label);
  const dateLabel = granularity === "weekly"
    ? `w/c ${format(d, "dd MMM yyyy")}`
    : format(d, "dd MMM yyyy");
  const fmt = (n: number) => denom === "ETH" ? fmtETH(n) : fmtUSD(n);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "8px 12px", fontFamily: "inherit", fontSize: 12, minWidth: 148 }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: 6 }}>{dateLabel}</div>
      {point && (
        <>
          <div style={{ color: "var(--green)", marginBottom: 2 }}>+ {fmt(point.deposits)}</div>
          {denom === "ETH" && point.depositsUSD != null && (
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4 }}>{fmtUSD(point.depositsUSD)}</div>
          )}
          <div style={{ color: "var(--red)", marginBottom: 2 }}>− {fmt(point.withdrawals)}</div>
          {denom === "ETH" && point.withdrawalsUSD != null && (
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4 }}>{fmtUSD(point.withdrawalsUSD)}</div>
          )}
          <div style={{ color: point.net >= 0 ? "var(--green)" : "var(--red)", borderTop: "1px solid var(--border)", paddingTop: 4, marginTop: 4 }}>
            net {fmt(point.net)}
          </div>
          {denom === "ETH" && point.netUSD != null && (
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>{fmtUSD(point.netUSD)}</div>
          )}
        </>
      )}
    </div>
  );
}

interface NetFlowsChartProps {
  data: DaySnapshot[];
  granularity: Granularity;
  denom: Denom;
}

export function NetFlowsChart({ data, granularity, denom }: NetFlowsChartProps) {
  const allFlows = granularity === "weekly"
    ? getWeeklyFlows(data, denom)
    : getDailyFlows(data, denom);
  // Weekly: context snapshot contributes zero flow to its bucket so no slice needed.
  // Daily: slice(1) removes the zero-flow context snapshot.
  const flows = granularity === "weekly" ? allFlows : allFlows.slice(1);

  return (
    <section style={{ marginTop: 40 }}>
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
          02
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
          Net Flows
        </h2>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            letterSpacing: "0.1em",
          }}
        >
          — deposits / withdrawals / net · {granularity} · {denom.toLowerCase()}
        </span>
      </div>

      <div
        style={{ border: "1px solid var(--border)", padding: "20px 0 16px 0" }}
      >
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart
            data={flows}
            margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
          >
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
              tickFormatter={denom === "ETH" ? undefined : (v) => fmtAxis(v, denom)}
              width={72}
              tickMargin={8}
            />

            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              content={
                <ChartTooltip granularity={granularity} rawFlows={flows} denom={denom} />
              }
            />

            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />

            <Bar dataKey="net" maxBarSize={14} radius={[1, 1, 1, 1]}>
              {flows.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.net >= 0 ? "var(--green)" : "var(--red)"}
                  fillOpacity={0.65}
                />
              ))}
            </Bar>

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
