import { describe, expect, test } from "bun:test";
import {
  bandClue,
  DAYS_PER_YEAR,
  daylightHours,
  dayOfYearLabel,
  formatHours,
  formatLatitude,
  latitudeDeltaKm,
  noonSunAltitudeDeg,
  placeStats,
  polarSpan,
  sampleSeries,
  solarDeclinationDeg,
} from "../src/astronomy";

describe("solarDeclinationDeg", () => {
  test("swings between the two tropics over the year", () => {
    let max = -90;
    let min = 90;
    for (let day = 1; day <= DAYS_PER_YEAR; day++) {
      const dec = solarDeclinationDeg(day);
      max = Math.max(max, dec);
      min = Math.min(min, dec);
    }
    expect(max).toBeGreaterThan(23.4);
    expect(max).toBeLessThan(23.5);
    expect(min).toBeLessThan(-23.4);
    expect(min).toBeGreaterThan(-23.5);
  });

  test("is near zero at the March equinox", () => {
    expect(Math.abs(solarDeclinationDeg(80))).toBeLessThan(0.2);
  });
});

describe("daylightHours", () => {
  test("the equator sits near twelve hours all year", () => {
    for (const day of [1, 80, 172, 265, 355]) {
      expect(daylightHours(0, day)).toBeGreaterThan(12);
      expect(daylightHours(0, day)).toBeLessThan(12.3);
    }
  });

  test("Dresden matches the almanac within minutes", () => {
    expect(daylightHours(51.05, 172)).toBeGreaterThan(16.4);
    expect(daylightHours(51.05, 172)).toBeLessThan(16.7);
    expect(daylightHours(51.05, 355)).toBeGreaterThan(7.8);
    expect(daylightHours(51.05, 355)).toBeLessThan(8.0);
  });

  test("sits at the extremes inside a polar circle", () => {
    expect(daylightHours(78.22, 172)).toBe(24);
    expect(daylightHours(78.22, 355)).toBe(0);
  });

  test("a higher latitude has the longer June day", () => {
    expect(daylightHours(60, 172)).toBeGreaterThan(daylightHours(40, 172));
    expect(daylightHours(-60, 172)).toBeLessThan(daylightHours(-40, 172));
  });

  test("sampleSeries returns one honest point per day", () => {
    const series = sampleSeries(48.21, "daylight");
    expect(series).toHaveLength(DAYS_PER_YEAR);
    expect(series[171]).toBeCloseTo(daylightHours(48.21, 172), 6);
    const noon = sampleSeries(48.21, "noon");
    expect(noon).toHaveLength(DAYS_PER_YEAR);
    expect(noon[171]).toBeCloseTo(noonSunAltitudeDeg(48.21, 172), 6);
  });
});

describe("noonSunAltitudeDeg", () => {
  test("the sun is nearly overhead at the equator at the equinox", () => {
    expect(noonSunAltitudeDeg(0, 80)).toBeGreaterThan(89);
  });

  test("follows the 90 - |latitude - declination| rule", () => {
    expect(noonSunAltitudeDeg(51.05, 172)).toBeCloseTo(62.4, 1);
  });

  test("goes negative where the sun never rises", () => {
    expect(noonSunAltitudeDeg(78.22, 355)).toBeLessThan(-10);
  });
});

describe("polarSpan", () => {
  test("is null without polar day or night", () => {
    expect(polarSpan(0, "day")).toBeNull();
    expect(polarSpan(0, "night")).toBeNull();
    expect(polarSpan(-54.8, "night")).toBeNull();
  });

  test("reports the wrapped polar night of Svalbard", () => {
    const span = polarSpan(78.22, "night");
    expect(span).not.toBeNull();
    if (!span) throw new Error("expected a polar night");
    expect(span.days).toBeGreaterThan(100);
    expect(span.days).toBeLessThan(120);
    // The sun sets for the last time in late October and comes back in
    // mid-February, so the stretch runs across New Year.
    expect(dayOfYearLabel(span.start)).toMatch(/October/);
    expect(dayOfYearLabel(span.end)).toMatch(/February/);
  });
});

describe("placeStats", () => {
  test("finds the solstices at a mid latitude", () => {
    const stats = placeStats(51.05);
    expect(stats.longestDay.hours).toBeCloseTo(16.56, 1);
    expect(dayOfYearLabel(stats.longestDay.day)).toMatch(/June/);
    expect(stats.shortestDay.hours).toBeCloseTo(7.9, 1);
    expect(dayOfYearLabel(stats.shortestDay.day)).toMatch(/December/);
    expect(stats.polarDay).toBeNull();
    expect(stats.polarNight).toBeNull();
  });

  test("gives Tromsø both a midnight sun and a polar night", () => {
    const stats = placeStats(69.65);
    expect(stats.polarDay?.days).toBeGreaterThan(55);
    expect(stats.polarNight?.days).toBeGreaterThan(40);
  });
});

describe("formatting", () => {
  test("days of the year become dates", () => {
    expect(dayOfYearLabel(1)).toBe("1 January");
    expect(dayOfYearLabel(172)).toBe("21 June");
    expect(dayOfYearLabel(365)).toBe("31 December");
  });

  test("hours read like a clock", () => {
    expect(formatHours(24)).toBe("24 h");
    expect(formatHours(0)).toBe("0 h");
    expect(formatHours(16.558)).toBe("16 h 33 min");
  });

  test("latitudes carry their hemisphere", () => {
    expect(formatLatitude(47.5)).toBe("47.5° N");
    expect(formatLatitude(-33.92)).toBe("33.9° S");
    expect(formatLatitude(0)).toBe("0.0° (equator)");
    expect(formatLatitude(-0.02)).toBe("0.0° (equator)");
  });

  test("a degree of latitude is 111 km", () => {
    expect(latitudeDeltaKm(1)).toBeCloseTo(111.13, 2);
  });

  test("the clue names one of the three bands", () => {
    expect(bandClue(3)).toMatch(/tropics/);
    expect(bandClue(-45)).toMatch(/temperate/);
    expect(bandClue(70)).toMatch(/polar circle/);
    expect(bandClue(-70)).toMatch(/polar circle/);
  });
});
