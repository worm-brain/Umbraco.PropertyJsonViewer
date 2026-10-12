# Configuration reference

## Settings

`appsettings.json`:

```json
{
  "PropertyJsonViewer": {
    "Enabled": true
  }
}
```

| Key | Default | Effect |
| --- | --- | --- |
| `PropertyJsonViewer:Enabled` | `true` | When `false`, every package endpoint returns 404 and **View raw value** does not appear anywhere. Read per request, so a configuration reload applies without a restart; users see the change when they next load the backoffice. |

## Permissions

| Permission (on user groups) | Verb | Allows |
| --- | --- | --- |
| View raw property values | `PropertyJsonViewer.Read` | Opening the drawer and reading stored values |
| Write raw property values | `PropertyJsonViewer.Write` | Saving a raw value to the draft |

Both are document permissions: a group default, overridable per document with granular permissions. Nobody has
them after install.

A raw save needs all of:

| Check | Where it comes from |
| --- | --- |
| `PropertyJsonViewer.Write` on the document | This package |
| `Umb.Document.Update` on the document, for the culture being written | Umbraco's **Update** document permission and the group's language access |
| `Umb.Document.PropertyValue.Write` for the property | Umbraco's **UI Write** document property value permission. Granular settings for the property type win; otherwise the group default applies. |

## API

The endpoints are part of Umbraco's Management API and need a backoffice login.

| Method and path | Does | Responses |
| --- | --- | --- |
| `GET /umbraco/management/api/v1/property-json-viewer/settings` | Tells the backoffice the package is enabled | 200; 404 when disabled |
| `GET /umbraco/management/api/v1/property-json-viewer/stored-value?documentId=&propertyAlias=&culture=&segment=` | Reads the stored draft and published values | 200 with `draft`, `published`, `isPublished`, `storageType`; 403; 404 |
| `PUT /umbraco/management/api/v1/property-json-viewer/stored-value` | Writes a raw value to the draft. Body: `documentId`, `propertyAlias`, `culture`, `segment`, `value` (null clears it) | 200; 400 with the reason as the ProblemDetails `title`; 403; 404 |

`culture` and `segment` are ignored for a property that does not vary by them.
