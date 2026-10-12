namespace Umbraco.Community.PropertyJsonViewer.Infrastructure;

/// <summary>Names shared by the package's Management API endpoints.</summary>
public static class PropertyJsonViewerApi
{
    /// <summary>
    /// Route segment under the Management API: endpoints live at
    /// <c>/umbraco/management/api/v1/property-json-viewer/...</c>.
    /// </summary>
    public const string RouteSegment = "property-json-viewer";

    /// <summary>The group the endpoints are listed under in the Management API's Swagger document.</summary>
    public const string GroupName = "Property JSON Viewer";
}
