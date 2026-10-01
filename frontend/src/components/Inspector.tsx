import { useId } from 'react';
import { findNode, type Net, type NetAction } from '../model/net';

interface Props {
  net: Net;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  dispatch: (action: NetAction) => void;
}

/** Edits the selected node. A plain form is the accessible alternative to editing on the canvas. */
export function Inspector({ net, selectedId, onSelect, dispatch }: Props) {
  const ids = useId();
  const node = selectedId ? findNode(net, selectedId) : undefined;

  if (!node) {
    return (
      <section className="panel" aria-labelledby={`${ids}-h`}>
        <h2 id={`${ids}-h`}>Selection</h2>
        <p className="muted">Select a place or transition on the canvas to edit it.</p>
      </section>
    );
  }

  const name = node.kind === 'place' ? 'place' : 'transition';
  return (
    <section className="panel" aria-labelledby={`${ids}-h`}>
      <h2 id={`${ids}-h`}>Edit {name}</h2>
      <div className="field">
        <label htmlFor={`${ids}-label`}>Name</label>
        <input
          id={`${ids}-label`}
          value={node.label}
          onChange={(e) =>
            dispatch({ type: 'updateNode', id: node.id, changes: { label: e.target.value } })
          }
        />
      </div>
      {node.kind === 'place' ? (
        <div className="field">
          <label htmlFor={`${ids}-tokens`}>Initial tokens</label>
          <input
            id={`${ids}-tokens`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={node.tokens}
            onChange={(e) =>
              dispatch({
                type: 'updateNode',
                id: node.id,
                changes: { tokens: e.target.valueAsNumber || 0 },
              })
            }
          />
        </div>
      ) : (
        <div className="field">
          <label htmlFor={`${ids}-rate`}>Firing rate λ (per time unit)</label>
          <input
            id={`${ids}-rate`}
            type="number"
            min={0.001}
            step="any"
            inputMode="decimal"
            value={node.rate}
            onChange={(e) =>
              dispatch({
                type: 'updateNode',
                id: node.id,
                changes: { rate: e.target.valueAsNumber },
              })
            }
          />
        </div>
      )}
      <button
        type="button"
        className="button-quiet danger"
        onClick={() => {
          dispatch({ type: 'remove', id: node.id });
          onSelect(null);
        }}
      >
        Delete {name}
      </button>
    </section>
  );
}
