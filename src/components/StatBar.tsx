"use client";

interface Stat {
  label: string;
  value: string;
  /** Overrides the value text color directly */
  valueColor?: string;
  /** Small dim line shown below the value (e.g. date/time) */
  subLabel?: string;
  delta?: number;
  positive?: boolean;
}

export function StatBar({ stats }: { stats: Stat[] }) {
  return (
    <div
      style={{
        borderBottom: "1px solid var(--border)",
        display: "flex",
        overflowX: "auto",
      }}
    >
      {stats.map((s, i) => {
        const hasDelta = s.delta !== undefined;
        const isUp = hasDelta ? s.delta! >= 0 : (s.positive ?? true);
        const deltaColor = isUp ? "var(--green)" : "var(--red)";

        return (
          <div
            key={s.label}
            style={{
              padding: "16px 28px",
              borderRight: i < stats.length - 1 ? "1px solid var(--border)" : "none",
              minWidth: 140,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 400,
                color: s.valueColor ?? "var(--text-primary)",
                letterSpacing: "0.04em",
              }}
            >
              {s.value}
            </div>
            {s.subLabel && (
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 5, letterSpacing: "0.08em" }}>
                {s.subLabel}
              </div>
            )}
            {hasDelta ? (
              <div style={{ fontSize: 12, color: deltaColor, marginTop: 4 }}>
                {s.delta! >= 0 ? "▲" : "▼"} {Math.abs(s.delta!).toFixed(2)}%
              </div>
            ) : s.positive !== undefined && !s.subLabel ? (
              <div style={{ fontSize: 12, color: deltaColor, marginTop: 4 }}>
                {s.positive ? "▲ inflow" : "▼ outflow"}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
