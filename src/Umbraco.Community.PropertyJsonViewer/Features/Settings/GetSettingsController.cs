using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Community.PropertyJsonViewer.Infrastructure;

namespace Umbraco.Community.PropertyJsonViewer.Features.Settings;

/// <summary>What the backoffice client needs to know before it registers anything.</summary>
/// <param name="ReadPermission">The document permission verb that allows reading raw values.</param>
public sealed record PropertyJsonViewerSettingsResponseModel(string ReadPermission);

/// <summary>
/// Tells the backoffice the package is enabled. Like every package endpoint it returns 404 when the package is
/// disabled, which is how the client knows not to register the "View raw value" action.
/// </summary>
[ApiVersion("1.0")]
public sealed class GetSettingsController : PropertyJsonViewerControllerBase
{
    /// <summary>Gets the client settings.</summary>
    /// <returns>The settings; 404 when the package is disabled.</returns>
    [HttpGet("settings")]
    [ProducesResponseType<PropertyJsonViewerSettingsResponseModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetSettings() =>
        Ok(new PropertyJsonViewerSettingsResponseModel(PropertyJsonViewerPermissions.Read));
}
