using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using NSubstitute;
using Umbraco.Community.PropertyJsonViewer.Infrastructure;

namespace Umbraco.Community.PropertyJsonViewer.Tests.Infrastructure;

public sealed class PropertyJsonViewerEnabledFilterTests
{
    [Fact]
    public void OnActionExecuting_PackageDisabled_Returns404()
    {
        ActionExecutingContext context = ExecutingContext();

        Filter(enabled: false).OnActionExecuting(context);

        Assert.IsType<NotFoundResult>(context.Result);
    }

    [Fact]
    public void OnActionExecuting_PackageEnabled_LetsTheRequestThrough()
    {
        ActionExecutingContext context = ExecutingContext();

        Filter(enabled: true).OnActionExecuting(context);

        Assert.Null(context.Result);
    }

    private static PropertyJsonViewerEnabledFilter Filter(bool enabled)
    {
        IOptionsMonitor<PropertyJsonViewerOptions> options = Substitute.For<
            IOptionsMonitor<PropertyJsonViewerOptions>
        >();
        options.CurrentValue.Returns(new PropertyJsonViewerOptions { Enabled = enabled });
        return new PropertyJsonViewerEnabledFilter(options);
    }

    private static ActionExecutingContext ExecutingContext() =>
        new(
            new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor()),
            [],
            new Dictionary<string, object?>(),
            controller: new object()
        );
}
