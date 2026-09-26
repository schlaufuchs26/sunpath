/**
 * Solar geometry, good enough to draw an honest year of sunlight.
 *
 * Conventions (documented because the numbers are shown to players):
 * - The sun's declination comes from Spencer's (1971) Fourier series, which
 *   is accurate to roughly 0.01 degrees.
 * - Sunrise and sunset use the standard -0.833 degree altitude, i.e. the
 *   sun's upper limb with refraction; almanacs use the same convention.
 * - Everything is local mean solar time. Time zones, the equation of time
 *   and daylight saving are not modelled, which shifts a sunrise by up to
 *   half an hour in extreme cases.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Standard altitude of the sun's centre at sunrise: refraction + solar radius. */
const SUNRISE_ALTITUDE_DEG = -0.833;

export const DAYS_PER_YEAR = 365;

/** Latitude of the polar circles and tropics in 2026 (the circles drift). */
const POLAR_CIRCLE_DEG = 66.56;
const TROPIC_DEG = 23.44;

/** Sun's declination in degrees, + north, for a day of a non-leap year. */
export function solarDeclinationDeg(dayOfYear: number): number {
  const g = (2 * Math.PI * (dayOfYear - 1)) / DAYS_PER_YEAR;
  const radians =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  return radians * RAD;
}

/**
 * Height of the sun above the horizon at local noon, in degrees. Negative
 * when the sun stays below the horizon all day.
 */
export function noonSunAltitudeDeg(
  latitudeDeg: number,
  dayOfYear: number,
): number {
  return 90 - Math.abs(latitudeDeg - solarDeclinationDeg(dayOfYear));
}

/**
 * Hours between sunrise and sunset, 0 to 24. Near the poles the cosine runs
 * off to +/-Infinity, which the two clamps catch; NaN cannot occur because
 * the numerator is only zero on a day with no declination.
 */
export function daylightHours(latitudeDeg: number, dayOfYear: number): number {
  const phi = latitudeDeg * DEG;
  const dec = solarDeclinationDeg(dayOfYear) * DEG;
  const cosH =
    (Math.sin(SUNRISE_ALTITUDE_DEG * DEG) - Math.sin(phi) * Math.sin(dec)) /
    (Math.cos(phi) * Math.cos(dec));
  if (cosH <= -1) return 24;
  if (cosH >= 1) return 0;
  return (2 * Math.acos(cosH) * RAD) / 15;
}

export type Metric = "daylight" | "noon";

/** One value per day of the year for the given metric. */
export function sampleSeries(latitudeDeg: number, metric: Metric): number[] {
  const series: number[] = [];
  for (let day = 1; day <= DAYS_PER_YEAR; day++) {
    series.push(
      metric === "daylight"
        ? daylightHours(latitudeDeg, day)
        : noonSunAltitudeDeg(latitudeDeg, day),
    );
  }
  return series;
}

const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "21 June" for a day of the year. */
export function dayOfYearLabel(dayOfYear: number): string {
  let month = 0;
  for (let i = 0; i < MONTH_STARTS.length; i++) {
    const start = MONTH_STARTS[i];
    if (start !== undefined && dayOfYear >= start) month = i;
  }
  const start = MONTH_STARTS[month] ?? 1;
  return `${dayOfYear - start + 1} ${MONTH_NAMES[month] ?? ""}`;
}

/** "16 h 40 min", "24 h", "0 h". */
export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const whole = Math.floor(total / 60);
  const minutes = total % 60;
  if (minutes === 0) return `${whole} h`;
  return `${whole} h ${String(minutes).padStart(2, "0")} min`;
}

/** "47.5° N", "0.0° (equator)". */
export function formatLatitude(latitudeDeg: number): string {
  const abs = Math.abs(latitudeDeg);
  if (abs < 0.05) return "0.0° (equator)";
  return `${abs.toFixed(1)}° ${latitudeDeg > 0 ? "N" : "S"}`;
}

/** Degrees of latitude to kilometres along a meridian. */
export function latitudeDeltaKm(deltaDeg: number): number {
  return deltaDeg * 111.13;
}

export type Span = { start: number; end: number; days: number };

/**
 * The stretch of the year in which the sun does not rise (`kind: "night"`)
 * or does not set (`kind: "day"`), or null if that never happens. Around the
 * solstice the stretch can wrap past New Year, which is why start/end are
 * days of the year and not a simple subtraction.
 */
export function polarSpan(
  latitudeDeg: number,
  kind: "day" | "night",
): Span | null {
  const on: boolean[] = [];
  for (let day = 1; day <= DAYS_PER_YEAR; day++) {
    const hours = daylightHours(latitudeDeg, day);
    on.push(kind === "day" ? hours >= 24 : hours <= 0);
  }
  const days = on.filter(Boolean).length;
  if (days === 0) return null;

  // Start of the stretch: a day that qualifies while its predecessor does
  // not. Looking at the circular sequence puts the start after New Year for
  // a polar night that runs over the turn of the year.
  let start = 1;
  for (let index = 0; index < DAYS_PER_YEAR; index++) {
    const previous = on[(index - 1 + DAYS_PER_YEAR) % DAYS_PER_YEAR] ?? false;
    if (on[index] === true && !previous) {
      start = index + 1;
      break;
    }
  }
  const end = ((start - 1 + days - 1) % DAYS_PER_YEAR) + 1;
  return { start, end, days };
}

export type PlaceStats = {
  longestDay: { hours: number; day: number };
  shortestDay: { hours: number; day: number };
  polarDay: Span | null;
  polarNight: Span | null;
};

export function placeStats(latitudeDeg: number): PlaceStats {
  let longest = { hours: -1, day: 1 };
  let shortest = { hours: 25, day: 1 };
  for (let day = 1; day <= DAYS_PER_YEAR; day++) {
    const hours = daylightHours(latitudeDeg, day);
    if (hours > longest.hours) longest = { hours, day };
    if (hours < shortest.hours) shortest = { hours, day };
  }
  return {
    longestDay: longest,
    shortestDay: shortest,
    polarDay: polarSpan(latitudeDeg, "day"),
    polarNight: polarSpan(latitudeDeg, "night"),
  };
}

/** Which of the three latitude bands a place sits in, used as a paid clue. */
export function bandClue(latitudeDeg: number): string {
  const abs = Math.abs(latitudeDeg);
  if (abs < TROPIC_DEG) {
    return "This place is inside the tropics, between the two tropics.";
  }
  if (abs < POLAR_CIRCLE_DEG) {
    return "This place is in the temperate belt: outside the tropics, outside the polar circles.";
  }
  return "This place is inside a polar circle, where the sun can stay up, or stay down, all day.";
}
