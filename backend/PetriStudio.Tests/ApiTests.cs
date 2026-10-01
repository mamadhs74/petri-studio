using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using PetriStudio.Api;
using Xunit;

namespace PetriStudio.Tests;

public class ApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Simulate_returns_series_for_every_place()
    {
        var net = await _client.GetFromJsonAsync<PetriNet>("/api/examples/tandem-queue");
        var response = await _client.PostAsJsonAsync("/api/simulate", new SimulationRequest(net!, 20, 100, 1, null));

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<SimulationResult>();
        Assert.Equal(3, result!.Series.Count);
    }

    [Fact]
    public async Task Invalid_net_returns_problem_details()
    {
        var empty = new PetriNet([], [], []);
        var response = await _client.PostAsJsonAsync("/api/simulate", new SimulationRequest(empty, 10, 10, 1, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}
