namespace Umbraco.Community.PropertyJsonViewer.Infrastructure;

/// <summary>The <c>PropertyJsonViewer</c> appsettings section.</summary>
public sealed class PropertyJsonViewerOptions
{
    /// <summary>The appsettings section name.</summary>
    public const string SectionName = "PropertyJsonViewer";

    /// <summary>
    /// Turns the whole package off when false: every endpoint returns 404 and the backoffice registers no
    /// "View raw value" action. Defaults to true.
    /// </summary>
    public bool Enabled { get; set; } = true;
}
