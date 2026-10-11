"use client";

import { useId, useState } from "react";
import type { EquityPoint } from "@/lib/stats";
import {
  formatDateWib,
  formatDateTimeWib,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  formatSignedPercent,
  pnlClass,
} from "@/lib/format";

function Placeholder({ note }: { note: string }) {
  return (
    <div className="num flex h-40 items-center justify-center text-xs text-muted">
      {note}
    </div>
  );
}

export function EquityChart({
  points,
  base,
  unit = "dollar",
  onUnitChange,
}: {
  points: EquityPoint[];
  base: number;
  unit?: "dollar" | "percent";
  onUnitChange?: (unit: "dollar" | "percent") => void;
}) {
  const [internalUnit, setInternalUnit] = useState<"dollar" | "percent">(unit);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const clipId = useId();

  const currentUnit = onUnitChange ? unit : internalUnit;
  const toggleUnit = (next: "dollar" | "percent") => {
    if (onUnitChange) onUnitChange(next);
    else setInternalUnit(next);
  };

  if (points.length < 2) {
    return <Placeholder note="Butuh minimal 2 trade tertutup untuk menggambar kurva." />;
  }

  const w = 800;
  const h = 220;
  const pad = 12;

  // Percent returns relative to base
  const isPercent = currentUnit === "percent";
  const getPointValue = (p: EquityPoint) =>
    isPercent ? (base > 0 ? ((p.equity - base) / base) * 100 : 0) : p.equity;
  const baseValue = isPercent ? 0 : base;

  const values = points.map(getPointValue);
  const min = Math.min(...values, baseValue);
  const max = Math.max(...values, baseValue);
  const range = max - min || 1;

  const x = (index: number) => pad + (index / (points.length - 1)) * (w - pad * 2);
  const y = (val: number) => pad + (1 - (val - min) / range) * (h - pad * 2);

  const line = points
    .map((p, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(getPointValue(p)).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${h - pad} L ${x(0).toFixed(1)} ${h - pad} Z`;

  const lastPoint = points[points.length - 1];
  const lastValue = values[values.length - 1];
  const up = lastPoint.equity >= base;
  const stroke = up ? "var(--profit)" : "var(--loss)";

  const hovered = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const hoveredValue = hovered ? getPointValue(hovered) : null;
  const hoveredX = hoverIndex !== null ? x(hoverIndex) : 0;
  const hoveredY = hoveredValue !== null ? y(hoveredValue) : 0;
  const tooltipFlip = hoverIndex !== null && hoverIndex > points.length * 0.65;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const clampedRatio = Math.max(0, Math.min(1, (relativeX * w - pad) / (w - pad * 2)));
    const targetIndex = Math.round(clampedRatio * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, targetIndex)));
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="relative px-4 py-4 select-none">
      <div className="mb-2 flex items-center justify-between">
        <span className="num text-[11px] text-muted">
          {isPercent ? "Mode Persen (%) dari saldo awal" : "Mode Dollar ($) akumulasi equity"}
        </span>
        <div className="flex items-center gap-1 border border-line p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => toggleUnit("dollar")}
            className={`num px-2 py-0.5 transition-colors ${
              !isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
            }`}
          >
            $ USD
          </button>
          <button
            type="button"
            onClick={() => toggleUnit("percent")}
            className={`num px-2 py-0.5 transition-colors ${
              isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
            }`}
          >
            % Persen
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-48 w-full cursor-crosshair touch-none"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Kurva equity, dari ${formatSignedMoney(base)} menjadi ${formatSignedMoney(lastPoint.equity)}`}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} />
            </clipPath>
          </defs>

          {/* Baseline at the starting balance or 0% */}
          <line
            x1={pad}
            x2={w - pad}
            y1={y(baseValue)}
            y2={y(baseValue)}
            stroke="var(--line)"
            strokeDasharray="4 4"
          />

          {/* Area & Stroke */}
          <path d={area} fill={stroke} opacity="0.08" />
          <path
            d={line}
            fill="none"
            stroke={stroke}
            strokeWidth="1.75"
            vectorEffect="non-scaling-stroke"
          />

          {/* Interactive Guide Hairline and Indicator Dot */}
          {hovered && (
            <g>
              <line
                x1={hoveredX}
                x2={hoveredX}
                y1={pad}
                y2={h - pad}
                stroke="var(--brass)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={hoveredX}
                cy={hoveredY}
                r="7"
                fill="var(--ink)"
                stroke="var(--brass)"
                strokeWidth="2"
              />
              <circle
                cx={hoveredX}
                cy={hoveredY}
                r="3.5"
                fill="var(--brass)"
              />
            </g>
          )}
        </svg>

        {/* Rich Floating Detail Tooltip */}
        {hovered && (
          <div
            className="pointer-events-none absolute top-2 z-30 transition-transform duration-75 ease-out"
            style={{
              left: `${(hoveredX / w) * 100}%`,
              transform: tooltipFlip ? "translateX(-105%)" : "translateX(5%)",
            }}
          >
            <div className="panel-surface min-w-[210px] border border-line bg-ink/95 p-3 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-line/60 pb-1.5">
                <span className="num text-xs font-semibold text-brass">
                  Trade #{hovered.index + 1}
                </span>
                {hovered.result && (
                  <span
                    className={`num text-[10px] px-1.5 py-0.2 border ${
                      hovered.result === "TP"
                        ? "border-profit/40 text-profit bg-profit/10"
                        : hovered.result === "SL"
                          ? "border-loss/40 text-loss bg-loss/10"
                          : "border-line text-muted"
                    }`}
                  >
                    {hovered.result}
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1 text-xs">
                {hovered.pair && (
                  <div className="flex justify-between text-muted">
                    <span>Pair:</span>
                    <span className="num text-paper font-medium">
                      {hovered.pair} · {hovered.direction}
                    </span>
                  </div>
                )}
                {hovered.pnl !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted">P/L Trade:</span>
                    <span className={`num font-medium ${pnlClass(hovered.pnl)}`}>
                      {formatSignedMoney(hovered.pnl)} (
                      {base > 0 ? formatSignedPercent((hovered.pnl / base) * 100) : "-"})
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Total Equity:</span>
                  <span className="num font-semibold text-paper">
                    {formatMoney(hovered.equity)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Return:</span>
                  <span
                    className={`num font-medium ${
                      hovered.equity >= base ? "text-profit" : "text-loss"
                    }`}
                  >
                    {formatSignedPercent(base > 0 ? ((hovered.equity - base) / base) * 100 : 0)} (
                    {formatSignedMoney(hovered.equity - base)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Drawdown:</span>
                  <span className="num text-loss">
                    {hovered.drawdown > 0
                      ? `${formatSignedMoney(-hovered.drawdown)} (-${hovered.drawdownPercent.toFixed(1)}%)`
                      : "0.00% (Puncak)"}
                  </span>
                </div>
                <div className="border-t border-line/60 pt-1 text-[10px] text-muted">
                  {formatDateTimeWib(hovered.time)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="num mt-2 flex justify-between text-[11px] text-muted">
        <span>
          mulai {isPercent ? "0.00%" : formatSignedMoney(base)}
        </span>
        <span>
          sekarang{" "}
          {isPercent
            ? formatSignedPercent(base > 0 ? ((lastPoint.equity - base) / base) * 100 : 0)
            : formatSignedMoney(lastPoint.equity)}{" "}
          ({formatSignedMoney(lastPoint.equity - base)})
        </span>
      </div>
    </div>
  );
}

export function DrawdownChart({
  points,
  unit = "dollar",
  onUnitChange,
}: {
  points: EquityPoint[];
  unit?: "dollar" | "percent";
  onUnitChange?: (unit: "dollar" | "percent") => void;
}) {
  const [internalUnit, setInternalUnit] = useState<"dollar" | "percent">(unit);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const currentUnit = onUnitChange ? unit : internalUnit;
  const toggleUnit = (next: "dollar" | "percent") => {
    if (onUnitChange) onUnitChange(next);
    else setInternalUnit(next);
  };

  if (points.length < 2) {
    return <Placeholder note="Butuh minimal 2 trade tertutup." />;
  }

  const isPercent = currentUnit === "percent";
  const w = 800;
  const h = 180;
  const pad = 12;

  const maxDdMoney = Math.max(...points.map((p) => p.drawdown), 0.01);
  const maxDdPercent = Math.max(...points.map((p) => p.drawdownPercent), 0.01);
  const scaleMax = isPercent ? maxDdPercent : maxDdMoney;

  const getDdValue = (p: EquityPoint) => (isPercent ? p.drawdownPercent : p.drawdown);

  const x = (index: number) => pad + (index / (points.length - 1)) * (w - pad * 2);
  const y = (val: number) => pad + (val / scaleMax) * (h - pad * 2);

  const area = [
    `M ${x(0).toFixed(1)} ${pad}`,
    ...points.map((point, index) => `L ${x(index).toFixed(1)} ${y(getDdValue(point)).toFixed(1)}`),
    `L ${x(points.length - 1).toFixed(1)} ${pad}`,
    "Z",
  ].join(" ");

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(getDdValue(point)).toFixed(1)}`)
    .join(" ");

  const hovered = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const hoveredValue = hovered ? getDdValue(hovered) : null;
  const hoveredX = hoverIndex !== null ? x(hoverIndex) : 0;
  const hoveredY = hoveredValue !== null ? y(hoveredValue) : 0;
  const tooltipFlip = hoverIndex !== null && hoverIndex > points.length * 0.65;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const clampedRatio = Math.max(0, Math.min(1, (relativeX * w - pad) / (w - pad * 2)));
    const targetIndex = Math.round(clampedRatio * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, targetIndex)));
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="relative px-4 py-4 select-none">
      <div className="mb-2 flex items-center justify-between">
        <span className="num text-[11px] text-muted">
          {isPercent ? "Drawdown dalam Persen (%) dari puncak" : "Drawdown dalam Dollar ($)"}
        </span>
        <div className="flex items-center gap-1 border border-line p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => toggleUnit("dollar")}
            className={`num px-2 py-0.5 transition-colors ${
              !isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
            }`}
          >
            $ USD
          </button>
          <button
            type="button"
            onClick={() => toggleUnit("percent")}
            className={`num px-2 py-0.5 transition-colors ${
              isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
            }`}
          >
            % Persen
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-40 w-full cursor-crosshair touch-none"
          preserveAspectRatio="none"
          role="img"
          aria-label="Grafik drawdown dari puncak equity"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          {/* Baseline (0 drawdown) */}
          <line
            x1={pad}
            x2={w - pad}
            y1={pad}
            y2={pad}
            stroke="var(--line)"
            strokeDasharray="4 4"
          />

          <path
            d={area}
            fill="var(--loss)"
            opacity="0.18"
          />
          <path
            d={line}
            fill="none"
            stroke="var(--loss)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />

          {hovered && (
            <g>
              <line
                x1={hoveredX}
                x2={hoveredX}
                y1={pad}
                y2={h - pad}
                stroke="var(--loss)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={hoveredX}
                cy={hoveredY}
                r="7"
                fill="var(--ink)"
                stroke="var(--loss)"
                strokeWidth="2"
              />
              <circle
                cx={hoveredX}
                cy={hoveredY}
                r="3.5"
                fill="var(--loss)"
              />
            </g>
          )}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-2 z-30 transition-transform duration-75 ease-out"
            style={{
              left: `${(hoveredX / w) * 100}%`,
              transform: tooltipFlip ? "translateX(-105%)" : "translateX(5%)",
            }}
          >
            <div className="panel-surface min-w-[200px] border border-line bg-ink/95 p-3 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-line/60 pb-1.5">
                <span className="num text-xs font-semibold text-brass">
                  Trade #{hovered.index + 1}
                </span>
                <span className="num text-[10px] text-muted">
                  {formatDateWib(hovered.time)}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Drawdown:</span>
                  <span className="num font-semibold text-loss">
                    {formatSignedMoney(-hovered.drawdown)} (-{hovered.drawdownPercent.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Puncak Saldo:</span>
                  <span className="num text-paper font-medium">
                    {formatMoney(hovered.peak)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Saldo Saat Ini:</span>
                  <span className="num text-paper font-medium">
                    {formatMoney(hovered.equity)}
                  </span>
                </div>
                <div className="border-t border-line/60 pt-1 text-[10px] text-muted">
                  {hovered.drawdown === 0 ? "Titik tertinggi (All-Time High)" : "Sedang dalam penurunan"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="num mt-2 flex justify-between text-[11px] text-muted">
        <span>0</span>
        <span>
          terdalam{" "}
          {isPercent
            ? `-${maxDdPercent.toFixed(1)}%`
            : formatSignedMoney(-maxDdMoney)}{" "}
          ({isPercent ? formatSignedMoney(-maxDdMoney) : `-${maxDdPercent.toFixed(1)}%`})
        </span>
      </div>
    </div>
  );
}

export function DailyBars({
  days,
  base,
  unit = "dollar",
  onUnitChange,
}: {
  days: { key: string; pnl: number; count: number }[];
  base?: number;
  unit?: "dollar" | "percent";
  onUnitChange?: (unit: "dollar" | "percent") => void;
}) {
  const [internalUnit, setInternalUnit] = useState<"dollar" | "percent">(unit);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const currentUnit = onUnitChange ? unit : internalUnit;
  const toggleUnit = (next: "dollar" | "percent") => {
    if (onUnitChange) onUnitChange(next);
    else setInternalUnit(next);
  };

  if (days.length === 0) {
    return <Placeholder note="Belum ada P/L harian." />;
  }

  const isPercent = currentUnit === "percent";
  const maxAbsPnl = Math.max(...days.map((d) => Math.abs(d.pnl)), 1);
  const hoveredDay = days.find((d) => d.key === hoveredKey);

  return (
    <div className="relative px-4 py-4 select-none">
      <div className="mb-2 flex items-center justify-between">
        <span className="num text-[11px] text-muted">
          {isPercent ? "P/L Harian dalam Persen (%)" : "P/L Harian dalam Dollar ($)"}
        </span>
        {base && (
          <div className="flex items-center gap-1 border border-line p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => toggleUnit("dollar")}
              className={`num px-2 py-0.5 transition-colors ${
                !isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
              }`}
            >
              $ USD
            </button>
            <button
              type="button"
              onClick={() => toggleUnit("percent")}
              className={`num px-2 py-0.5 transition-colors ${
                isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
              }`}
            >
              % Persen
            </button>
          </div>
        )}
      </div>

      <div className="relative flex h-36 items-end gap-[3px] pt-4">
        {days.map((day) => {
          const height = Math.max((Math.abs(day.pnl) / maxAbsPnl) * 100, 2);
          const tone =
            day.pnl > 0 ? "var(--profit)" : day.pnl < 0 ? "var(--loss)" : "var(--flat)";
          const isHovered = hoveredKey === day.key;

          return (
            <div
              key={day.key}
              className="group relative flex-1 cursor-pointer h-full flex flex-col justify-end"
              onMouseEnter={() => setHoveredKey(day.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <div
                style={{
                  height: `${height}%`,
                  background: tone,
                  opacity: hoveredKey && !isHovered ? 0.35 : 1,
                }}
                className={`w-full transition-all duration-150 ${
                  isHovered ? "ring-2 ring-brass brightness-125" : ""
                }`}
              />
            </div>
          );
        })}

        {/* Hover detail tooltip for Daily Bars */}
        {hoveredDay && (
          <div className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2">
            <div className="panel-surface border border-line bg-ink/95 px-3 py-2 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="num text-xs text-muted">
                  {formatDateWib(`${hoveredDay.key}T00:00:00+07:00`)}
                </span>
                <span className={`num text-xs font-semibold ${pnlClass(hoveredDay.pnl)}`}>
                  {formatSignedMoney(hoveredDay.pnl)}
                  {base && (
                    <span className="ml-1 text-[11px] opacity-80">
                      ({formatSignedPercent((hoveredDay.pnl / base) * 100)})
                    </span>
                  )}
                </span>
                <span className="num text-[11px] text-muted">
                  · {hoveredDay.count} trade
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="num mt-2 flex justify-between text-[11px] text-muted">
        <span>{formatDateWib(`${days[0]?.key}T00:00:00+07:00`)}</span>
        <span>{formatDateWib(`${days[days.length - 1]?.key}T00:00:00+07:00`)}</span>
      </div>
    </div>
  );
}
