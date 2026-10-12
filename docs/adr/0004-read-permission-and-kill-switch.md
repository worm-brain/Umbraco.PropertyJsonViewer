# 0004 A custom document permission guards reads; a config switch turns the package off

Status: accepted (2026-10-12)

## Context

Stored values can include content an editor is not meant to see in raw form, so reading them needs its own
permission, and a site owner needs a way to turn the whole package off without uninstalling it.

## Decision

- **Permission.** The client registers an `entityUserPermission` for documents with the verb
  `PropertyJsonViewer.Read` ("View raw property values"). Umbraco stores custom verbs as plain strings in both
  default and granular document permissions. The server enforces it with
  `ContentPermissionResource.WithKeys(PropertyJsonViewerPermissions.Read, documentId)`, which resolves granular
  permissions on the document or its nearest ancestor before the user groups' defaults. The client hides the
  action with the core `Umb.Condition.UserPermission.Document` condition; that is convenience, not security.
- **Nobody gets it by default**, administrators included: `IContentPermissionService` has no administrator
  bypass, and granting a raw view of data is the site owner's call. The sample sites grant it to
  Administrators on start-up for development only.
- **Kill switch.** `PropertyJsonViewer:Enabled` (default `true`). When false, a filter on the package's base
  controller answers 404 to every endpoint, including `GET /settings`. The entry point registers the action
  only after `GET /settings` succeeds, so a disabled package shows nothing.

## Consequences

- After installing, an administrator must tick "View raw property values" on the groups that should see the
  action.
- Inside a block, the condition checks the nearest entity, which is the block element rather than the document,
  so granular document permissions do not apply there and the group defaults decide. Block properties only show
  the editor value, which the user can already see, so this leaks nothing.
