using PetriStudio.Api;
using Xunit;

namespace PetriStudio.Tests;

public class SimulatorTests
{
    private static SimulationRequest Tandem(int replications = 2000, int seed = 42, TargetCondition? target = null) =>
        new(Examples.TandemQueue(), Horizon: 50, Replications: replications, Seed: seed, Target: target);

    [Fact]
    public void Tokens_are_conserved_in_a_closed_net()
    {
        var result = Simulator.Run(Tandem(replications: 200));

        for (var g = 0; g < Simulator.GridPoints; g++)
        {
            var total = result.Series.Sum(s => s.Points[g].Mean);
            Assert.Equal(10.0, total, precision: 9);
        }
    }

    [Fact]
    public void Same_seed_gives_identical_results()
    {
        var a = Simulator.Run(Tandem(seed: 7));
        var b = Simulator.Run(Tandem(seed: 7));

        Assert.Equal(a.TotalFirings, b.TotalFirings);
        Assert.Equal(a.Series[2].Points[^1].Mean, b.Series[2].Points[^1].Mean);
    }

    [Fact]
    public void Steady_state_queue_lengths_are_close_to_queueing_theory()
    {
        // Utilisation 0.5 and 1/3 give mean queue lengths of about 1 and 0.5.
        // The finite population lowers the arrival rate slightly, so the tolerance is generous.
        var result = Simulator.Run(Tandem(replications: 4000));
        var q1 = result.Series.Single(s => s.PlaceId == "p_q1").Points[^1].Mean;
        var q2 = result.Series.Single(s => s.PlaceId == "p_q2").Points[^1].Mean;

        Assert.InRange(q1, 0.85, 1.15);
        Assert.InRange(q2, 0.40, 0.60);
    }

    [Fact]
    public void Dead_net_keeps_its_initial_marking()
    {
        var net = new PetriNet(
            [new Place("p", "P", 0)],
            [new Transition("t", "T", 1)],
            [new Arc("a", "p", "t", 1)]);

        var result = Simulator.Run(new SimulationRequest(net, 10, 5, 1, null));

        Assert.Equal(0, result.TotalFirings);
        Assert.All(result.Series[0].Points, p => Assert.Equal(0.0, p.Mean));
    }

    [Fact]
    public void Target_probability_has_a_valid_interval()
    {
        var result = Simulator.Run(Tandem(target: new TargetCondition("p_q2", 6)));
        var estimate = result.TargetProbability!;

        Assert.InRange(estimate.Estimate, estimate.Lower, estimate.Upper);
        Assert.True(estimate.Lower >= 0 && estimate.Upper <= 1);
    }

    [Theory]
    [InlineData(0, 100)]
    [InlineData(100, 100)]
    [InlineData(3, 1000)]
    public void Wilson_interval_stays_inside_zero_and_one(int hits, int n)
    {
        var w = Simulator.Wilson(hits, n);

        Assert.InRange(w.Lower, 0, w.Estimate);
        Assert.InRange(w.Upper, w.Estimate, 1);
    }
}
