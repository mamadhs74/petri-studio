using PetriStudio.Api;
using Xunit;

namespace PetriStudio.Tests;

public class NetValidatorTests
{
    [Fact]
    public void Example_net_is_valid()
    {
        var request = new SimulationRequest(Examples.TandemQueue(), 10, 10, 1, null);
        Assert.Empty(NetValidator.Validate(request));
    }

    [Fact]
    public void Arc_between_two_places_is_rejected()
    {
        var net = new PetriNet(
            [new Place("p1", "P1", 1), new Place("p2", "P2", 0)],
            [new Transition("t", "T", 1)],
            [new Arc("bad", "p1", "p2", 1)]);

        var errors = NetValidator.Validate(new SimulationRequest(net, 10, 10, 1, null));

        Assert.Contains(errors, e => e.Contains("'bad'"));
    }

    [Fact]
    public void Non_positive_rate_and_too_many_replications_are_rejected()
    {
        var net = new PetriNet([new Place("p", "P", 1)], [new Transition("t", "T", 0)], []);

        var errors = NetValidator.Validate(new SimulationRequest(net, 10, NetValidator.MaxReplications + 1, 1, null));

        Assert.Equal(2, errors.Count);
    }
}
