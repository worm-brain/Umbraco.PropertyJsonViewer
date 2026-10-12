using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.PropertyJsonViewer.Features.StoredValue;
using Umbraco.Community.PropertyJsonViewer.Tests.Support;

namespace Umbraco.Community.PropertyJsonViewer.Tests.Features.StoredValue;

public sealed class GetStoredValueControllerTests
{
    [Fact]
    public async Task GetStoredValue_UserMayReadTheDocument_ReturnsTheStoredValues()
    {
        var document = new TestDocument();
        document.AddProperty("heading").SetValue("Hello");
        GetStoredValueController controller = CreateController(
            document.ContentService(),
            allowed: true
        );

        IActionResult result = await controller.GetStoredValue(document.Key, "heading");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(
            new PropertyJsonViewerStoredValueResponseModel("Hello", null, false, "Ntext"),
            ok.Value
        );
    }

    [Fact]
    public async Task GetStoredValue_UserMayNotReadTheDocument_Returns403WithoutReading()
    {
        var document = new TestDocument();
        document.AddProperty("heading").SetValue("Secret");
        IContentService contentService = document.ContentService();
        GetStoredValueController controller = CreateController(contentService, allowed: false);

        IActionResult result = await controller.GetStoredValue(document.Key, "heading");

        Assert.Equal(StatusCodes.Status403Forbidden, StatusCode(result));
    }

    [Fact]
    public async Task GetStoredValue_UnknownDocument_Returns404()
    {
        GetStoredValueController controller = CreateController(
            new TestDocument().ContentService(),
            allowed: true
        );

        IActionResult result = await controller.GetStoredValue(Guid.NewGuid(), "heading");

        Assert.Equal(StatusCodes.Status404NotFound, StatusCode(result));
    }

    [Fact]
    public async Task GetStoredValue_UnknownProperty_Returns404()
    {
        var document = new TestDocument();
        document.AddProperty("heading", ValueStorageType.Nvarchar);
        GetStoredValueController controller = CreateController(
            document.ContentService(),
            allowed: true
        );

        IActionResult result = await controller.GetStoredValue(document.Key, "missing");

        Assert.Equal(StatusCodes.Status404NotFound, StatusCode(result));
    }

    private static GetStoredValueController CreateController(
        IContentService contentService,
        bool allowed
    )
    {
        IAuthorizationService authorization = Substitute.For<IAuthorizationService>();
        authorization
            .AuthorizeAsync(Arg.Any<ClaimsPrincipal>(), Arg.Any<object?>(), Arg.Any<string>())
            .Returns(allowed ? AuthorizationResult.Success() : AuthorizationResult.Failed());

        return new GetStoredValueController(authorization, new StoredValueReader(contentService))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };
    }

    private static int? StatusCode(IActionResult result) =>
        result switch
        {
            ObjectResult objectResult => objectResult.StatusCode,
            StatusCodeResult statusCodeResult => statusCodeResult.StatusCode,
            _ => null,
        };
}
