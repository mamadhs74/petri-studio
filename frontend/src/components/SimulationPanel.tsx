import { useId, useState, type FormEvent } from 'react';
import type { SimulationSettings } from '../api/client';
import type { Net } from '../model/net';

interface Props {
  net: Net;
  problems: string[];
  running: boolean;
  onRun: (settings: SimulationSettings) => void;
}

export function SimulationPanel({ net, problems, running, onRun }: Props) {
  const ids = useId();
  const [horizon, setHorizon] = useState(50);
  const [replications, setReplications] = useState(2000);
  const [seed, setSeed] = useState(42);
  const [targetPlace, setTargetPlace] = useState('p_q2');
  const [threshold, setThreshold] = useState(6);

  // The target may point at a place that was deleted in the meantime.
  const targetExists = net.places.some((p) => p.id === targetPlace);

  function submit(e: FormEvent) {
    e.preventDefault();
    onRun({
      horizon,
      replications,
      seed,
      target: targetExists ? { placeId: targetPlace, threshold } : null,
    });
  }

  return (
    <section className="panel" aria-labelledby={`${ids}-h`}>
      <h2 id={`${ids}-h`}>Simulation</h2>
      <form onSubmit={submit} className="sim-form">
        <div className="field">
          <label htmlFor={`${ids}-horizon`}>Time horizon</label>
          <input
            id={`${ids}-horizon`}
            type="number"
            min={1}
            step="any"
            value={horizon}
            onChange={(e) => setHorizon(e.target.valueAsNumber)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${ids}-reps`}>Replications</label>
          <input
            id={`${ids}-reps`}
            type="number"
            min={1}
            max={10000}
            step={1}
            value={replications}
            onChange={(e) => setReplications(e.target.valueAsNumber)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${ids}-seed`}>Random seed</label>
          <input
            id={`${ids}-seed`}
            type="number"
            step={1}
            value={seed}
            onChange={(e) => setSeed(e.target.valueAsNumber)}
          />
        </div>
        <fieldset>
          <legend>Event to estimate (optional)</legend>
          <div className="field">
            <label htmlFor={`${ids}-target`}>Place</label>
            <select
              id={`${ids}-target`}
              value={targetExists ? targetPlace : ''}
              onChange={(e) => setTargetPlace(e.target.value)}
            >
              <option value="">No event</option>
              {net.places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field field-narrow">
            <label htmlFor={`${ids}-threshold`}>reaches at least</label>
            <input
              id={`${ids}-threshold`}
              type="number"
              min={0}
              step={1}
              value={threshold}
              disabled={!targetExists}
              onChange={(e) => setThreshold(e.target.valueAsNumber)}
            />
          </div>
        </fieldset>

        {problems.length > 0 && (
          <ul className="problems" aria-label="Fix these before running">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}

        <button type="submit" className="button-primary" disabled={running || problems.length > 0}>
          {running ? 'Running…' : 'Run simulation'}
        </button>
      </form>
    </section>
  );
}
