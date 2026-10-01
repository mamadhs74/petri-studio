namespace PetriStudio.Api;

/// <summary>A place holds tokens.</summary>
public sealed record Place(string Id, string Label, int Tokens);

/// <summary>A timed transition with an exponentially distributed firing delay.</summary>
public sealed record Transition(string Id, string Label, double Rate);

/// <summary>
/// A directed, weighted arc. Either place -> transition (input arc)
/// or transition -> place (output arc).
/// </summary>
public sealed record Arc(string Id, string From, string To, int Weight);

public sealed record PetriNet(
    IReadOnlyList<Place> Places,
    IReadOnlyList<Transition> Transitions,
    IReadOnlyList<Arc> Arcs);

/// <summary>Condition "tokens in place &gt;= threshold" whose probability we estimate.</summary>
public sealed record TargetCondition(string PlaceId, int Threshold);

public sealed record SimulationRequest(
    PetriNet Net,
    double Horizon,
    int Replications,
    int Seed,
    TargetCondition? Target);

public sealed record SeriesPoint(double Time, double Mean);

public sealed record PlaceSeries(string PlaceId, IReadOnlyList<SeriesPoint> Points);

/// <summary>Point estimate plus 95 % Wilson score interval.</summary>
public sealed record ProbabilityEstimate(
    double Estimate,
    double Lower,
    double Upper,
    int Hits,
    int Replications);

public sealed record SimulationResult(
    IReadOnlyList<PlaceSeries> Series,
    ProbabilityEstimate? TargetProbability,
    long TotalFirings,
    double ElapsedMs);
