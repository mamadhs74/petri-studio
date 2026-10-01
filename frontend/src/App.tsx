import { useMemo, useReducer, useState } from 'react';
import type { SimulationSettings } from './api/client';
import { Inspector } from './components/Inspector';
import { NetCanvas } from './components/NetCanvas';
import { ResultsView } from './components/ResultsView';
import { SimulationPanel } from './components/SimulationPanel';
import { StructurePanel } from './components/StructurePanel';
import { useSimulation } from './hooks/useSimulation';
import { tandemQueue } from './model/examples';
import { netReducer, validateNet } from './model/net';

const EMPTY = { places: [], transitions: [], arcs: [] };

export default function App() {
  const [net, dispatch] = useReducer(netReducer, tandemQueue);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSettings, setLastSettings] = useState<SimulationSettings | null>(null);
  const { state, run } = useSimulation();
  const problems = useMemo(() => validateNet(net), [net]);

  function handleRun(settings: SimulationSettings) {
    setLastSettings(settings);
    void run(net, settings);
  }

  return (
    <>
      <header className="topbar">
        <h1>Petri Studio</h1>
        <p className="tagline">
          Model a stochastic Petri net and estimate how it behaves over time.
        </p>
        <div className="topbar-actions">
          <button
            type="button"
            className="button-quiet"
            onClick={() => dispatch({ type: 'load', net: tandemQueue })}
          >
            Load tandem queue
          </button>
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              dispatch({ type: 'load', net: EMPTY });
              setSelectedId(null);
            }}
          >
            Start empty
          </button>
        </div>
      </header>

      <main className="layout">
        <div className="workspace">
          <NetCanvas
            net={net}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dispatch={dispatch}
          />
          <div role="status" aria-live="polite" className="status">
            {state.status === 'running' && 'Simulation running…'}
            {state.status === 'failed' && (
              <div className="error">
                <strong>{state.message}</strong>
                {state.details.length > 0 && (
                  <ul>
                    {state.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {state.status === 'done' && lastSettings && (
            <ResultsView
              net={net}
              result={state.result}
              target={lastSettings.target}
              horizon={lastSettings.horizon}
            />
          )}
        </div>

        <aside className="sidebar" aria-label="Model settings">
          <Inspector
            net={net}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dispatch={dispatch}
          />
          <SimulationPanel
            net={net}
            problems={problems}
            running={state.status === 'running'}
            onRun={handleRun}
          />
          <StructurePanel net={net} dispatch={dispatch} />
        </aside>
      </main>
    </>
  );
}
