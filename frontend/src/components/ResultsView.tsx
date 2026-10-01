import { useId, useMemo } from 'react';
import type { SimulationResult } from '../api/client';
import type { Net } from '../model/net';

interface Props {
  net: Net;
  result: SimulationResult;
  target: { placeId: string; threshold: number } | null;
  horizon: number;
}

// Okabe–Ito palette (colour-blind safe); dash patterns add a second, non-colour cue.
const COLOURS = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9'];
const DASHES = ['', '6 4', '2 3', '10 3 2 3'];

const W = 640;
const H = 260;
const PAD = { left: 44, right: 12, top: 12, bottom: 32 };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

const format = (n: number, digits = 3) =>
  n.toLocaleString('en', { maximumSignificantDigits: digits });

export function ResultsView({ net, result, target, horizon }: Props) {
  const ids = useId();
  const labelOf = (id: string) => net.places.find((p) => p.id === id)?.label ?? id;

  const chart = useMemo(() => {
    const maxY = niceMax(Math.max(...result.series.flatMap((s) => s.points.map((p) => p.mean))));
    const maxX = result.series[0]?.points.at(-1)?.time ?? 1;
    const sx = (t: number) => PAD.left + (t / maxX) * (W - PAD.left - PAD.right);
    const sy = (v: number) => H - PAD.bottom - (v / maxY) * (H - PAD.top - PAD.bottom);
    const paths = result.series.map((s) =>
      s.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.time).toFixed(1)} ${sy(p.mean).toFixed(1)}`)
        .join(' '),
    );
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxX);
    return { paths, yTicks, xTicks, sx, sy };
  }, [result]);

  const p = result.targetProbability;
  const tableRows = result.series[0]?.points.filter((_, i) => i % 10 === 0) ?? [];

  return (
    <section className="panel results" aria-labelledby={`${ids}-h`}>
      <h2 id={`${ids}-h`}>Results</h2>

      {p && target && (
        <p className="estimate">
          Probability that <strong>{labelOf(target.placeId)}</strong> reaches {target.threshold}{' '}
          tokens before time {horizon}: <strong className="number">{format(p.estimate)}</strong>
          <span className="muted">
            {' '}
            (95 % interval {format(p.lower)} to {format(p.upper)}, {p.hits} of {p.replications}{' '}
            runs)
          </span>
        </p>
      )}

      <figure>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${ids}-cap`} className="chart">
          {chart.yTicks.map((v) => (
            <g key={`y${v}`}>
              <line
                className="gridline"
                x1={PAD.left}
                x2={W - PAD.right}
                y1={chart.sy(v)}
                y2={chart.sy(v)}
              />
              <text
                className="tick"
                x={PAD.left - 6}
                y={chart.sy(v)}
                textAnchor="end"
                dominantBaseline="central"
              >
                {format(v, 2)}
              </text>
            </g>
          ))}
          {chart.xTicks.map((t) => (
            <text
              key={`x${t}`}
              className="tick"
              x={chart.sx(t)}
              y={H - PAD.bottom + 18}
              textAnchor="middle"
            >
              {format(t, 3)}
            </text>
          ))}
          {chart.paths.map((d, i) => (
            <path
              key={result.series[i]!.placeId}
              d={d}
              fill="none"
              stroke={COLOURS[i % COLOURS.length]}
              strokeDasharray={DASHES[i % DASHES.length]}
              strokeWidth={2}
            />
          ))}
        </svg>
        <figcaption id={`${ids}-cap`}>
          Mean number of tokens per place over time, averaged over {p?.replications ?? 'all'} runs.
        </figcaption>
        <ul className="legend">
          {result.series.map((s, i) => (
            <li key={s.placeId}>
              <svg width="28" height="10" aria-hidden="true">
                <line
                  x1="0"
                  x2="28"
                  y1="5"
                  y2="5"
                  stroke={COLOURS[i % COLOURS.length]}
                  strokeDasharray={DASHES[i % DASHES.length]}
                  strokeWidth={2}
                />
              </svg>
              {labelOf(s.placeId)}
            </li>
          ))}
        </ul>
      </figure>

      <details>
        <summary>Show values as a table</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Time</th>
                {result.series.map((s) => (
                  <th scope="col" key={s.placeId}>
                    {labelOf(s.placeId)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const index = result.series[0]!.points.indexOf(row);
                return (
                  <tr key={row.time}>
                    <th scope="row">{format(row.time)}</th>
                    {result.series.map((s) => (
                      <td key={s.placeId}>{format(s.points[index]!.mean)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <p className="muted small">
        {result.totalFirings.toLocaleString('en')} transition firings, computed in{' '}
        {format(result.elapsedMs, 3)} ms on the server.
      </p>
    </section>
  );
}
