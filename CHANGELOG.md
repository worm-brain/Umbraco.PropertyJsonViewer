# Changelog

All notable changes to this package are recorded here. Versions follow one line per Umbraco major (17.x, 18.x).

## Unreleased

### Added

- "View raw value" in the "..." menu of every property, including properties whose editor comes from another
  package. It opens a drawer showing the property's alias, culture, segment and property editor.
- A Stored section in the drawer showing the document property's stored draft and published values exactly
  as the database holds them, before any property editor conversion. JSON is pretty-printed; other values
  show as plain text.
- A "View raw property values" document permission (default and granular). The action and the API are only
  available to users who have it on the document; nobody has it until an administrator assigns it.
- `PropertyJsonViewer:Enabled` in appsettings (default `true`). When false, the package's endpoints return 404
  and the action is not shown.
- Editor, Stored and Diff tabs in the drawer. Editor shows the value the property editor holds now, unsaved
  edits included; Diff compares it with the stored draft in Monaco's diff view. The drawer reopens on the tab
  last chosen.
- For a property inside a block, the drawer shows only the Editor tab and explains that the stored value is
  inside the parent block property's value.
- Raw save: users with the new "Write raw property values" permission, Update on the document and write access
  to the property can edit the stored draft in the drawer and save it straight to the database, bypassing the
  property editor. It saves the draft only, as a new version, and is refused while the document has unsaved
  changes.
- Safety rails on raw saves: a warning that the value bypasses the property editor, a review step showing the
  difference from the stored draft, confirmation by typing the property alias, and a note after saving that the
  draft is not published and the previous version can be rolled back.

### Fixed

- Screen readers announce the two sides of the Diff tab and of the raw save review by name ("Stored draft", "Editor
  value", "Value to save") instead of as unnamed text boxes.
- Error messages from the package's API (for example "The document could not be found") are shown in the
  drawer instead of a generic server error.
