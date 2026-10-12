# Changelog

All notable changes to this package are recorded here. Versions follow one line per Umbraco major (17.x, 18.x).

## Unreleased

### Added

- "View raw value" in the "..." menu of every property, including properties whose editor comes from another
  package. It opens a drawer showing the property's alias, culture, segment and property editor.
- A Stored section in the drawer showing the document property's stored draft and published values exactly
  as the database holds them, before any property editor conversion. JSON is pretty-printed; other values
  show as plain text.
