# Umbraco Property JSON Viewer

See and fix the raw value Umbraco stores for any document property, right from the backoffice. It adds
**View raw value** to the "..." menu of every property, next to Umbraco's own Copy and Clear, and works
with any property editor, including ones from other packages. Install the package and give the right
user groups the new permission; there is nothing else to configure. You can then see exactly what is in
the database, compare it with what the property editor holds, and, with a second permission, write a
corrected value straight to the draft.

## Install

One package line per Umbraco major: `17.x` for Umbraco 17, `18.x` for Umbraco 18.

```sh
# Umbraco 17
dotnet add package Umbraco.Community.PropertyJsonViewer --version 17.0.0

# Umbraco 18
dotnet add package Umbraco.Community.PropertyJsonViewer --version 18.0.0
```

Use the newest version of your line. Without `--version`, the newest overall is the `18.x` line.

## Quick start

1. Go to **Users > User Groups**, open the group that should use it, turn on **View raw property
   values** under **Property JSON Viewer**, and choose **Save**.
2. Open a document. Hover over a property and choose the **...** menu next to its label.
3. Choose **View raw value**. The drawer opens on the **Stored** tab.

Nobody has the permission after install, administrators included. To write raw values as well, also
turn on **Write raw property values**.

## Features

- **Stored:** the draft and published values exactly as the database holds them, before any property
  editor conversion, with JSON pretty-printed.
- **Editor:** the value the property editor holds now, unsaved edits included.
- **Diff:** the stored draft and the editor value side by side.
- **Raw save:** edit the stored draft and save it straight to the draft, with a warning, a review of the
  difference and confirmation by typing the property alias. Every save is a new version you can roll
  back.
- Two document permissions, per user group or per document, and `PropertyJsonViewer:Enabled` to turn
  the whole package off.

## Documentation

- [README with screenshots](https://github.com/worm-brain/Umbraco.PropertyJsonViewer#readme)
- [Documentation](https://github.com/worm-brain/Umbraco.PropertyJsonViewer/blob/main/docs/index.md)
- [Configuration reference](https://github.com/worm-brain/Umbraco.PropertyJsonViewer/blob/main/docs/reference/configuration.md)
- [Changelog](https://github.com/worm-brain/Umbraco.PropertyJsonViewer/blob/main/CHANGELOG.md)

## Support and licence

Questions and bugs: [GitHub issues](https://github.com/worm-brain/Umbraco.PropertyJsonViewer/issues).
MIT licence.
