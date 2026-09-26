import { DAYS_PER_YEAR } from "../astronomy";
import type { ChartConfig } from "../game";

const W = 760;
const H = 320;
const M = { top: 20, right: 14, bottom: 38, left: 56 };
const INNER_W = W - M.left - M.right;
const INNER_H = H - M.top - M.bottom;

const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const COLOR = {
  curve: "#f4b942",
  curveFill: "rgba(244, 185, 66, 0.12)",
  guess: "#5ad1ff",
  grid: "rgba(255, 255, 255, 0.08)",
  zero: "rgba(255, 255, 255, 0.22)",
  text: "#94a3c4",
};

function xFor(index: number): number {
  return M.left + (index / (DAYS_PER_YEAR - 1)) * INNER_W;
}

function yFor(value: number, config: ChartConfig): number {
  const clamped = Math.max(config.yMin, Math.min(config.yMax, value));
  return (
    M.top + ((config.yMax - clamped) / (config.yMax - config.yMin)) * INNER_H
  );
}

function linePath(series: readonly number[], config: ChartConfig): string {
  return series
    .map((value, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${xFor(index).toFixed(2)} ${yFor(value, config).toFixed(2)}`;
    })
    .join(" ");
}

function areaPath(series: readonly number[], config: ChartConfig): string {
  const first = series[0];
  const last = series[series.length - 1];
  if (first === undefined || last === undefined) return "";
  const base = yFor(config.yMin, config);
  return `${linePath(series, config)} L${xFor(series.length - 1).toFixed(2)} ${base.toFixed(2)} L${xFor(0).toFixed(2)} ${base.toFixed(2)} Z`;
}

export type SunChartProps = {
  title: string;
  config: ChartConfig;
  /** One value per day of the year. */
  series: readonly number[];
  guess?: { series: readonly number[]; label: string };
};

/**
 * A year of sunlight as a line. The vertical axis is fixed by the round type
 * so that two curves can honestly be compared by eye.
 */
export function SunChart({ title, config, series, guess }: SunChartProps) {
  const area = config.yMin === 0 ? areaPath(series, config) : null;

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}. Vertical axis: ${config.axisLabel}.`}
      >
        <title>{title}</title>

        {config.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={yFor(tick, config)}
              y2={yFor(tick, config)}
              stroke={tick === 0 ? COLOR.zero : COLOR.grid}
              strokeWidth={1}
              strokeDasharray={tick === 0 ? "4 4" : undefined}
            />
            <text
              x={M.left - 10}
              y={yFor(tick, config)}
              fill={COLOR.text}
              fontSize={13}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {tick}
              {config.unit}
            </text>
          </g>
        ))}

        {MONTH_STARTS.map((start) => (
          <line
            key={start}
            x1={xFor(start - 1)}
            x2={xFor(start - 1)}
            y1={M.top}
            y2={H - M.bottom}
            stroke={COLOR.grid}
            strokeWidth={1}
          />
        ))}

        {MONTH_STARTS.map((start, month) => (
          <text
            key={MONTH_LABELS[month] ?? month}
            x={xFor(start - 1 + 15)}
            y={H - M.bottom + 20}
            fill={COLOR.text}
            fontSize={13}
            textAnchor="middle"
          >
            {MONTH_LABELS[month] ?? ""}
          </text>
        ))}

        {area ? <path d={area} fill={COLOR.curveFill} stroke="none" /> : null}

        {guess ? (
          <path
            data-testid="guess-curve"
            d={linePath(guess.series, config)}
            fill="none"
            stroke={COLOR.guess}
            strokeWidth={2}
            strokeDasharray="6 5"
            opacity={0.9}
          />
        ) : null}

        <path
          d={linePath(series, config)}
          fill="none"
          stroke={COLOR.curve}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {guess ? (
        <div className="legend">
          <span>
            <span className="swatch" style={{ background: COLOR.curve }} />
            This place
          </span>
          <span>
            <span
              className="swatch"
              style={{
                background: `repeating-linear-gradient(90deg, ${COLOR.guess} 0 5px, transparent 5px 9px)`,
              }}
            />
            {guess.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
