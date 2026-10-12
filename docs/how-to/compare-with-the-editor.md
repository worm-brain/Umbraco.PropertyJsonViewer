# Compare with the editor

Use this when a property editor shows something you do not expect, to see whether the problem is in what is stored
or in how the editor reads it.

1. Open the drawer on the property. See [View a stored value](view-a-stored-value.md).
2. Choose the **Diff** tab.

![The Diff tab: the stored draft on the left, the editor value on the right, with the differences highlighted](../images/diff-tab.png)

The stored draft is on the left and the editor value on the right. Lines only one side has are highlighted. When the
two match, the tab says so instead.

The **Editor** tab shows the editor value on its own. It includes edits you have not saved yet and updates while
the drawer is open.

## Reading the difference

Some differences are normal. Many property editors convert the stored value into a richer shape for editing, then
back again on save. A block list, for example, stores each layout item as just a `contentKey`, but its editor adds
`$type`, `contentUdi` and `settingsKey` to each one. [Stored values and editor values](../explanation/stored-and-editor-values.md)
explains why.

Differences worth a closer look:

- A value present in the stored draft but missing from the editor value. The editor may not be reading it.
- Keys or IDs that do not match between the two sides.
- An editor value that changes with no edit from you, which points at the editor rewriting the value on load.
