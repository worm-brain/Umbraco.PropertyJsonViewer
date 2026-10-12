# Stored values and editor values

A property has two values worth looking at, and they are often not the same.

**The stored value** is what Umbraco keeps in the database. It is text (or a number or date) in the shape the
property editor chose for storage. Umbraco reads it when it renders the website and when the backoffice loads the
document. The **Stored** tab shows it.

**The editor value** is what the property editor works with in the backoffice. When a document opens, each
property editor converts the stored value into the shape it edits; when you save, it converts that back into the
stored shape and validates it. The **Editor** tab shows the editor's shape, including changes you have not saved.

Umbraco's own document API only ever returns the editor value, so without this package the stored value is out of
sight unless you query the database.

## Why they differ

The two conversions exist so the editor can work with something convenient while storage stays compact and stable.
Typical differences:

- **Block lists and grids** store a minimal layout (each item is a `contentKey`) and add type information and
  older ID fields in the editor.
- **Pickers** may store keys or UDIs and show richer objects.
- **Rich text** stores markup and blocks in one structure that the editor splits apart.

So a difference on the **Diff** tab is not a bug in itself. It becomes interesting when data is lost or changed in
one direction: something stored that the editor does not show, or an editor value that does not match what you
last saved.

## Why raw saves are different

A normal save goes through the editor's conversion and validation. A raw save does not: it stores your text as-is,
after only a few checks (valid JSON over JSON, the right type for number and date columns, the column length). That
is what makes it useful for repairing a value the editor cannot load, and why it carries warnings and needs its own
permission. It still goes through Umbraco's content service rather than the database directly, so it creates a
version, writes the audit log and refreshes the caches like any other save.
