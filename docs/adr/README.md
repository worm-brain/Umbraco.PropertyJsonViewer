# Architecture decision records

One file per decision, numbered in order: `NNNN-short-title.md`. Each records the context, the decision and its
consequences. A decision is changed by a new ADR that supersedes the old one; the old one stays, marked
superseded.

| ADR | Decision |
| --- | --- |
| [0001](0001-one-package-per-umbraco-major.md) | One package per Umbraco major, built from one source tree |
| [0002](0002-register-the-property-action-for-every-editor.md) | Register the property action at runtime for every property editor UI |
| [0003](0003-tell-document-properties-from-block-properties.md) | Tell document properties from block properties by the property dataset's entity type |
| [0004](0004-read-permission-and-kill-switch.md) | A custom document permission guards reads; a config switch turns the package off |
| [0005](0005-raw-save.md) | Raw saves go through IContentService, with the checks the property editor would have made |
