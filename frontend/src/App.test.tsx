import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { SimulationResult } from './api/client';

const result: SimulationResult = {
  series: ['p_source', 'p_q1', 'p_q2'].map((placeId, i) => ({
    placeId,
    points: Array.from({ length: 101 }, (_, g) => ({
      time: g / 2,
      mean: i === 0 ? 10 - g / 50 : g / 100,
    })),
  })),
  targetProbability: { estimate: 0.085, lower: 0.074, upper: 0.098, hits: 170, replications: 2000 },
  totalFirings: 295954,
  elapsedMs: 61,
};

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('has no detectable accessibility violations', async () => {
    const { container } = render(<App />);
    // Colour contrast needs real layout, which jsdom does not provide.
    const report = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(report.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it('adds a place from the form and shows it on the canvas', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('New place'), 'Buffer');
    await user.click(screen.getByRole('button', { name: 'Add place' }));

    expect(screen.getByRole('button', { name: 'Place Buffer, 0 tokens' })).toBeInTheDocument();
  });

  it('moves a node with the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    const node = screen.getByRole('button', { name: /Place Queue 1/ });

    act(() => node.focus());
    const before = node.getAttribute('transform');
    await user.keyboard('{ArrowRight}');

    expect(node.getAttribute('transform')).not.toBe(before);
  });

  it('disables the run button while the net has problems', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Start empty' }));

    expect(screen.getByRole('button', { name: 'Run simulation' })).toBeDisabled();
    expect(screen.getByText('Add at least one place.')).toBeInTheDocument();
  });

  it('runs a simulation and reports the estimate', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Run simulation' }));

    const results = await screen.findByRole('region', { name: 'Results' });
    expect(within(results).getByText('0.085')).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body.target).toEqual({ placeId: 'p_q2', threshold: 6 });
  });

  it('shows backend validation messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            title: 'The net cannot be simulated.',
            errors: { net: ['Horizon must be between 0 and 1000000.'] },
          }),
          {
            status: 400,
          },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Run simulation' }));

    expect(await screen.findByText('Horizon must be between 0 and 1000000.')).toBeInTheDocument();
  });
});
