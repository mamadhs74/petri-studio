import type { Net } from './net';

/** Two queues in tandem with ten customers. Mirrors the backend example, plus layout. */
export const tandemQueue: Net = {
  places: [
    { kind: 'place', id: 'p_source', label: 'Customers outside', tokens: 10, x: 110, y: 230 },
    { kind: 'place', id: 'p_q1', label: 'Queue 1', tokens: 0, x: 370, y: 120 },
    { kind: 'place', id: 'p_q2', label: 'Queue 2', tokens: 0, x: 630, y: 230 },
  ],
  transitions: [
    { kind: 'transition', id: 't_arrive', label: 'Arrival', rate: 1, x: 240, y: 120 },
    { kind: 'transition', id: 't_serve1', label: 'Service 1', rate: 2, x: 500, y: 120 },
    { kind: 'transition', id: 't_serve2', label: 'Service 2', rate: 3, x: 370, y: 350 },
  ],
  arcs: [
    { id: 'a1', from: 'p_source', to: 't_arrive', weight: 1 },
    { id: 'a2', from: 't_arrive', to: 'p_q1', weight: 1 },
    { id: 'a3', from: 'p_q1', to: 't_serve1', weight: 1 },
    { id: 'a4', from: 't_serve1', to: 'p_q2', weight: 1 },
    { id: 'a5', from: 'p_q2', to: 't_serve2', weight: 1 },
    { id: 'a6', from: 't_serve2', to: 'p_source', weight: 1 },
  ],
};
