using System.Diagnostics;

namespace PetriStudio.Api;

/// <summary>
/// Discrete-event simulation of a stochastic Petri net with exponential
/// transitions (race policy), using the Gillespie direct method.
/// Single-server semantics: an enabled transition fires with its base rate.
/// </summary>
public static class Simulator
{
    public const int GridPoints = 101;
    private const long MaxFiringsPerRun = 1_000_000;

    public static SimulationResult Run(SimulationRequest request)
    {
        var stopwatch = Stopwatch.StartNew();
        var compiled = CompiledNet.From(request.Net);
        var rng = new Random(request.Seed);

        var placeCount = compiled.PlaceIds.Length;
        var sums = new double[GridPoints, placeCount];
        var step = request.Horizon / (GridPoints - 1);
        var hits = 0;
        long totalFirings = 0;

        var targetIndex = request.Target is null
            ? -1
            : Array.IndexOf(compiled.PlaceIds, request.Target.PlaceId);

        for (var r = 0; r < request.Replications; r++)
        {
            var marking = (int[])compiled.InitialMarking.Clone();
            var time = 0.0;
            var gridIndex = 0;
            var hit = targetIndex >= 0 && marking[targetIndex] >= request.Target!.Threshold;
            long firings = 0;

            while (true)
            {
                var totalRate = 0.0;
                for (var t = 0; t < compiled.Rates.Length; t++)
                    if (compiled.IsEnabled(t, marking)) totalRate += compiled.Rates[t];

                // Time of next event (infinite if the net is dead).
                var next = totalRate > 0
                    ? time - Math.Log(1.0 - rng.NextDouble()) / totalRate
                    : double.PositiveInfinity;

                // Record the current marking for every grid point before the next event.
                while (gridIndex < GridPoints && gridIndex * step < next)
                {
                    for (var p = 0; p < placeCount; p++) sums[gridIndex, p] += marking[p];
                    gridIndex++;
                }

                if (next > request.Horizon || firings >= MaxFiringsPerRun) break;

                time = next;
                var pick = rng.NextDouble() * totalRate;
                var chosen = -1;
                for (var t = 0; t < compiled.Rates.Length; t++)
                {
                    if (!compiled.IsEnabled(t, marking)) continue;
                    chosen = t;
                    pick -= compiled.Rates[t];
                    if (pick < 0) break;
                }

                compiled.Fire(chosen, marking);
                firings++;
                if (!hit && targetIndex >= 0 && marking[targetIndex] >= request.Target!.Threshold) hit = true;
            }

            // A run stopped by the firing cap still has grid points to fill.
            while (gridIndex < GridPoints)
            {
                for (var p = 0; p < placeCount; p++) sums[gridIndex, p] += marking[p];
                gridIndex++;
            }

            totalFirings += firings;
            if (hit) hits++;
        }

        var series = new List<PlaceSeries>(placeCount);
        for (var p = 0; p < placeCount; p++)
        {
            var points = new SeriesPoint[GridPoints];
            for (var g = 0; g < GridPoints; g++)
                points[g] = new SeriesPoint(g * step, sums[g, p] / request.Replications);
            series.Add(new PlaceSeries(compiled.PlaceIds[p], points));
        }

        var probability = targetIndex >= 0 ? Wilson(hits, request.Replications) : null;
        stopwatch.Stop();
        return new SimulationResult(series, probability, totalFirings, stopwatch.Elapsed.TotalMilliseconds);
    }

    /// <summary>95 % Wilson score interval; behaves sensibly for 0 or n hits.</summary>
    public static ProbabilityEstimate Wilson(int hits, int n)
    {
        const double z = 1.959963984540054;
        var p = (double)hits / n;
        var denominator = 1 + z * z / n;
        var centre = (p + z * z / (2 * n)) / denominator;
        var half = z * Math.Sqrt(p * (1 - p) / n + z * z / (4.0 * n * n)) / denominator;
        // Clamp so floating-point error never puts the estimate outside its own interval.
        return new ProbabilityEstimate(p, Math.Clamp(centre - half, 0, p), Math.Clamp(centre + half, p, 1), hits, n);
    }

    /// <summary>Index-based representation so the inner loop avoids dictionary lookups.</summary>
    private sealed class CompiledNet
    {
        public required string[] PlaceIds { get; init; }
        public required int[] InitialMarking { get; init; }
        public required double[] Rates { get; init; }
        public required (int Place, int Weight)[][] Inputs { get; init; }
        public required (int Place, int Weight)[][] Outputs { get; init; }

        public static CompiledNet From(PetriNet net)
        {
            var placeIndex = net.Places.Select((p, i) => (p.Id, i)).ToDictionary(x => x.Id, x => x.i);
            var transitionIndex = net.Transitions.Select((t, i) => (t.Id, i)).ToDictionary(x => x.Id, x => x.i);

            var inputs = net.Transitions.Select(_ => new List<(int, int)>()).ToArray();
            var outputs = net.Transitions.Select(_ => new List<(int, int)>()).ToArray();
            foreach (var arc in net.Arcs)
            {
                if (placeIndex.TryGetValue(arc.From, out var p) && transitionIndex.TryGetValue(arc.To, out var t))
                    inputs[t].Add((p, arc.Weight));
                else if (transitionIndex.TryGetValue(arc.From, out t) && placeIndex.TryGetValue(arc.To, out p))
                    outputs[t].Add((p, arc.Weight));
            }

            return new CompiledNet
            {
                PlaceIds = net.Places.Select(p => p.Id).ToArray(),
                InitialMarking = net.Places.Select(p => p.Tokens).ToArray(),
                Rates = net.Transitions.Select(t => t.Rate).ToArray(),
                Inputs = inputs.Select(l => l.ToArray()).ToArray(),
                Outputs = outputs.Select(l => l.ToArray()).ToArray(),
            };
        }

        public bool IsEnabled(int t, int[] marking)
        {
            foreach (var (place, weight) in Inputs[t])
                if (marking[place] < weight) return false;
            return true;
        }

        public void Fire(int t, int[] marking)
        {
            foreach (var (place, weight) in Inputs[t]) marking[place] -= weight;
            foreach (var (place, weight) in Outputs[t]) marking[place] += weight;
        }
    }
}
