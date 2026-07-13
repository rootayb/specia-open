"use client";

import { useState } from "react";

import { GOAL_TARGET_PERFORMANCE, type GoalAnalysisDataPoint } from "@/lib/educational-analysis";
import { LEARNING_PHASE_META } from "@/lib/learning-phases";

type Props = {
  dataPoints: GoalAnalysisDataPoint[];
  variant?: "line" | "bar";
  target?: number;
};

/* Görünüm sabitleri (viewBox birimleri) */
const W = 640;
const H = 150;
const PAD_LEFT = 30;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;
const IW = W - PAD_LEFT - PAD_RIGHT;
const IH = H - PAD_TOP - PAD_BOTTOM;
const Y_TICKS = [0, 20, 40, 60, 80, 100];

function formatChartDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(date);
}

function formatTooltipDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(date);
}

/**
 * Tüm ilerleme kayıtlarını tek zaman ekseninde, öğrenme aşamasının
 * rengiyle gösterir; aşama geçişleri dikey kesikli ayraçla işaretlenir.
 */
export function PhaseTimelineChart({
  dataPoints,
  variant = "line",
  target = GOAL_TARGET_PERFORMANCE,
}: Props) {
  const [active, setActive] = useState<number | null>(null);

  if (dataPoints.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-[var(--panel-radius-lg)] border border-dashed border-[color:var(--panel-border)] px-4 py-10 text-sm text-[color:var(--panel-text-soft)]">
        Grafik için henüz ilerleme kaydı yok.
      </div>
    );
  }

  const n = dataPoints.length;
  const x = (index: number) => (n === 1 ? PAD_LEFT + IW / 2 : PAD_LEFT + (IW / (n - 1)) * index);
  const y = (value: number) => PAD_TOP + IH - (value / 100) * IH;

  const coords = dataPoints.map((point, index) => ({
    cx: x(index),
    cy: y(point.value),
    point,
    index,
  }));

  const targetY = y(target);
  const barW = Math.min(36, (IW / n) * 0.55);
  const activePoint = active !== null ? coords[active] : null;

  /** Aşama geçiş noktaları: bir önceki kayıttan farklı aşamada olan kayıtlar. */
  const phaseBreaks = coords.filter(
    (c) => c.index > 0 && c.point.phase !== coords[c.index - 1].point.phase,
  );

  /** Lejant yalnızca grafikte görünen aşamaları listeler (kayıt sırasına göre). */
  const seenPhases = dataPoints.reduce<GoalAnalysisDataPoint["phase"][]>((acc, point) => {
    if (!acc.includes(point.phase)) acc.push(point.phase);
    return acc;
  }, []);

  return (
    <div className="grid gap-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label="BEP amaçı aşama bazlı ilerleme grafiği"
          onMouseLeave={() => setActive(null)}
        >
          {/* Yatay ızgara + Y ekseni etiketleri */}
          {Y_TICKS.map((tick) => {
            const gy = y(tick);
            return (
              <g key={tick}>
                <line
                  x1={PAD_LEFT}
                  x2={W - PAD_RIGHT}
                  y1={gy}
                  y2={gy}
                  stroke="var(--panel-text)"
                  strokeOpacity={tick === 0 ? 0.18 : 0.08}
                  strokeWidth="1"
                />
                <text
                  x={PAD_LEFT - 6}
                  y={gy + 3}
                  fontSize="9"
                  textAnchor="end"
                  fill="var(--panel-text)"
                  fillOpacity="0.45"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Hedef çizgisi */}
          <line
            x1={PAD_LEFT}
            x2={W - PAD_RIGHT}
            y1={targetY}
            y2={targetY}
            stroke="var(--panel-text)"
            strokeOpacity="0.4"
            strokeWidth="1.25"
            strokeDasharray="4 4"
          />
          <text
            x={W - PAD_RIGHT}
            y={targetY - 4}
            fontSize="9"
            textAnchor="end"
            fill="var(--panel-text)"
            fillOpacity="0.55"
          >
            Hedef %{target}
          </text>

          {/* Aşama geçiş ayraçları */}
          {phaseBreaks.map((c) => {
            const prev = coords[c.index - 1];
            const breakX = (prev.cx + c.cx) / 2;
            return (
              <line
                key={`break-${c.index}`}
                x1={breakX}
                x2={breakX}
                y1={PAD_TOP}
                y2={PAD_TOP + IH}
                stroke={LEARNING_PHASE_META[c.point.phase].colorVar}
                strokeOpacity="0.5"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
            );
          })}

          {variant === "bar" ? (
            /* Çubuk grafik: her çubuk kaydın aşama renginde */
            coords.map((c) => (
              <rect
                key={c.index}
                x={c.cx - barW / 2}
                y={c.cy}
                width={barW}
                height={PAD_TOP + IH - c.cy}
                rx="3"
                fill={LEARNING_PHASE_META[c.point.phase].colorVar}
                fillOpacity={active === c.index ? 1 : 0.75}
              />
            ))
          ) : (
            <>
              {/* Çizgi grafik: segmentler ait oldukları kaydın aşama renginde */}
              {coords.slice(1).map((c, index) => {
                const prev = coords[index];
                return (
                  <line
                    key={`seg-${c.index}`}
                    x1={prev.cx}
                    y1={prev.cy}
                    x2={c.cx}
                    y2={c.cy}
                    stroke={LEARNING_PHASE_META[c.point.phase].colorVar}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}
              {coords.map((c) => (
                <circle
                  key={c.index}
                  cx={c.cx}
                  cy={c.cy}
                  r={active === c.index ? 5 : 3.5}
                  fill="var(--panel-bg-base)"
                  stroke={LEARNING_PHASE_META[c.point.phase].colorVar}
                  strokeWidth="2"
                />
              ))}
            </>
          )}

          {/* X ekseni etiketleri (kalabalıksa seyreltilir) */}
          {coords.map((c) => {
            const step = Math.ceil(n / 6);
            const show = c.index % step === 0 || c.index === n - 1;
            if (!show) return null;
            return (
              <text
                key={`x-${c.index}`}
                x={c.cx}
                y={H - 8}
                fontSize="9"
                textAnchor="middle"
                fill="var(--panel-text)"
                fillOpacity="0.5"
              >
                {formatChartDate(c.point.date)}
              </text>
            );
          })}

          {/* Saydam hover sütunları (kolay tooltip için) */}
          {coords.map((c) => {
            const half = n === 1 ? IW / 2 : IW / (n - 1) / 2;
            return (
              <rect
                key={`hit-${c.index}`}
                x={c.cx - half}
                y={PAD_TOP}
                width={half * 2}
                height={IH}
                fill="transparent"
                onMouseEnter={() => setActive(c.index)}
                onClick={() => setActive(c.index)}
              />
            );
          })}

          {/* Aktif noktanın dikey vurgu çizgisi */}
          {activePoint && (
            <line
              x1={activePoint.cx}
              x2={activePoint.cx}
              y1={PAD_TOP}
              y2={PAD_TOP + IH}
              stroke="var(--panel-text)"
              strokeOpacity="0.25"
              strokeWidth="1"
            />
          )}
        </svg>

        {/* Tooltip */}
        {activePoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[var(--panel-radius-sm)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-elevated)] px-2.5 py-1.5 text-xs shadow-[var(--panel-shadow)]"
            style={{
              left: `${(activePoint.cx / W) * 100}%`,
              top: `${(activePoint.cy / H) * 100}%`,
            }}
          >
            <div className="font-semibold tabular-nums text-[color:var(--panel-text)]">
              %{activePoint.point.value}
            </div>
            <div
              className="font-medium"
              style={{ color: LEARNING_PHASE_META[activePoint.point.phase].colorVar }}
            >
              {LEARNING_PHASE_META[activePoint.point.phase].label}
            </div>
            <div className="whitespace-nowrap text-[color:var(--panel-text-muted)]">
              {formatTooltipDate(activePoint.point.date)}
            </div>
          </div>
        )}
      </div>

      {/* Aşama lejantı */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--panel-text-muted)]">
        {seenPhases.map((phase) => (
          <span key={phase} className="inline-flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: LEARNING_PHASE_META[phase].colorVar }}
            />
            {LEARNING_PHASE_META[phase].label}
          </span>
        ))}
      </div>
    </div>
  );
}
