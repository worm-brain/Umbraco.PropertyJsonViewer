# AGENTS.md

Instructions for anyone, person or agent, changing the code in this repository. This is the
canonical instructions file; tool-specific files such as `CLAUDE.md` point here. Contributions
follow [CONTRIBUTING.md](CONTRIBUTING.md): ideas and issues are welcome from anyone, and pull
requests are issue-first and invitation-only.

## What this is

`Umbraco.Community.PropertyJsonViewer` is an Umbraco 17/18 backoffice package. A **View raw value**
item in every document property's "..." menu opens a drawer showing what Umbraco has stored for
that property, what the property editor currently holds, and the difference. With a second
permission, a user can write a corrected value straight to the draft. It ships one NuGet package
per Umbraco major.

## Working rules

- Verify Umbraco and SDK APIs against the installed version before use; never invent aliases,
  routes, element names or members. When docs and the installed package disagree, the package wins.
- Record decisions in `docs/adr/` (see its README): a change to a contract, a dependency, a
  supported version or something an earlier ADR decided gets a new ADR.
- Built-in extension points only. The UI hooks into property actions and modals; never patch or
  wrap `umb-property` or other core elements (ADR 0002).
- Stored values are read and written only through Umbraco's services (`IContentService`). Never
  SQL (ADR 0005).
- Organise by feature folder, not technical layer.
- Tooling: Bun, Vite, Vitest, Playwright and Prettier for the client; xUnit v3, NSubstitute and
  CSharpier for .NET.
- One package per Umbraco major (ADR 0001): `dotnet build` targets 17, `-p:UmbracoMajor=18`
  targets 18. Major-specific code goes in paired `*.V17.cs` / `*.V18.cs` files. Build and test both
  majors before committing anything that touches Umbraco APIs.
- Run the tests before every commit and read the build summary. Stop any running sample site first:
  a locked DLL shows up as build errors.
- C# members carry XML doc comments, exported TypeScript carries TSDoc, and new or changed code
  comes with tests (`MethodName_Scenario_ExpectedBehaviour` names in .NET).
- Conventional Commits, ASCII only.
- Every user-visible change adds a line under `## [Unreleased]` in `CHANGELOG.md` and updates the
  `docs/` page that describes it (CONTRIBUTING.md has the docs style guide).
- Branches: `main` plus one short-lived branch per pull request. Both majors build from `main`.

## Commands

```sh
# .NET: format check, build and test for Umbraco 17; add -p:UmbracoMajor=18 for 18
dotnet tool restore && dotnet csharpier check .
dotnet build -warnaserror
dotnet test --solution Umbraco.Community.PropertyJsonViewer.slnx

# Client, in src/Umbraco.Community.PropertyJsonViewer/Client
bun install
bun run format:check && bun run typecheck && bun run test && bun run build
bun run e2e                # Playwright against both sample sites
bun run docs:screenshots   # retake docs/images from the Umbraco 17 sample site

# Packed-package smoke test (needs uv)
dotnet pack Umbraco.Community.PropertyJsonViewer.slnx -o artifacts -p:UmbracoMajor=17 -p:Version=17.0.0-alpha.0
uv run tests/package-smoke/smoke_nupkg.py --packages artifacts --major 17

# Sample sites; build the client first, because its output is gitignored
dotnet run --project samples/PropertyJsonViewer.Site17                      # https://localhost:44470/umbraco
dotnet run --project samples/PropertyJsonViewer.Site18 -p:UmbracoMajor=18   # https://localhost:44480/umbraco
```

The sample sites install themselves on first run (SQLite) and sign in with `admin@example.com` /
`1234567890` (development only, set in `appsettings.Development.json`). The same file sets a fixed,
development-only `Umbraco:CMS:Imaging:HMACSecretKey`, because without one the unattended install
writes a generated key into `appsettings.json`; never commit a key there. Each runs on one Umbraco
major: a solution build for the other major skips it, and building or running it on its own for
the other major fails with the switch to use. The e2e suite starts them on ports 44474 (17) and
44484 (18).

They seed a "Raw value test page" (key `5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a01`) with a text box, a
block list and a property using a stand-in third-party editor (`wwwroot/App_Plugins/SampleThirdParty`
in each site), and grant Administrators the package's read and write permissions on start-up
(ADR 0004). Run a site with `PropertyJsonViewer__Enabled=false` to check the kill switch. Restart a
running site after a client build: the static asset list is read at startup.

To release, move the `## [Unreleased]` entries under `## [17.x.y] and [18.x.y] - <date>` in the
commit you tag, then push the tags `v17.x.y` and `v18.x.y`. `release.yml` runs the security gate,
tests, packs, smoke-tests the packed package, publishes to nuget.org and creates the GitHub Release
from that CHANGELOG section. A suffix (`v17.1.0-beta.1`) makes a pre-release.

## Backoffice client facts

- Source in `src/Umbraco.Community.PropertyJsonViewer/Client/src/`, one folder per feature:
  `raw-value` (the property action, the drawer and raw saves) and `settings`. Entry points are in
  `entrypoints/`, localisation in `lang/`.
- Vite builds it into `wwwroot/App_Plugins/UmbracoCommunityPropertyJsonViewer/`. The manifest
  `public/umbraco-package.json` has the id `Umbraco.Community.PropertyJsonViewer`; the build stamps
  its version from `PROPERTY_JSON_VIEWER_VERSION`, which `dotnet pack` sets.
- The property action is registered at runtime for every property editor UI, because property
  actions have no wildcard (ADR 0002). Only document properties have a stored value of their own;
  a property inside a block gets only the Editor tab (ADR 0003).
- Custom elements use the `pjv-` prefix. The package has no context of its own: the drawer reads
  the property through core's `UMB_PROPERTY_CONTEXT`, forwarded by the modal.
- The endpoints are part of Umbraco's Management API, under
  `/umbraco/management/api/v1/property-json-viewer/` and the "Property JSON Viewer" group of its
  default OpenAPI document. The client calls them through `umbHttpClient` in the `*.api.ts` files
  and `raw-save.ts`; there is no generated client.
- UUI and the backoffice's `umb-*` elements come first, with their variants. Build a custom element
  only when nothing fits. Lit and UUI are imported through `@umbraco-cms/backoffice/external/*`.
- Colours and sizes come from UUI tokens (`--uui-color-*`, `--uui-size-*`). Use a plugin-scoped
  `--property-json-viewer-*` custom property only when no token fits, and define it once.
- Stored and editor values are rendered as text or in the code editor, never as HTML.
- Every control is keyboard-reachable and labelled.
