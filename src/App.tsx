import { useState } from "react";
import {
  bandClue,
  dayOfYearLabel,
  formatHours,
  formatLatitude,
  placeStats,
  sampleSeries,
} from "./astronomy";
import { LatitudeDial } from "./components/LatitudeDial";
import { SunChart } from "./components/SunChart";
import {
  buildRounds,
  CHART_CONFIG,
  formatPoints,
  type GuessResult,
  MAX_ROUND_POINTS,
  ROUNDS_PER_GAME,
  type Round,
  scoreGuess,
  summarise,
} from "./game";

type Phase = "intro" | "playing" | "reveal" | "summary";

const START_LAT = 40;

export function App() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [guessLat, setGuessLat] = useState(START_LAT);
  const [overlay, setOverlay] = useState(false);
  const [clueShown, setClueShown] = useState(false);
  const [results, setResults] = useState<GuessResult[]>([]);

  const round = rounds[roundIndex];
  const lastResult = results[results.length - 1];
  const score = results.reduce((sum, result) => sum + result.points, 0);

  function startGame() {
    setRounds(buildRounds(Date.now()));
    setRoundIndex(0);
    setResults([]);
    setGuessLat(START_LAT);
    setOverlay(false);
    setClueShown(false);
    setPhase("playing");
  }

  function submitGuess() {
    if (!round) return;
    setResults((previous) => [
      ...previous,
      scoreGuess(round.place.lat, guessLat, {
        overlay,
        clue: clueShown,
      }),
    ]);
    setPhase("reveal");
  }

  function nextRound() {
    if (roundIndex + 1 >= rounds.length) {
      setPhase("summary");
      return;
    }
    setRoundIndex(roundIndex + 1);
    setOverlay(false);
    setClueShown(false);
    setPhase("playing");
  }

  return (
    <div className="app">
      <header>
        <h1>
          <span className="fox">🦊</span> Sunpath
        </h1>
        <p className="tagline">
          One year of sunlight, one unknown place. Guess how far from the
          equator it sits.
        </p>
      </header>

      {phase === "intro" ? <Intro onStart={startGame} /> : null}

      {phase === "playing" && round ? (
        <Playing
          round={round}
          score={score}
          guessLat={guessLat}
          overlay={overlay}
          clueShown={clueShown}
          onGuess={setGuessLat}
          onToggleOverlay={() => setOverlay((on) => !on)}
          onShowClue={() => setClueShown(true)}
          onSubmit={submitGuess}
        />
      ) : null}

      {phase === "reveal" && round && lastResult ? (
        <Reveal
          round={round}
          result={lastResult}
          score={score}
          isLast={roundIndex + 1 >= rounds.length}
          onNext={nextRound}
        />
      ) : null}

      {phase === "summary" ? (
        <Summary rounds={rounds} results={results} onRestart={startGame} />
      ) : null}

      <footer className="muted">
        Sunlight figures come from a standard solar-geometry model: the sun's
        declination after Spencer (1971), sunrise at −0.833° of altitude (upper
        limb with refraction), local mean solar time. Expect about a minute of
        error.
      </footer>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="card">
      <h2>How it works</h2>
      <ul className="rules">
        <li>
          Every round shows one year for a mystery place: either the hours the
          sun is up, or how high it climbs at noon.
        </li>
        <li>
          Move the dial to guess the latitude. The amplitude of the curve is the
          clue: nearly flat means the equator, extreme means a polar circle.
        </li>
        <li>
          Closer is worth more. The reveal names the place and what its sun does
          there.
        </li>
      </ul>
      <p className="muted">
        Eight rounds. Two aids cost points: overlaying your own curve, and a
        coarse latitude band.
      </p>
      <button type="button" className="btn-primary" onClick={onStart}>
        Start
      </button>
    </section>
  );
}

type PlayingProps = {
  round: Round;
  score: number;
  guessLat: number;
  overlay: boolean;
  clueShown: boolean;
  onGuess: (value: number) => void;
  onToggleOverlay: () => void;
  onShowClue: () => void;
  onSubmit: () => void;
};

