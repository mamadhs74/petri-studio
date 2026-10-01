using System.Text.Json;
using PetriStudio.Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase);

var app = builder.Build();
app.UseExceptionHandler();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/examples/tandem-queue", () => Results.Ok(Examples.TandemQueue()));

app.MapPost("/api/simulate", (SimulationRequest request) =>
{
    var errors = NetValidator.Validate(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(
            new Dictionary<string, string[]> { ["net"] = errors.ToArray() },
            title: "The net cannot be simulated.");
    }

    return Results.Ok(Simulator.Run(request));
});

app.Run();

// Exposed for integration tests (WebApplicationFactory).
public partial class Program;
