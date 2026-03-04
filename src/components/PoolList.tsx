"use client";

import { useState } from "react";
import type { PoolSummary } from "@/lib/mock";

function fmtUSD(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtETH(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const num = abs >= 1_000 ? `${sign}${(abs / 1_000).toFixed(2)}K` : `${sign}${abs.toFixed(2)}`;
  return <><span style={{ fontSize: "0.75em" }}>Ξ</span>{num}</>;
}

function PoolRow({ pool }: { pool: PoolSummary }) {
  const [open, setOpen] = useState(false);

  const isETH = pool.denom === "ETH";
  const tvlLabel = fmtUSD(pool.tvlUSD);
  const flowLabel = isETH ? fmtETH(pool.weeklyNetFlowNative) : fmtUSD(pool.weeklyNetFlowNative);
  const flowPositive = pool.weeklyNetFlowNative >= 0;
  const flowColor = flowPositive ? "var(--green)" : "var(--red)";
  const denomColor = isETH ? "#2E70AA" : "#3DAEAA";

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>

      {/* ── Summary row ───────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr repeat(3, 140px) 32px",
          alignItems: "center",
          gap: 16,
          padding: "18px 0",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        {/* Pool identity */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.12em", color: "var(--text-primary)" }}>
            {pool.symbol}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
            {pool.name}
          </span>
          <span style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            padding: "1px 6px",
            border: "1px solid",
            borderColor: denomColor,
            color: denomColor,
          }}>
            {pool.denomToken}
          </span>
          <span style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            padding: "1px 6px",
            border: "1px solid var(--border)",
            color: "var(--text-dim)",
          }}>
            {pool.chain}
          </span>
          {pool.paused && (
            <span style={{ fontSize: 12, letterSpacing: "0.1em", padding: "1px 6px", border: "1px solid var(--red)", color: "var(--red)" }}>
              PAUSED
            </span>
          )}
        </div>

        {/* TVL */}
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 3 }}>TVL</div>
          <div style={{ fontSize: 12, color: "var(--text-primary)", letterSpacing: "0.04em" }}>{tvlLabel}</div>
        </div>

        {/* Weekly flow */}
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 3 }}>Weekly Flow</div>
          <div style={{ fontSize: 12, color: flowColor, letterSpacing: "0.04em" }}>
            {flowPositive ? "▲ " : "▼ "}{flowLabel}
          </div>
        </div>

        {/* Depositors */}
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 3 }}>Depositors</div>
          <div style={{ fontSize: 12, color: "var(--text-primary)", letterSpacing: "0.04em" }}>{pool.depositors.toLocaleString()}</div>
        </div>

        {/* Expand chevron */}
        <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "right", userSelect: "none" }}>
          {open ? "▲" : "▼"}
        </div>
      </button>

      {/* ── Expanded detail ───────────────────────────────────────────── */}
      {open && (
        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "24px 0 32px",
          color: "var(--text-dim)",
        }}>
          <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            — detail view coming soon —
          </span>
        </div>
      )}
    </div>
  );
}

export function PoolList({ pools }: { pools: PoolSummary[] }) {
  return (
    <div style={{ marginTop: 32 }}>
      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr repeat(3, 140px) 32px",
        gap: 16,
        paddingBottom: 10,
        borderBottom: "1px solid var(--border)",
        marginBottom: 0,
      }}>
        {["Pool", "TVL", "Weekly Flow", "Depositors", ""].map((h) => (
          <span key={h} style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-dim)" }}>
            {h}
          </span>
        ))}
      </div>

      {pools.map((p) => <PoolRow key={p.id} pool={p} />)}
    </div>
  );
}
