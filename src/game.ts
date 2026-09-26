/**
 * Game rules: how a round set is drawn, what a round looks like, and how a
 * guess is scored. Kept apart from React so the numbers are testable.
 */
import { latitudeDeltaKm, type Metric } from "./astronomy";
import { PLACES, type Place } from "./places";

export const ROUNDS_PER_GAME = 8;
export const MAX_ROUND_POINTS = 5000;

/** Axes and labels per round type. */
export type ChartConfig = {
  yMin: number;
  yMax: number;
  ticks: number[];
  unit: string;
  axisLabel: string;
  title: string;
};

export const CHART_CONFIG: Record<Metric, ChartConfig> = {
  daylight: {
    yMin: 0,
    yMax: 24,
    ticks: [0, 6, 12, 18, 24],
    unit: "h",
    axisLabel: "hours with the sun up",
    title: "Hours of daylight through the year",
  },
  noon: {
    yMin: -25,
    yMax: 90,
    ticks: [-20, 0, 20, 40, 60, 80],
    unit: "°",
    axisLabel: "height of the noon sun, degrees above the horizon",
    title: "Height of the noon sun through the year",
  },
};

/** Deterministic PRNG so a round set can be replayed in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a !== undefined && b !== undefined) {
      copy[i] = b;
      copy[j] = a;
    }
  }
  return copy;
}

export type Round = { index: number; metric: Metric; place: Place };

/** Eight distinct places, alternating the two chart types. */
export function buildRounds(
  seed: number,
  count = ROUNDS_PER_GAME,
  places: readonly Place[] = PLACES,
): Round[] {
  return shuffled(places, mulberry32(seed))
    .slice(0, count)
    .map((place, i) => ({
      index: i + 1,
      metric: i % 2 === 0 ? "daylight" : "noon",
      place,
    }));
}

export type Verdict = { label: string; tone: "great" | "good" | "ok" | "poor" };

export function gradeFor(deltaDeg: number): Verdict {
  if (deltaDeg <= 1) return { label: "Bullseye", tone: "great" };
  if (deltaDeg <= 3) return { label: "Nailed it", tone: "great" };
  if (deltaDeg <= 7) return { label: "Close", tone: "good" };
  if (deltaDeg <= 14) return { label: "Same climate zone", tone: "ok" };
  if (deltaDeg <= 25) return { label: "Same hemisphere only", tone: "poor" };
  return { label: "Other end of the world", tone: "poor" };
}

export type GuessResult = {
  guessLat: number;
  actualLat: number;
  deltaDeg: number;
  deltaKm: number;
  /** Negative when the guess sits closer to the equator than the place. */
  signedAbsDelta: number;
  points: number;
  maxPoints: number;
  verdict: Verdict;
};

export type ScoreOptions = {
  /** The player switched on the curve overlay. */
  overlay?: boolean;
  /** The player opened the latitude-band clue. */
  clue?: boolean;
};

/**
 * Half life of eight degrees: a guess within a degree or two keeps most of
 * the points, and the score decays smoothly with the miss.
 */
export function scoreGuess(
  actualLat: number,
  guessLat: number,
  options: ScoreOptions = {},
): GuessResult {
  const deltaDeg = Math.abs(actualLat - guessLat);
  const maxPoints = Math.round(
    MAX_ROUND_POINTS * (options.overlay ? 0.6 : 1) * (options.clue ? 0.5 : 1),
  );
  return {
    guessLat,
    actualLat,
    deltaDeg,
    deltaKm: latitudeDeltaKm(deltaDeg),
    signedAbsDelta: Math.abs(guessLat) - Math.abs(actualLat),
    points: Math.round(maxPoints * Math.exp(-deltaDeg / 8)),
    maxPoints,
    verdict: gradeFor(deltaDeg),
  };
}

export type GameSummary = {
  total: number;
  max: number;
  averageDeltaDeg: number;
  bias: string;
  tone: "great" | "good" | "ok" | "poor";
};

export function summarise(results: readonly GuessResult[]): GameSummary {
  const total = results.reduce((sum, result) => sum + result.points, 0);
  const max = results.reduce((sum, result) => sum + result.maxPoints, 0);
  const averageDeltaDeg =
    results.length === 0
      ? 0
      : results.reduce((sum, r) => sum + r.deltaDeg, 0) / results.length;
  const meanAbs =
    results.length === 0
      ? 0
      : results.reduce((sum, r) => sum + r.signedAbsDelta, 0) / results.length;

  let bias = "Not enough rounds to say anything about your instinct.";
  if (results.length > 0) {
    if (Math.abs(meanAbs) < 2) {
      bias =
        "Your misses cancel out; no clear pull towards or away from the equator.";
    } else if (meanAbs > 0) {
      bias = `On average you place these places ${meanAbs.toFixed(1)}° farther from the equator than they are.`;
    } else {
      bias = `On average you place these places ${Math.abs(meanAbs).toFixed(1)}° closer to the equator than they are.`;
    }
  }

  const share = max === 0 ? 0 : total / max;
  const tone =
    share >= 0.8
      ? "great"
      : share >= 0.6
        ? "good"
        : share >= 0.4
          ? "ok"
          : "poor";
  return { total, max, averageDeltaDeg, bias, tone };
}

export function formatPoints(points: number): string {
  return points.toLocaleString("en-US");
}
