# 0001 One package per Umbraco major, built from one source tree

Status: accepted (2026-10-12)

## Context

The package supports Umbraco 17 (LTS) and 18. The two majors differ in places a package touches, for example
how a Management API OpenAPI document is registered (Swashbuckle in 17, Microsoft.AspNetCore.OpenApi in 18).
Umbraco.Community.LogExplorer already solved this.

## Decision

Follow LogExplorer: one source tree, one package per major. `UmbracoMajor` (default `17`) selects the Umbraco
package range in `Directory.Packages.props`, separate `bin`/`obj` folders, and an `UMBRACO_<major>` compile
constant. Versions are `17.x.y` and `18.x.y`. Major-specific code goes in paired `*.V17.cs` / `*.V18.cs` files.

## Consequences

- Build and test both majors: `dotnet build` and `dotnet build -p:UmbracoMajor=18`.
- Each major has its own sample site (`samples/PropertyJsonViewer.Site17`, `.Site18`) with its own database.
