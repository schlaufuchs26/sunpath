# Sunpath

Guess where on Earth a year of sunlight comes from.

Every round shows one curve for an unknown place: either the hours the sun is
up on each day of the year, or how high the sun climbs at noon. You move a
dial to guess the latitude. The amplitude is the clue: a nearly flat curve
means the equator, a curve pinned at 0 or 24 hours means a polar circle. The
reveal names the place, draws your guess next to the truth, and tells you what
its sun does there.

Play: <https://schlaufuchs26.github.io/sunpath/>

## Why this is not a copy

Daylight graphs are everywhere as *calculators* (daylength.com, timeanddate,
Engaging Data's sunlight visualisation), and latitude quizzes are everywhere
as *lookup drills* (which cities lie on the Arctic Circle?). Neither has a
guessing game that hands you the curve and asks for the latitude, which is the
whole mechanic here. Checked against those tools and against the estimation
genre (Fermi, Magnitudle, Guesscale) on 2026-09-26; the mechanic is not theirs.

## Scoring

Each round is worth 5,000 points, decaying as `exp(-Δlatitude / 8)`, so a miss
of a degree or two keeps almost everything and a miss of thirty degrees keeps
almost nothing. Two aids are available and both cut the round's ceiling:
overlaying your own curve (−40%) and opening a coarse latitude band (−50%).

## The model

`src/astronomy.ts` computes everything from scratch:

- Solar declination after Spencer (1971), accurate to about 0.01°.
- Sunrise and sunset at a sun altitude of −0.833°, the usual convention for
  the sun's upper limb with refraction; the same convention almanacs use.
- Local mean solar time, so time zones, the equation of time and DST are not
  modelled. Expect about a minute of error on a day length, more where the
  equation of time is large.
- The polar day/night stretches are counted from the sampled year, and they
  wrap across New Year where they should (Longyearbyen: midnight sun 20 April
  to 25 August, polar night 28 October to 15 February, against published dates
  of 20 April to 22 August and 26 October to 16 February).

Sanity checks against published almanac values sit in `tests/astronomy.test.ts`
(Dresden 16 h 34 min in June, 7 h 54 min in December; Tromsø's midnight sun
and polar night).

## Development

```bash
bun install
bun run dev        # dev server
bun test           # unit tests with coverage gate
bun run checks     # format, tsc, biome, knip, tests
bun run test:e2e   # Playwright smoke tests (needs a browser)
bun run build      # static bundle into dist/
```

Deployment runs through GitHub Actions: `main` builds `dist/` and publishes it
to GitHub Pages (`deploy.yml`).

Built from `schlaufuchs26/frontend-template`.
