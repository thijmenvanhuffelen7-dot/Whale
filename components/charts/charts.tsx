"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact, formatPrice, formatUsd } from "@/lib/format";

const AXIS = { stroke: "#6b7f92", fontSize: 11, fontFamily: "var(--font-geist-mono)", tickLine: false, axisLine: false } as const;
const GRID = { stroke: "#1a2633", vertical: false } as const;

function TooltipBox({ active, payload, label, fmt }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string | number; fmt: (l: string | number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line-strong bg-surface-2 px-3 py-2 text-[12px] shadow-[var(--shadow-overlay)]">
      <p className="num mb-1 text-ink-3">{fmt(label ?? "")}</p>
      {payload.map((p) => (
        <p key={p.name} className="num flex items-center gap-2 text-ink">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {formatUsd(p.value)}
        </p>
      ))}
    </div>
  );
}

const day = (d: string | number) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

/** Twee-kleurige staven: instroom (groen) vs uitstroom (rood). */
export function FlowChart({
  data,
  inKey,
  outKey,
  inLabel,
  outLabel,
}: {
  data: Record<string, string | number>[];
  inKey: string;
  outKey: string;
  inLabel: string;
  outLabel: string;
}) {
  return (
    <div className="h-56 w-full" role="img" aria-label={`${inLabel} en ${outLabel} per dag`}>
      <ResponsiveContainer>
        <BarChart data={data} barGap={2} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="day" tickFormatter={day} {...AXIS} minTickGap={24} />
          <YAxis tickFormatter={(v) => "$" + compact(v)} {...AXIS} width={52} />
          <Tooltip cursor={{ fill: "#111a24" }} content={<TooltipBox fmt={day} />} />
          <Bar dataKey={inKey} name={inLabel} fill="#4ade9b" radius={[2, 2, 0, 0]} maxBarSize={14} />
          <Bar dataKey={outKey} name={outLabel} fill="#ff6b6b" radius={[2, 2, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceChart({ data }: { data: { t: number; c: number }[] }) {
  const up = data.length > 1 && data[data.length - 1].c >= data[0].c;
  const color = up ? "#4ade9b" : "#ff6b6b";
  const hour = (t: string | number) =>
    new Date(t).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="h-64 w-full" role="img" aria-label="Prijs per uur, laatste 7 dagen">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="t" tickFormatter={day} {...AXIS} minTickGap={40} />
          <YAxis dataKey="c" tickFormatter={(v) => formatPrice(v)} {...AXIS} width={72} domain={["auto", "auto"]} />
          <Tooltip
            cursor={{ stroke: "#263646" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-line-strong bg-surface-2 px-3 py-2 text-[12px]">
                  <p className="num text-ink-3">{hour(label ?? 0)}</p>
                  <p className="num text-ink">{formatPrice(Number(payload[0].value))}</p>
                </div>
              ) : null
            }
          />
          <Area type="monotone" dataKey="c" stroke={color} strokeWidth={1.5} fill="url(#pc)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Aantallen per dag (geen dollars). */
export function CountChart({ data, label }: { data: { day: string; v: number }[]; label: string }) {
  return (
    <div className="h-48 w-full" role="img" aria-label={`${label} per dag`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="day" tickFormatter={day} {...AXIS} minTickGap={24} />
          <YAxis allowDecimals={false} {...AXIS} width={36} />
          <Tooltip
            cursor={{ fill: "#111a24" }}
            content={({ active, payload, label: l }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-line-strong bg-surface-2 px-3 py-2 text-[12px]">
                  <p className="num text-ink-3">{day(l ?? "")}</p>
                  <p className="num text-ink">{payload[0].value} {label.toLowerCase()}</p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="v" fill="#ffb547" radius={[2, 2, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