function Playing({
  round,
  score,
  guessLat,
  overlay,
  clueShown,
  onGuess,
  onToggleOverlay,
  onShowClue,
  onSubmit,
}: PlayingProps) {
  const config = CHART_CONFIG[round.metric];
  const series = sampleSeries(round.place.lat, round.metric);
  const guessProp = overlay
    ? { series: sampleSeries(guessLat, round.metric), label: "Your guess" }
    : undefined;
  const maxPoints = Math.round(
    MAX_ROUND_POINTS * (overlay ? 0.6 : 1) * (clueShown ? 0.5 : 1),
  );

  return (
    <section className="card">
      <div className="row">
        <span className="pill">
          Round {round.index} / {ROUNDS_PER_GAME}
        </span>
        <span className="score">Score {formatPoints(score)}</span>
      </div>

      <h2 className="chart-title">{config.title}</h2>
      <p className="muted">
        Every point is one day of the year. The place is hidden.
      </p>

      <SunChart
        title={config.title}
        config={config}
        series={series}
        {...(guessProp ? { guess: guessProp } : {})}
      />

      <LatitudeDial value={guessLat} onChange={onGuess} />

      <div className="row actions">
        <button
          type="button"
          className="btn-ghost"
          aria-pressed={overlay}
          onClick={onToggleOverlay}
        >
          {overlay ? "Hide my curve" : "Overlay my curve (−40%)"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          aria-pressed={clueShown}
          disabled={clueShown}
          onClick={onShowClue}
        >
          {clueShown ? "Clue shown" : "Clue (−50%)"}
        </button>
        <button type="button" className="btn-primary" onClick={onSubmit}>
          Submit guess
        </button>
      </div>

      <p className="muted">Worth up to {formatPoints(maxPoints)} points.</p>
      {clueShown ? (
        <p className="clue">Clue: {bandClue(round.place.lat)}</p>
      ) : null}
    </section>
  );
}

type RevealProps = {
  round: Round;
  result: GuessResult;
  score: number;
  isLast: boolean;
  onNext: () => void;
};

function Reveal({ round, result, score, isLast, onNext }: RevealProps) {
  const config = CHART_CONFIG[round.metric];
  const series = sampleSeries(round.place.lat, round.metric);
  const stats = placeStats(round.place.lat);

  return (
    <section className="card">
      <div className="row">
        <span className="pill">
          Round {round.index} / {ROUNDS_PER_GAME}
        </span>
        <span className="score">Score {formatPoints(score)}</span>
      </div>

      <h2 className={`verdict ${result.verdict.tone}`}>
        {result.verdict.label}
      </h2>
      <p className="reveal-line">
        {result.deltaDeg.toFixed(1)}° off, {Math.round(result.deltaKm)} km.{" "}
        <strong>
          {formatPoints(result.points)} / {formatPoints(result.maxPoints)}
        </strong>{" "}
        points.
      </p>
      <p className="place-line">
        {round.place.name}, {round.place.country};{" "}
        <strong>{formatLatitude(round.place.lat)}</strong>. You guessed{" "}
        {formatLatitude(result.guessLat)}.
      </p>

      <SunChart
        title={config.title}
        config={config}
        series={series}
        guess={{
          series: sampleSeries(result.guessLat, round.metric),
          label: "Your guess",
        }}
      />

      <ul className="facts">
        <li>
          Longest day: <strong>{formatHours(stats.longestDay.hours)}</strong> on{" "}
          {dayOfYearLabel(stats.longestDay.day)}
        </li>
        <li>
          Shortest day: <strong>{formatHours(stats.shortestDay.hours)}</strong>{" "}
          on {dayOfYearLabel(stats.shortestDay.day)}
        </li>
        <li>
          {stats.polarDay
            ? `Midnight sun: ${dayOfYearLabel(stats.polarDay.start)} to ${dayOfYearLabel(stats.polarDay.end)} (${stats.polarDay.days} days)`
            : "No midnight sun: the sun sets every night of the year."}
        </li>
        <li>
          {stats.polarNight
            ? `Polar night: ${dayOfYearLabel(stats.polarNight.start)} to ${dayOfYearLabel(stats.polarNight.end)} (${stats.polarNight.days} days)`
            : "No polar night: the sun rises every day of the year."}
        </li>
        <li>{round.place.fact}</li>
      </ul>

      <button type="button" className="btn-primary" onClick={onNext}>
        {isLast ? "See results" : "Next round"}
      </button>
    </section>
  );
}

type SummaryProps = {
  rounds: Round[];
  results: GuessResult[];
  onRestart: () => void;
};

function Summary({ rounds, results, onRestart }: SummaryProps) {
  const summary = summarise(results);

  return (
    <section className="card">
      <h2>Result</h2>
      <p className="reveal-line">
        <strong>{formatPoints(summary.total)}</strong> /{" "}
        {formatPoints(summary.max)} points
      </p>
      <p className="muted">
        Average miss {summary.averageDeltaDeg.toFixed(1)}°. {summary.bias}
      </p>

      <table>
        <thead>
          <tr>
            <th>Round</th>
            <th>Place</th>
            <th>Latitude</th>
            <th>Your guess</th>
            <th>Off by</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((round, index) => {
            const result = results[index];
            if (!result) return null;
            return (
              <tr key={round.place.id}>
                <td>{round.index}</td>
                <td>
                  {round.place.name}, {round.place.country}
                </td>
                <td>{formatLatitude(round.place.lat)}</td>
                <td>{formatLatitude(result.guessLat)}</td>
                <td>{result.deltaDeg.toFixed(1)}°</td>
                <td>{formatPoints(result.points)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button type="button" className="btn-primary" onClick={onRestart}>
        Play again
      </button>
    </section>
  );
}
