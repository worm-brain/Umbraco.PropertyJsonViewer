using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;

namespace Umbraco.Community.PropertyJsonViewer.Infrastructure;

/// <summary>
/// Base class for the package's Management API controllers: routes them under
/// <c>/umbraco/management/api/v1/property-json-viewer</c> and answers 404 to every request while
/// <see cref="PropertyJsonViewerOptions.Enabled"/> is false.
/// </summary>
[VersionedApiBackOfficeRoute(PropertyJsonViewerApi.RouteSegment)]
[ApiExplorerSettings(GroupName = PropertyJsonViewerApi.GroupName)]
[TypeFilter<PropertyJsonViewerEnabledFilter>]
public abstract class PropertyJsonViewerControllerBase : ManagementApiControllerBase { }

/// <summary>Short-circuits requests with 404 when the package is disabled.</summary>
/// <remarks>Reads the options per request, so a configuration reload takes effect without a restart.</remarks>
internal sealed class PropertyJsonViewerEnabledFilter(
    IOptionsMonitor<PropertyJsonViewerOptions> options
) : IActionFilter
{
    /// <inheritdoc />
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!options.CurrentValue.Enabled)
        {
            context.Result = new NotFoundResult();
        }
    }

    /// <inheritdoc />
    public void OnActionExecuted(ActionExecutedContext context) { }
}
