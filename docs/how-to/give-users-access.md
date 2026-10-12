# Give users access

Nobody can view or write raw values until you allow it, administrators included.

1. Go to **Users > User Groups** and open the group.
2. Under **Document permissions**, find **Property JSON Viewer**.

   ![The Property JSON Viewer permissions on a user group, both turned on](../images/permissions.png)

3. Turn on **View raw property values** to let the group open the drawer.
4. Turn on **Write raw property values** as well to let the group save raw values. Give this to as few people as
   possible.
5. Choose **Save**.

Users pick up the change the next time they load the backoffice.

## Per document

Both permissions are document permissions, so they also work as granular permissions. Under **Granular
permissions**, choose **Add**, pick a document, and set them for that document and everything below it. A granular
setting overrides the group's default for that part of the tree.

## Writing also needs Umbraco's own permissions

A raw save also needs the core **Update** permission on the document, access to the language being edited, and write
access to the property. If any of those is missing, **Edit raw value** does not appear and the API refuses the save.
See the [configuration reference](../reference/configuration.md#permissions).
