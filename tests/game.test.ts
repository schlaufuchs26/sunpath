import { describe, expect, test } from "bun:test";
import {
  buildRounds,
  formatPoints,
  gradeFor,
  MAX_ROUND_POINTS,
  mulberry32,
  ROUNDS_PER_GAME,
  scoreGuess,
  summarise,
} from "../src/game";
import { PLACES, type Place } from "../src/places";

const SAMPLE: readonly Place[] = [
  { id: "a", name: "A", country: "X", lat: 10, fact: "a" },
  { id: "b", name: "B", country: "X", lat: -20, fact: "b" },
  { id: "c", name: "C", country: "X", lat: 60, fact: "c" },
];

describe("buildRounds", () => {
  test("draws eight distinct places and alternates the chart types", () => {
    const rounds = buildRounds(42);
    expect(rounds).toHaveLength(ROUNDS_PER_GAME);
    expect(new Set(rounds.map((r) => r.place.id)).size).toBe(ROUNDS_PER_GAME);
    expect(rounds.map((r) => r.metric)).toEqual([
      "daylight",
      "noon",
      "daylight",
      "noon",
      "daylight",
      "noon",
      "daylight",
      "noon",
    ]);
    expect(rounds.map((r) => r.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test("is deterministic for a seed", () => {
    const first = buildRounds(7).map((r) => r.place.id);
    const again = buildRounds(7).map((r) => r.place.id);
    const other = buildRounds(8).map((r) => r.place.id);
    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });

  test("takes its places from the given pool", () => {
    const rounds = buildRounds(1, 2, SAMPLE);
    expect(rounds).toHaveLength(2);
    for (const round of rounds) {
      expect(SAMPLE.map((p) => p.id)).toContain(round.place.id);
    }
  });

  test("the pool holds enough places and sane latitudes", () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(ROUNDS_PER_GAME * 4);
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
    for (const place of PLACES) {
      expect(Math.abs(place.lat)).toBeLessThanOrEqual(90);
      expect(place.fact.length).toBeGreaterThan(20);
    }
  });
});

describe("mulberry32", () => {
  test("produces the same stream twice and values in [0, 1)", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 10; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("gradeFor", () => {
  test("labels shrink with the miss", () => {
    expect(gradeFor(0).label).toBe("Bullseye");
    expect(gradeFor(1).label).toBe("Bullseye");
    expect(gradeFor(2).label).toBe("Nailed it");
    expect(gradeFor(5).label).toBe("Close");
    expect(gradeFor(10).label).toBe("Same climate zone");
    expect(gradeFor(20).label).toBe("Same hemisphere only");
    expect(gradeFor(40).label).toBe("Other end of the world");
    expect(gradeFor(40).tone).toBe("poor");
    expect(gradeFor(2).tone).toBe("great");
  });
});

describe("scoreGuess", () => {
  test("a direct hit takes the round", () => {
    const result = scoreGuess(51.05, 51.05);
    expect(result.points).toBe(MAX_ROUND_POINTS);
    expect(result.maxPoints).toBe(MAX_ROUND_POINTS);
    expect(result.deltaDeg).toBe(0);
    expect(result.deltaKm).toBe(0);
    expect(result.signedAbsDelta).toBe(0);
  });

  test("points fall off with the miss", () => {
    const near = scoreGuess(50, 52).points;
    const far = scoreGuess(50, 20).points;
    const farther = scoreGuess(50, -50).points;
    expect(near).toBeLessThan(MAX_ROUND_POINTS);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(farther);
    expect(farther).toBeLessThan(10);
  });

  test("the aids cut the round's ceiling", () => {
    expect(scoreGuess(50, 50, { overlay: true }).maxPoints).toBe(3000);
    expect(scoreGuess(50, 50, { clue: true }).maxPoints).toBe(2500);
    expect(scoreGuess(50, 50, { overlay: true, clue: true }).maxPoints).toBe(
      1500,
    );
  });

  test("the signed miss points out the direction", () => {
    expect(scoreGuess(50, 20).signedAbsDelta).toBeLessThan(0);
    expect(scoreGuess(50, 70).signedAbsDelta).toBeGreaterThan(0);
  });

  test("kilometres follow the degrees", () => {
    expect(scoreGuess(10, -10).deltaKm).toBeCloseTo(2222.6, 0);
  });
});

describe("summarise", () => {
  test("adds up the rounds", () => {
    const results = [scoreGuess(50, 50), scoreGuess(0, 10)];
    const summary = summarise(results);
    expect(summary.total).toBe(
      (results[0]?.points ?? 0) + (results[1]?.points ?? 0),
    );
    expect(summary.max).toBe(2 * MAX_ROUND_POINTS);
    expect(summary.averageDeltaDeg).toBeCloseTo(5, 1);
    expect(summary.tone).toBe("good");
  });

  test("calls out an equatorial pull", () => {
    const summary = summarise([scoreGuess(60, 30), scoreGuess(70, 40)]);
    expect(summary.bias).toMatch(/closer to the equator/);
  });

  test("calls out a pull towards the poles", () => {
    const summary = summarise([scoreGuess(20, 50), scoreGuess(10, 40)]);
    expect(summary.bias).toMatch(/farther from the equator/);
  });

  test("stays quiet when the misses cancel out", () => {
    const summary = summarise([scoreGuess(20, 30), scoreGuess(30, 20)]);
    expect(summary.bias).toMatch(/cancel out/);
  });

  test("handles an empty game", () => {
    const summary = summarise([]);
    expect(summary.total).toBe(0);
    expect(summary.max).toBe(0);
    expect(summary.averageDeltaDeg).toBe(0);
    expect(summary.tone).toBe("poor");
  });
});

describe("formatPoints", () => {
  test("groups thousands", () => {
    expect(formatPoints(12345)).toBe("12,345");
    expect(formatPoints(500)).toBe("500");
  });
});
