import { memo, useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { CANVAS, findNode, type Net, type NetAction, type NetNode } from '../model/net';
import { arcSegment, PLACE_RADIUS, TRANSITION_SIZE } from './geometry';

interface Props {
  net: Net;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  dispatch: (action: NetAction) => void;
}

const STEP = 10;
const BIG_STEP = 40;

function describe(node: NetNode): string {
  return node.kind === 'place'
    ? `Place ${node.label}, ${node.tokens} ${node.tokens === 1 ? 'token' : 'tokens'}`
    : `Transition ${node.label}, rate ${node.rate}`;
}

/** Up to four tokens are drawn as dots, more as a number, as is usual in Petri net notation. */
function Tokens({ count }: { count: number }) {
  if (count === 0) return null;
  if (count > 4) {
    return (
      <text className="token-count" textAnchor="middle" dominantBaseline="central">
        {count}
      </text>
    );
  }
  const offsets: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [
      [-7, 0],
      [7, 0],
    ],
    3: [
      [-7, 6],
      [7, 6],
      [0, -6],
    ],
    4: [
      [-7, -7],
      [7, -7],
      [-7, 7],
      [7, 7],
    ],
  };
  return (
    <>
      {offsets[count]!.map(([x, y], i) => (
        <circle key={i} className="token" cx={x} cy={y} r={4.5} />
      ))}
    </>
  );
}

interface NodeProps {
  node: NetNode;
  selected: boolean;
  onSelect: (id: string) => void;
  onPointerDown: (event: PointerEvent<SVGGElement>, node: NetNode) => void;
  onKeyDown: (event: KeyboardEvent<SVGGElement>, node: NetNode) => void;
}

const NodeView = memo(function NodeView({
  node,
  selected,
  onSelect,
  onPointerDown,
  onKeyDown,
}: NodeProps) {
  return (
    <g
      className={`node node-${node.kind}${selected ? ' is-selected' : ''}`}
      transform={`translate(${node.x} ${node.y})`}
      role="button"
      tabIndex={0}
      aria-label={describe(node)}
      aria-pressed={selected}
      onPointerDown={(e) => onPointerDown(e, node)}
      onKeyDown={(e) => onKeyDown(e, node)}
      onFocus={() => onSelect(node.id)}
    >
      {node.kind === 'place' ? (
        <>
          <circle className="shape" r={PLACE_RADIUS} />
          <Tokens count={node.tokens} />
        </>
      ) : (
        <rect
          className="shape"
          x={-TRANSITION_SIZE.width / 2}
          y={-TRANSITION_SIZE.height / 2}
          width={TRANSITION_SIZE.width}
          height={TRANSITION_SIZE.height}
        />
      )}
      <text
        className="node-label"
        y={node.kind === 'place' ? PLACE_RADIUS + 18 : TRANSITION_SIZE.height / 2 + 18}
        textAnchor="middle"
      >
        {node.label}
      </text>
      {node.kind === 'transition' && (
        <text className="node-rate" y={-TRANSITION_SIZE.height / 2 - 8} textAnchor="middle">
          λ = {node.rate}
        </text>
      )}
    </g>
  );
});

export function NetCanvas({ net, selectedId, onSelect, dispatch }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const nodes: NetNode[] = useMemo(
    () => [...net.places, ...net.transitions],
    [net.places, net.transitions],
  );

  const arcs = useMemo(
    () =>
      net.arcs.flatMap((arc) => {
        const from = findNode(net, arc.from);
        const to = findNode(net, arc.to);
        if (!from || !to) return [];
        const seg = arcSegment(from, to);
        return [{ arc, seg, label: `${from.label} to ${to.label}` }];
      }),
    [net],
  );

  /** Converts a pointer position into SVG user coordinates (the viewBox scales with the layout). */
  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM?.();
    if (!svg || !matrix) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function handlePointerDown(event: PointerEvent<SVGGElement>, node: NetNode) {
    onSelect(node.id);
    const point = toSvgPoint(event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: node.id, dx: point.x - node.x, dy: point.y - node.y };
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const point = toSvgPoint(event.clientX, event.clientY);
    if (!point) return;
    dispatch({
      type: 'moveNode',
      id: drag.current.id,
      x: point.x - drag.current.dx,
      y: point.y - drag.current.dy,
    });
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>, node: NetNode) {
    const step = event.shiftKey ? BIG_STEP : STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      dispatch({ type: 'moveNode', id: node.id, x: node.x + move[0], y: node.y + move[1] });
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      dispatch({ type: 'remove', id: node.id });
      onSelect(null);
    } else if (event.key === 'Escape') {
      onSelect(null);
    }
  }

  return (
    <figure className="canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
        role="group"
        aria-label="Petri net editor. Tab to a place or transition, move it with the arrow keys, remove it with Delete."
        onPointerMove={handlePointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onPointerDown={(e) => e.target === e.currentTarget && onSelect(null)}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" className="arrowhead" />
          </marker>
        </defs>
        <g aria-hidden="true">
          {arcs.map(({ arc, seg }) => (
            <g key={arc.id} className="arc">
              <line {...seg} markerEnd="url(#arrow)" />
              {arc.weight > 1 && (
                <text
                  className="arc-weight"
                  x={(seg.x1 + seg.x2) / 2}
                  y={(seg.y1 + seg.y2) / 2 - 6}
                  textAnchor="middle"
                >
                  {arc.weight}
                </text>
              )}
            </g>
          ))}
        </g>
        {nodes.map((node) => (
          <NodeView
            key={node.id}
            node={node}
            selected={node.id === selectedId}
            onSelect={onSelect}
            onPointerDown={handlePointerDown}
            onKeyDown={handleKeyDown}
          />
        ))}
      </svg>
      <figcaption className="hint">
        Drag nodes to arrange the net. Keyboard: Tab to a node, arrow keys to move, Shift for larger
        steps.
      </figcaption>
    </figure>
  );
}
