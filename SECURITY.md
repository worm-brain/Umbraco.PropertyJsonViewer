# Security policy

## Supported versions

| Package line | Umbraco | Supported |
| --- | --- | --- |
| `17.x` | 17 | Yes |
| `18.x` | 18 | Yes |

Security fixes go into the newest release of each line.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub: on the repository's **Security** tab, choose **Report a
vulnerability**. Include what you found, how to reproduce it, and which package version and
Umbraco version you used.

You will get an acknowledgement, and the fix will be coordinated with you before any details are
published.

## Scope

Property JSON Viewer shows the values Umbraco stores for document properties and can write a raw
value straight to a document's draft, so reports about these are especially welcome:

- a user reading a stored value without **View raw property values** on that document;
- a raw save without **Write raw property values**, Umbraco's **Update** permission and language
  access, or write access to the property, or one that changes anything but the draft;
- stored or editor values being rendered as HTML or script;
- the API answering while `PropertyJsonViewer:Enabled` is `false`.

See the [configuration reference](docs/reference/configuration.md#permissions) for what each
permission allows and what a raw save checks.
