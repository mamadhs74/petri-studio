import { useId, useState, type FormEvent } from 'react';
import { arcIsValid, findNode, type Net, type NetAction } from '../model/net';

interface Props {
  net: Net;
  dispatch: (action: NetAction) => void;
}

/** Adds places, transitions and arcs, and lists arcs so they can be removed without a mouse. */
export function StructurePanel({ net, dispatch }: Props) {
  const ids = useId();
  const [placeLabel, setPlaceLabel] = useState('');
  const [transitionLabel, setTransitionLabel] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [weight, setWeight] = useState(1);

  const nodes = [...net.places, ...net.transitions];
  const fromNode = findNode(net, from);
  // Only offer targets of the other kind, so an invalid arc cannot be built.
  const targets = fromNode ? (fromNode.kind === 'place' ? net.transitions : net.places) : [];

  function addPlace(e: FormEvent) {
    e.preventDefault();
    dispatch({ type: 'addPlace', label: placeLabel.trim() || 'New place', tokens: 0 });
    setPlaceLabel('');
  }

  function addTransition(e: FormEvent) {
    e.preventDefault();
    dispatch({ type: 'addTransition', label: transitionLabel.trim() || 'New transition', rate: 1 });
    setTransitionLabel('');
  }

  function addArc(e: FormEvent) {
    e.preventDefault();
    if (!arcIsValid(net, from, to)) return;
    dispatch({ type: 'addArc', from, to, weight });
    setTo('');
  }

  return (
    <section className="panel" aria-labelledby={`${ids}-h`}>
      <h2 id={`${ids}-h`}>Structure</h2>

      <form className="inline-form" onSubmit={addPlace}>
        <label htmlFor={`${ids}-place`}>New place</label>
        <input
          id={`${ids}-place`}
          value={placeLabel}
          placeholder="e.g. Buffer"
          onChange={(e) => setPlaceLabel(e.target.value)}
        />
        <button type="submit">Add place</button>
      </form>

      <form className="inline-form" onSubmit={addTransition}>
        <label htmlFor={`${ids}-transition`}>New transition</label>
        <input
          id={`${ids}-transition`}
          value={transitionLabel}
          placeholder="e.g. Repair"
          onChange={(e) => setTransitionLabel(e.target.value)}
        />
        <button type="submit">Add transition</button>
      </form>

      <form className="arc-form" onSubmit={addArc}>
        <fieldset>
          <legend>New arc</legend>
          <div className="field">
            <label htmlFor={`${ids}-from`}>From</label>
            <select
              id={`${ids}-from`}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setTo('');
              }}
            >
              <option value="">Choose a node</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({n.kind})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${ids}-to`}>To</label>
            <select
              id={`${ids}-to`}
              value={to}
              disabled={!fromNode}
              onChange={(e) => setTo(e.target.value)}
            >
              <option value="">{fromNode ? 'Choose a node' : 'Choose “From” first'}</option>
              {targets.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field field-narrow">
            <label htmlFor={`${ids}-weight`}>Weight</label>
            <input
              id={`${ids}-weight`}
              type="number"
              min={1}
              step={1}
              value={weight}
              onChange={(e) => setWeight(Math.max(1, e.target.valueAsNumber || 1))}
            />
          </div>
          <button type="submit" disabled={!arcIsValid(net, from, to)}>
            Add arc
          </button>
        </fieldset>
      </form>

      <h3>Arcs</h3>
      {net.arcs.length === 0 ? (
        <p className="muted">No arcs yet.</p>
      ) : (
        <ul className="arc-list">
          {net.arcs.map((arc) => (
            <li key={arc.id}>
              <span>
                {findNode(net, arc.from)?.label} → {findNode(net, arc.to)?.label}
                {arc.weight > 1 && <span className="muted"> ×{arc.weight}</span>}
              </span>
              <button
                type="button"
                className="button-quiet"
                aria-label={`Remove arc from ${findNode(net, arc.from)?.label} to ${findNode(net, arc.to)?.label}`}
                onClick={() => dispatch({ type: 'remove', id: arc.id })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
