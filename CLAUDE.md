# Umbraco.Community.PropertyJsonViewer

An Umbraco 17/18 backoffice package: a "View raw value" item in every document property's "..." menu opens a drawer showing what Umbraco has stored for that property, what the property editor currently holds, and the difference.

The build brief and the session handoff live in the maintainer's private planning repository, not here. A gitignored `CLAUDE.local.md` at the checkout root imports them when it exists; "the brief" means that file.

## Working rules

- Work is tracked in the maintainer's private issue tracker (`CLAUDE.local.md` says where). Never reference those issues from this public repo: no issue numbers in commits, code or docs.
- Built-in extension points only. The UI hooks into property actions and modals; never patch or wrap `umb-property` or other core elements.
- Verify Umbraco and SDK APIs against the installed version before use; never invent aliases, routes, element names or members. When docs and the installed package disagree, the package wins.
- Decisions and Verify outcomes that change the brief go in `docs/adr/` (see its README).
- Stored values are read and written only through Umbraco's services (`IContentService`). Never SQL (ADR 0005).
- Organise by feature folder, not technical layer.
- Tooling: Bun + Vitest + Prettier for the client; xUnit v3 + NSubstitute + CSharpier for .NET.
- One package per Umbraco major (ADR 0001): `dotnet build` targets 17, `-p:UmbracoMajor=18` targets 18. Major-specific code goes in paired `*.V17.cs` / `*.V18.cs` files. Build and test both majors before committing anything that touches Umbraco APIs.
- Run `dotnet test` and, in the client, `bun run typecheck && bun run test && bun run format:check` before every commit. Stop any running sample site first: a locked DLL shows up as build errors. Conventional commits, ASCII only. Update `CHANGELOG.md` per user-visible change.

## Running things

```sh
dotnet build && dotnet test                                  # Umbraco 17
dotnet build -p:UmbracoMajor=18 && dotnet test -p:UmbracoMajor=18
cd src/Umbraco.Community.PropertyJsonViewer/Client && bun run typecheck && bun run test && bun run build
cd src/Umbraco.Community.PropertyJsonViewer/Client && bun run e2e   # Playwright against both sample sites (CONTRIBUTING.md)
uv run tests/package-smoke/smoke_nupkg.py --packages artifacts --major 17   # packed nupkg on fresh sites
dotnet run --project samples/PropertyJsonViewer.Site17                      # https://localhost:44470/umbraco
dotnet run --project samples/PropertyJsonViewer.Site18 -p:UmbracoMajor=18   # https://localhost:44480/umbraco
# login on both: admin@example.com / 1234567890
```

The sample sites seed a "Raw value test page" (key `5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a01`) with a text box, a block list and a property using a stand-in third-party editor (`wwwroot/App_Plugins/SampleThirdParty`), and grant Administrators the package's read and write permissions on start-up (ADR 0004). Run with `PropertyJsonViewer__Enabled=false` to check the kill switch. Restart a running site after a client build: the static asset list is read at startup.
