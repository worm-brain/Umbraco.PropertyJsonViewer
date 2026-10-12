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
public abstract class PropertyJsonViewerControllerBase : ManagementApiControllerBase
{
    /// <summary>
    /// An error response the backoffice client shows as-is. Its API interceptor only treats a body as ProblemDetails
    /// when it has a <c>type</c>; without one, the title is replaced by a generic "fatal server error" message.
    /// </summary>
    /// <param name="statusCode">The HTTP status.</param>
    /// <param name="title">A sentence the drawer shows to the user.</param>
    /// <returns>The response.</returns>
    protected static ObjectResult PackageProblem(int statusCode, string title) =>
        new(
            new ProblemDetails
            {
                Type = "Error",
                Title = title,
                Status = statusCode,
            }
        )
        {
            StatusCode = statusCode,
        };
}

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
