import { afterEach, describe, expect, it, vi } from 'vitest';
import { tandemQueue } from '../model/examples';
import { ApiError, simulate, toRequest } from './client';

const settings = { horizon: 10, replications: 5, seed: 1, target: null };

afterEach(() => vi.unstubAllGlobals());

describe('toRequest', () => {
  it('drops layout fields the backend does not know', () => {
    const body = toRequest(tandemQueue, settings);
    expect(body.net.places[0]).toEqual({ id: 'p_source', label: 'Customers outside', tokens: 10 });
  });
});

describe('simulate', () => {
  it('turns problem details into an ApiError with every message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ title: 'The net cannot be simulated.', errors: { net: ['A', 'B'] } }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    );

    const error = await simulate(tandemQueue, settings).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).details).toEqual(['A', 'B']);
  });

  it('explains when the backend is not running', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(simulate(tandemQueue, settings)).rejects.toThrow(/not reachable/);
  });
});
