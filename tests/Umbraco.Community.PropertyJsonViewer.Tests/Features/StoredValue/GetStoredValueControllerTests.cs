using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security.Authorization;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.PropertyJsonViewer.Features.StoredValue;
using Umbraco.Community.PropertyJsonViewer.Infrastructure;
using Umbraco.Community.PropertyJsonViewer.Tests.Support;

namespace Umbraco.Community.PropertyJsonViewer.Tests.Features.StoredValue;

public sealed class GetStoredValueControllerTests
{
    [Fact]
    public async Task GetStoredValue_UserWithTheReadPermission_ReturnsTheStoredValues()
    {
        var document = new TestDocument();
        document.AddProperty("heading").SetValue("Hello");
        GetStoredValueController controller = CreateController(
            document.ContentService(),
            grantedPermission: PropertyJsonViewerPermissions.Read
        );

        IActionResult result = await controller.GetStoredValue(document.Key, "heading");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(
            new PropertyJsonViewerStoredValueResponseModel("Hello", null, false, "Ntext"),
            ok.Value
        );
    }

    [Fact]
    public async Task GetStoredValue_UserWhoCanOnlyBrowseTheDocument_Returns403()
    {
        var document = new TestDocument();
        document.AddProperty("heading").SetValue("Secret");
        GetStoredValueController controller = CreateController(
            document.ContentService(),
            grantedPermission: "Umb.Document.Read"
        );

        IActionResult result = await controller.GetStoredValue(document.Key, "heading");

        Assert.Equal(StatusCodes.Status403Forbidden, StatusCode(result));
    }

    [Fact]
    public async Task GetStoredValue_UnknownDocument_Returns404()
    {
        GetStoredValueController controller = CreateController(
            new TestDocument().ContentService(),
            grantedPermission: PropertyJsonViewerPermissions.Read
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
            grantedPermission: PropertyJsonViewerPermissions.Read
        );

        IActionResult result = await controller.GetStoredValue(document.Key, "missing");

        Assert.Equal(StatusCodes.Status404NotFound, StatusCode(result));
    }

    private static GetStoredValueController CreateController(
        IContentService contentService,
        string grantedPermission
    )
    {
        // Stands in for Umbraco's content permission handler: the user holds exactly one permission on the
        // document, and a check succeeds only when it asks for nothing else.
        IAuthorizationService authorization = Substitute.For<IAuthorizationService>();
        authorization
            .AuthorizeAsync(Arg.Any<ClaimsPrincipal>(), Arg.Any<object?>(), Arg.Any<string>())
            .Returns(call =>
                call.ArgAt<object?>(1) is ContentPermissionResource resource
                && resource.PermissionsToCheck.All(permission => permission == grantedPermission)
                    ? AuthorizationResult.Success()
                    : AuthorizationResult.Failed()
            );

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
