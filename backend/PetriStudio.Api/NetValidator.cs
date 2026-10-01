namespace PetriStudio.Api;

public static class NetValidator
{
    public const int MaxReplications = 10_000;
    public const double MaxHorizon = 1_000_000;

    /// <summary>Returns a list of human-readable problems; empty means valid.</summary>
    public static IReadOnlyList<string> Validate(SimulationRequest request)
    {
        var errors = new List<string>();
        var net = request.Net;

        if (net.Places.Count == 0) errors.Add("The net needs at least one place.");
        if (net.Transitions.Count == 0) errors.Add("The net needs at least one transition.");

        var placeIds = new HashSet<string>();
        foreach (var p in net.Places)
        {
            if (!placeIds.Add(p.Id)) errors.Add($"Duplicate place id '{p.Id}'.");
            if (p.Tokens < 0) errors.Add($"Place '{p.Label}' has a negative token count.");
        }

        var transitionIds = new HashSet<string>();
        foreach (var t in net.Transitions)
        {
            if (!transitionIds.Add(t.Id)) errors.Add($"Duplicate transition id '{t.Id}'.");
            if (placeIds.Contains(t.Id)) errors.Add($"Id '{t.Id}' is used by a place and a transition.");
            if (!(t.Rate > 0) || double.IsInfinity(t.Rate))
                errors.Add($"Transition '{t.Label}' needs a positive, finite rate.");
        }

        foreach (var a in net.Arcs)
        {
            if (a.Weight < 1) errors.Add($"Arc '{a.Id}' needs a weight of at least 1.");
            var placeToTransition = placeIds.Contains(a.From) && transitionIds.Contains(a.To);
            var transitionToPlace = transitionIds.Contains(a.From) && placeIds.Contains(a.To);
            if (!placeToTransition && !transitionToPlace)
                errors.Add($"Arc '{a.Id}' must connect a place and a transition.");
        }

        if (!(request.Horizon > 0) || request.Horizon > MaxHorizon)
            errors.Add($"Horizon must be between 0 and {MaxHorizon}.");
        if (request.Replications < 1 || request.Replications > MaxReplications)
            errors.Add($"Replications must be between 1 and {MaxReplications}.");

        if (request.Target is { } target)
        {
            if (!placeIds.Contains(target.PlaceId)) errors.Add($"Target place '{target.PlaceId}' does not exist.");
            if (target.Threshold < 0) errors.Add("Target threshold must not be negative.");
        }

        return errors;
    }
}
