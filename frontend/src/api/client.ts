import type { Net } from '../model/net';

export interface SimulationSettings {
  horizon: number;
  replications: number;
  seed: number;
  target: { placeId: string; threshold: number } | null;
}

export interface SimulationResult {
  series: { placeId: string; points: { time: number; mean: number }[] }[];
  targetProbability: {
    estimate: number;
    lower: number;
    upper: number;
    hits: number;
    replications: number;
  } | null;
  totalFirings: number;
  elapsedMs: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Strips layout fields so the request matches the backend contract exactly. */
export function toRequest(net: Net, settings: SimulationSettings) {
  return {
    net: {
      places: net.places.map(({ id, label, tokens }) => ({ id, label, tokens })),
      transitions: net.transitions.map(({ id, label, rate }) => ({ id, label, rate })),
      arcs: net.arcs.map(({ id, from, to, weight }) => ({ id, from, to, weight })),
    },
    ...settings,
  };
}

export async function simulate(
  net: Net,
  settings: SimulationSettings,
  signal?: AbortSignal,
): Promise<SimulationResult> {
  let response: Response;
  try {
    response = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRequest(net, settings)),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('The simulation service is not reachable. Start the backend and try again.');
  }

  if (response.ok) return (await response.json()) as SimulationResult;

  // ASP.NET Core returns RFC 9457 problem details for validation errors.
  const problem = (await response.json().catch(() => null)) as {
    title?: string;
    errors?: Record<string, string[]>;
  } | null;
  throw new ApiError(
    problem?.title ?? `The simulation failed (HTTP ${response.status}).`,
    Object.values(problem?.errors ?? {}).flat(),
  );
}
