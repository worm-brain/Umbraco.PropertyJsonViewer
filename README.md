<img src="assets/icon/umbraco-propertyjsonviewer.svg" alt="" width="96" height="96">

# Umbraco Property JSON Viewer

See and fix the raw value Umbraco stores for any document property, right from the backoffice. It adds **View raw
value** to the "..." menu of every property, next to Umbraco's own Copy and Clear, and works with any property
editor, including ones from other packages. Install the package and give the right user groups the new permission;
there is nothing else to configure. You can then see exactly what is in the database, compare it with what the
property editor holds, and, with a second permission, write a corrected value straight to the draft.

[![NuGet](https://img.shields.io/nuget/vpre/Umbraco.Community.PropertyJsonViewer?label=NuGet)](https://www.nuget.org/packages/Umbraco.Community.PropertyJsonViewer)
[![CI](https://github.com/worm-brain/Umbraco.PropertyJsonViewer/actions/workflows/ci.yml/badge.svg)](https://github.com/worm-brain/Umbraco.PropertyJsonViewer/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

![The Diff tab comparing a block list's stored JSON with the value its editor holds](docs/images/diff-tab.png)

> **Not yet on NuGet.** The first release is being prepared. Until then, build it from source (see
> [Contributing](CONTRIBUTING.md)).

## Contents

- [Features](#features)
- [A quick tour](#a-quick-tour)
- [Install](#install)
- [Quick start](#quick-start)
- [Configure](#configure)
- [Compatibility](#compatibility)
- [Documentation](#documentation)
- [Contributing, security and licence](#contributing-security-and-licence)

## Features

**Debug a property editor**

- **See what is stored.** The **Stored** tab shows the draft and published values exactly as the database holds
  them, before any property editor conversion. JSON is pretty-printed.
  [View a stored value](docs/how-to/view-a-stored-value.md)
- **See what the editor holds.** The **Editor** tab shows the value the property editor has now, unsaved edits
  included, and updates as you type.
- **Spot the difference.** The **Diff** tab puts the stored draft and the editor value side by side. Block lists,
  pickers and rich text often hold a different shape in the editor from the one they store, and that difference is
  usually the bug. [Compare with the editor](docs/how-to/compare-with-the-editor.md)

**Repair a broken value**

- **Write a raw value.** Edit the stored draft and save it straight to the database, bypassing the property
  editor. Useful when the editor cannot load the value it is meant to repair.
  [Fix a stored value](docs/how-to/fix-a-stored-value.md)
- **With the guard rails up.** A warning, a review of the change, confirmation by typing the property alias, and a
  refusal while the page has unsaved edits. Every save is a new version you can roll back.

**Stay in control**

- **Two permissions, nobody has them by default.** "View raw property values" and "Write raw property values" sit
  with the other document permissions, so you can grant them per user group or per document.
  [Give users access](docs/how-to/give-users-access.md)
- **One switch to turn it off.** `PropertyJsonViewer:Enabled` hides the whole feature.
  [Configuration](docs/reference/configuration.md)

## A quick tour

**Open it from any property.** **View raw value** sits in the "..." menu of every property, whichever package its
editor comes from.

![The "..." menu of a block list property with View raw value at the bottom](docs/images/property-action-menu.png)

**See what is stored.** The **Stored** tab shows the stored draft as the database holds it, with the column type it
lives in.

![The Stored tab showing a block list's stored draft as JSON, with the Ntext storage type and Edit raw value](docs/images/stored-tab.png)

**Fix it with the guard rails up.** Before a raw save you see a warning and the difference, and you type the
property alias to confirm.

![The review step of a raw save: a warning, the difference between the stored draft and the new value, and the property alias typed to confirm](docs/images/raw-save-review.png)

**Decide who can use it.** Two document permissions, off for everyone after install.

![The Property JSON Viewer permissions on the Administrators user group, both turned on](docs/images/permissions.png)

## Install

The package comes in one line per Umbraco major: `17.x` versions for Umbraco 17 and `18.x` versions for Umbraco 18.
Pick the line that matches your site:

```sh
# Umbraco 17
dotnet add package Umbraco.Community.PropertyJsonViewer --version 17.0.0

# Umbraco 18
dotnet add package Umbraco.Community.PropertyJsonViewer --version 18.0.0
```

Use the newest version of your line listed on [NuGet](https://www.nuget.org/packages/Umbraco.Community.PropertyJsonViewer).
Without `--version`, `dotnet add package` picks the newest version overall, which is the `18.x` line.

## Quick start

1. Go to **Users > User Groups**, open the group that should use it (for example **Administrators**), turn on
   **View raw property values** under **Property JSON Viewer**, and choose **Save**.
2. Open any document. Hover over a property and choose the **...** menu next to its label.
3. Choose **View raw value**. The drawer opens on the **Stored** tab.

For writing raw values, also turn on **Write raw property values**, then follow
[Fix a stored value](docs/how-to/fix-a-stored-value.md).

## Configure

There is nothing to configure beyond the two permissions. One setting in `appsettings.json` turns the whole package
off, hiding **View raw value** and closing its API:

```json
{
  "PropertyJsonViewer": {
    "Enabled": false
  }
}
```

The [configuration reference](docs/reference/configuration.md) lists the setting, the permissions and the API.

## Compatibility

| Umbraco | Package line | .NET |
| ------- | ------------ | ---- |
| 17.x    | `17.*`       | 10   |
| 18.x    | `18.*`       | 10   |

Umbraco 16 and earlier are not supported.

## Documentation

Start at the [documentation index](docs/index.md):

- **How-to guides:** [view a stored value](docs/how-to/view-a-stored-value.md),
  [compare with the editor](docs/how-to/compare-with-the-editor.md),
  [fix a stored value](docs/how-to/fix-a-stored-value.md), [give users access](docs/how-to/give-users-access.md).
- **Reference:** [configuration, permissions and API](docs/reference/configuration.md).
- **Explanation:** [stored values and editor values](docs/explanation/stored-and-editor-values.md).

## Contributing, security and licence

- [CONTRIBUTING.md](CONTRIBUTING.md) explains the contribution policy, how to build both Umbraco majors and how to run
  the tests.
- [SECURITY.md](SECURITY.md) explains how to report a vulnerability privately.
- [CHANGELOG.md](CHANGELOG.md) lists every user-visible change.
- Licensed under the [MIT licence](LICENSE).
