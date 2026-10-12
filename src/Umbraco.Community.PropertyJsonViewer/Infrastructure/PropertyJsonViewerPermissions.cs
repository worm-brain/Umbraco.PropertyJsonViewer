namespace Umbraco.Community.PropertyJsonViewer.Infrastructure;

/// <summary>
/// The package's document permission verbs. They are stored on user groups as plain strings, in both default
/// and granular (per-node) document permissions, and must match the client's <c>entityUserPermission</c>
/// manifests. Umbraco grants them to nobody by default, administrators included.
/// </summary>
public static class PropertyJsonViewerPermissions
{
    /// <summary>May open the drawer and read a document's stored property values.</summary>
    public const string Read = "PropertyJsonViewer.Read";
}
