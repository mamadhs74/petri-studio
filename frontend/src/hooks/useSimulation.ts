import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, simulate, type SimulationResult, type SimulationSettings } from '../api/client';
import type { Net } from '../model/net';

type State =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: SimulationResult }
  | { status: 'failed'; message: string; details: string[] };

/** Runs one simulation at a time; starting a new run cancels the previous request. */
export function useSimulation() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async (net: Net, settings: SimulationSettings) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ status: 'running' });
    try {
      const result = await simulate(net, settings, current.signal);
      if (!current.signal.aborted) setState({ status: 'done', result });
    } catch (error) {
      if (current.signal.aborted) return;
      setState(
        error instanceof ApiError
          ? { status: 'failed', message: error.message, details: error.details }
          : { status: 'failed', message: 'Something unexpected went wrong.', details: [] },
      );
    }
  }, []);

  return { state, run };
}
