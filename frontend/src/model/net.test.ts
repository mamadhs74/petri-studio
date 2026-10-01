import { describe, expect, it } from 'vitest';
import { tandemQueue } from './examples';
import { netReducer, nextId, validateNet, type Net } from './net';

const empty: Net = { places: [], transitions: [], arcs: [] };

describe('netReducer', () => {
  it('gives new nodes unique ids', () => {
    let net = netReducer(empty, { type: 'addPlace', label: 'A', tokens: 2 });
    net = netReducer(net, { type: 'addPlace', label: 'B', tokens: 0 });
    expect(net.places.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('rejects an arc between two places', () => {
    const net = netReducer(tandemQueue, { type: 'addArc', from: 'p_q1', to: 'p_q2', weight: 1 });
    expect(net).toBe(tandemQueue);
  });

  it('rejects a duplicate arc', () => {
    const net = netReducer(tandemQueue, {
      type: 'addArc',
      from: 'p_source',
      to: 't_arrive',
      weight: 1,
    });
    expect(net.arcs).toHaveLength(tandemQueue.arcs.length);
  });

  it('removes attached arcs together with a node', () => {
    const net = netReducer(tandemQueue, { type: 'remove', id: 'p_q1' });
    expect(net.places.some((p) => p.id === 'p_q1')).toBe(false);
    expect(net.arcs.some((a) => a.from === 'p_q1' || a.to === 'p_q1')).toBe(false);
    expect(net.arcs).toHaveLength(4);
  });

  it('keeps moved nodes inside the canvas', () => {
    const net = netReducer(tandemQueue, { type: 'moveNode', id: 'p_q1', x: -500, y: 9999 });
    const moved = net.places.find((p) => p.id === 'p_q1')!;
    expect(moved.x).toBe(30);
    expect(moved.y).toBeLessThan(9999);
  });

  it('does not mutate the previous state', () => {
    const before = structuredClone(tandemQueue);
    netReducer(tandemQueue, { type: 'updateNode', id: 't_arrive', changes: { rate: 5 } });
    expect(tandemQueue).toEqual(before);
  });
});

describe('nextId', () => {
  it('fills the first gap', () => {
    expect(nextId('p', ['p1', 'p3'])).toBe('p2');
  });
});

describe('validateNet', () => {
  it('accepts the example net', () => {
    expect(validateNet(tandemQueue)).toEqual([]);
  });

  it('reports a zero rate and an unconnected transition', () => {
    const net = netReducer(tandemQueue, { type: 'addTransition', label: 'Idle', rate: 0 });
    const problems = validateNet(net);
    expect(problems).toContain('Idle: rate must be greater than 0.');
    expect(problems.some((p) => p.startsWith('Idle has no arcs'))).toBe(true);
  });
});
