import { formatLatitude } from "../astronomy";

export type LatitudeDialProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const TICKS = ["90° S", "60° S", "30° S", "Equator", "30° N", "60° N", "90° N"];

/**
 * A plain range input: keyboard, screen reader and touch all work, and the
 * readout above it is the number the score is computed from.
 */
export function LatitudeDial({ value, onChange, disabled }: LatitudeDialProps) {
  return (
    <div className="dial">
      <div className="row">
        <div>
          <span className="muted">Your guess</span>
          <div className="dial-readout">{formatLatitude(value)}</div>
        </div>
        <span className="muted">Slider, or arrow keys for half a degree</span>
      </div>
      <input
        type="range"
        min={-90}
        max={90}
        step={0.5}
        value={value}
        disabled={disabled}
        aria-label="Your latitude guess"
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="ticks">
        {TICKS.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}
