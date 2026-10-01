export interface PlaceNode {
  kind: 'place';
  id: string;
  label: string;
  tokens: number;
  x: number;
  y: number;
}

export interface TransitionNode {
  kind: 'transition';
  id: string;
  label: string;
  rate: number;
  x: number;
  y: number;
}

export type NetNode = PlaceNode | TransitionNode;

export interface Arc {
  id: string;
  from: string;
  to: string;
  weight: number;
}

export interface Net {
  places: PlaceNode[];
  transitions: TransitionNode[];
  arcs: Arc[];
}

export type NetAction =
  | { type: 'addPlace'; label: string; tokens: number }
  | { type: 'addTransition'; label: string; rate: number }
  | { type: 'addArc'; from: string; to: string; weight: number }
  | {
      type: 'updateNode';
      id: string;
      changes: Partial<Pick<PlaceNode, 'label' | 'tokens'>> & Partial<Pick<TransitionNode, 'rate'>>;
    }
  | { type: 'moveNode'; id: string; x: number; y: number }
  | { type: 'remove'; id: string }
  | { type: 'load'; net: Net };

export const CANVAS = { width: 800, height: 460 } as const;

export function findNode(net: Net, id: string): NetNode | undefined {
  return net.places.find((p) => p.id === id) ?? net.transitions.find((t) => t.id === id);
}

/** Smallest unused id of the form `${prefix}${n}`. */
export function nextId(prefix: string, used: Iterable<string>): string {
  const taken = new Set(used);
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

function allIds(net: Net): string[] {
  return [...net.places, ...net.transitions, ...net.arcs].map((e) => e.id);
}

/** Places a new node on a loose grid so it never lands on top of an existing one. */
function freeSlot(net: Net): { x: number; y: number } {
  const count = net.places.length + net.transitions.length;
  const columns = 6;
  return {
    x: 80 + (count % columns) * 120,
    y: 400 - Math.floor(count / columns) * 90,
  };
}

/** Arcs must connect a place with a transition, in either direction. */
export function arcIsValid(net: Net, from: string, to: string): boolean {
  const a = findNode(net, from);
  const b = findNode(net, to);
  return a !== undefined && b !== undefined && a.kind !== b.kind;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function netReducer(net: Net, action: NetAction): Net {
  switch (action.type) {
    case 'addPlace': {
      const place: PlaceNode = {
        kind: 'place',
        id: nextId('p', allIds(net)),
        label: action.label,
        tokens: Math.max(0, Math.floor(action.tokens)),
        ...freeSlot(net),
      };
      return { ...net, places: [...net.places, place] };
    }
    case 'addTransition': {
      const transition: TransitionNode = {
        kind: 'transition',
        id: nextId('t', allIds(net)),
        label: action.label,
        rate: action.rate,
        ...freeSlot(net),
      };
      return { ...net, transitions: [...net.transitions, transition] };
    }
    case 'addArc': {
      if (!arcIsValid(net, action.from, action.to)) return net;
      const duplicate = net.arcs.some((a) => a.from === action.from && a.to === action.to);
      if (duplicate) return net;
      const arc: Arc = {
        id: nextId('a', allIds(net)),
        from: action.from,
        to: action.to,
        weight: Math.max(1, Math.floor(action.weight)),
      };
      return { ...net, arcs: [...net.arcs, arc] };
    }
    case 'updateNode':
      return {
        ...net,
        places: net.places.map((p) =>
          p.id === action.id
            ? {
                ...p,
                label: action.changes.label ?? p.label,
                tokens: action.changes.tokens ?? p.tokens,
              }
            : p,
        ),
        transitions: net.transitions.map((t) =>
          t.id === action.id
            ? { ...t, label: action.changes.label ?? t.label, rate: action.changes.rate ?? t.rate }
            : t,
        ),
      };
    case 'moveNode': {
      const x = clamp(action.x, 30, CANVAS.width - 30);
      const y = clamp(action.y, 30, CANVAS.height - 30);
      return {
        ...net,
        places: net.places.map((p) => (p.id === action.id ? { ...p, x, y } : p)),
        transitions: net.transitions.map((t) => (t.id === action.id ? { ...t, x, y } : t)),
      };
    }
    case 'remove':
      return {
        places: net.places.filter((p) => p.id !== action.id),
        transitions: net.transitions.filter((t) => t.id !== action.id),
        // Removing a node also removes every arc attached to it.
        arcs: net.arcs.filter(
          (a) => a.id !== action.id && a.from !== action.id && a.to !== action.id,
        ),
      };
    case 'load':
      return action.net;
  }
}

/** Mirrors the backend validation so problems show up before a request is sent. */
export function validateNet(net: Net): string[] {
  const errors: string[] = [];
  if (net.places.length === 0) errors.push('Add at least one place.');
  if (net.transitions.length === 0) errors.push('Add at least one transition.');
  for (const p of net.places) {
    if (!Number.isInteger(p.tokens) || p.tokens < 0)
      errors.push(`${p.label}: tokens must be a whole number of 0 or more.`);
  }
  for (const t of net.transitions) {
    if (!(t.rate > 0) || !Number.isFinite(t.rate))
      errors.push(`${t.label}: rate must be greater than 0.`);
  }
  const isolated = net.transitions.filter(
    (t) => !net.arcs.some((a) => a.from === t.id || a.to === t.id),
  );
  for (const t of isolated) errors.push(`${t.label} has no arcs, so it can never change anything.`);
  return errors;
}
