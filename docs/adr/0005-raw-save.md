# 0005 Raw saves go through IContentService, with the checks the property editor would have made

Status: accepted (2026-10-12)

## Context

Writing a raw value bypasses the property editor's `FromEditor` conversion and validation; that is the point of
the feature, for repairing values the editor cannot load. It is also dangerous: a bad value can break the editor,
and the open document workspace keeps showing (and would later save) the old value.

## Decision

- **Write path.** `IContentService`: `SetValue` on the document's draft, then `Save` as the current user. Never
  SQL, and never publish. Saving through the service creates a version (so Info > Rollback undoes it), writes
  the audit log, fires the save notifications (a handler may cancel it) and refreshes the caches.
- **Permissions.** The package's `PropertyJsonViewer.Write`, Umbraco's `Umb.Document.Update` (checked for the
  culture being written, so language restrictions still apply), and the property value write permission
  (`Umb.Document.PropertyValue.Write`). Core enforces the last one only in the backoffice UI, so the server
  resolves it itself, the same way: granular permissions for that property type on its document type win;
  without any, the user groups' defaults decide.
- **Checks on the value.** If the stored draft is JSON, the new value must be valid JSON. Integer, Decimal and
  Date storage types must parse with the invariant culture (`NumberStyles.Float` for decimals, so "1,5" is
  rejected rather than read as 15). Nvarchar is at most 512 characters, the column's length. A null value clears
  the stored value. The client stores valid JSON compact, as property editors do.
- **Stale workspace.** The drawer refuses to save while the document workspace has unsaved changes (saving the
  document afterwards would write the old value back over the raw edit), and reloads the workspace after a
  successful save.

Rejected: an "apply to editor" mode that puts the edited value into the property context and lets the normal
Save run. It goes through `FromEditor` and validation, so it cannot repair a value the editor cannot load.

## Consequences

- Error responses carry a ProblemDetails `type`: the backoffice API interceptor ignores a body without one and
  shows a generic "fatal server error" instead of the reason.
- Properties inside blocks cannot be written; their values live inside the parent block property's JSON.
