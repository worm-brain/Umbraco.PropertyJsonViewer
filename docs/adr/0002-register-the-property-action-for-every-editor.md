# 0002 Register the property action at runtime for every property editor UI

Status: accepted (2026-10-12)

## Context

"View raw value" must appear in the "..." menu of every property, whatever its editor, including editors from
other packages. `umb-property-action-menu` shows a `propertyAction` only when
`forPropertyEditorUis.includes(propertyEditorUiAlias)`; there is no wildcard (verified in 17.7.0 and 18.2.1).
A static manifest would have to list every alias, and could never list a third-party one.

## Decision

The package's `backofficeEntryPoint` observes the registry's `propertyEditorUi` extensions and re-registers the
action (unregister, then register) with the sorted set of every alias whenever that set changes.

Rejected: patching or wrapping `umb-property` to render our own button, which relies on core internals; and
faking `forPropertyEditorUis` with an object whose `includes` always returns true, which relies on how the
menu happens to filter.

## Consequences

- Editors registered after start-up (lazy bundles, other packages) get the action too.
- Each re-registration re-creates the action in open property menus; this only happens while extensions are
  still being registered.
