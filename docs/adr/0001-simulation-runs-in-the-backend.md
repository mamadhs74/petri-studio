# ADR 0001: The simulation runs in the ASP.NET Core backend

Status: accepted

## Context
A simulation with thousands of replications can take hundreds of milliseconds or more.
It could run in the browser (a Web Worker) or on a server.

## Decision
The simulator lives in the C#/.NET backend behind `POST /api/simulate`. The frontend only
edits the model and renders results.

## Consequences
- The UI stays responsive without extra worker code, and the same engine can later serve other
  clients (for example a batch job or a mobile app).
- The frontend needs a running backend; when it is missing, the UI explains that instead of failing silently.
- Validation exists twice (TypeScript for instant feedback, C# as the authority). Both must be kept in sync;
  the backend wins on any disagreement.
- Request limits (`MaxReplications`, `MaxHorizon`, firing cap per run) protect the server from runaway requests.
