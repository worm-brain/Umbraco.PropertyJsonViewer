# Contributing

## Build and test

You need the .NET 10 SDK and [Bun](https://bun.sh).

```sh
dotnet build && dotnet test                                          # Umbraco 17
dotnet build -p:UmbracoMajor=18 && dotnet test -p:UmbracoMajor=18    # Umbraco 18
cd src/Umbraco.Community.PropertyJsonViewer/Client
bun install
bun run typecheck && bun run test && bun run format:check && bun run build
```

One source tree builds one package per Umbraco major (`docs/adr/0001`). Build and test both before sending a change
that touches Umbraco APIs.

## Run a sample site

```sh
dotnet run --project samples/PropertyJsonViewer.Site17                      # https://localhost:44470/umbraco
dotnet run --project samples/PropertyJsonViewer.Site18 -p:UmbracoMajor=18   # https://localhost:44480/umbraco
```

Log in with `admin@example.com` / `1234567890`. The first start installs Umbraco into a local SQLite database, seeds
a "Raw value test page" with a text box, a block list and a stand-in third-party editor, and gives Administrators
both package permissions. Run `bun run build` in the client folder first, and restart the site after each client
build.

## Conventions

- Decisions go in `docs/adr/`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/), ASCII only.
- Formatting: CSharpier for C# (`dotnet csharpier format .`), Prettier for the client (`bun run format`).
- User-visible changes go in `CHANGELOG.md`.

## Writing docs

The docs follow [Diataxis](https://diataxis.fr/): how-to guides, reference and explanation, one kind per page.

- Second person, active voice, present tense. Sentence-case headings.
- Use the UI's words exactly, in bold: **View raw value**, **Stored**, **Edit raw value**.
- *Choose* a labelled control (button, tab, menu item); *turn on* or *turn off* a toggle; *type* in a box; *hover
  over* a property. Do not use *select* or *click* for these.
- No contractions.
- Retake the screenshots in `docs/images` when the UI they show changes. Take them at 1440 by 900 on a freshly
  seeded sample site.
