const SIZE = 140;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function WinLossDonut({ won, drawn, lost }: { won: number; drawn: number; lost: number }) {
  const total = won + drawn + lost;

  const segments =
    total === 0
      ? [{ value: 1, color: "rgba(255,255,255,0.08)" }]
      : [
          { value: won, color: "var(--live)" },
          { value: drawn, color: "var(--text-faint)" },
          { value: lost, color: "var(--danger)" },
        ].filter((s) => s.value > 0);

  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segments.map((seg, i) => {
            const fraction = seg.value / (total || 1);
            const dash = fraction * CIRCUMFERENCE;
            const circle = (
              <circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap={segments.length > 1 ? "butt" : "round"}
              />
            );
            offset += dash;
            return circle;
          })}
        </g>
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          fontFamily="var(--display)"
          fontSize="1.6rem"
          fontWeight={600}
          fill="var(--text)"
        >
          {total}
        </text>
        <text x="50%" y="63%" textAnchor="middle" fontFamily="var(--sans)" fontSize="0.62rem" fill="var(--text-dim)">
          بازی
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <LegendRow color="var(--live)" label="برد" value={won} />
        <LegendRow color="var(--text-faint)" label="مساوی" value={drawn} />
        <LegendRow color="var(--danger)" label="باخت" value={lost} />
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ color: "var(--text-dim)", flex: 1 }}>{label}</span>
      <span style={{ fontFamily: "var(--display)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
