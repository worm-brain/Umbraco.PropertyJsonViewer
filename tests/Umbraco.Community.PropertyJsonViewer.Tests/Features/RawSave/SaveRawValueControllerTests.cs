using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Security.Authorization;
using Umbraco.Community.PropertyJsonViewer.Features.RawSave;
using Umbraco.Community.PropertyJsonViewer.Infrastructure;
using Umbraco.Community.PropertyJsonViewer.Tests.Support;

namespace Umbraco.Community.PropertyJsonViewer.Tests.Features.RawSave;

public sealed class SaveRawValueControllerTests
{
    [Fact]
    public async Task SaveRawValue_UserWithWriteAndUpdate_Returns200()
    {
        var document = new TestDocument();
        document.AddProperty("heading");
        SaveRawValueController controller = CreateController(
            document,
            PropertyJsonViewerPermissions.Write,
            ActionUpdate.ActionLetter
        );

        IActionResult result = await controller.SaveRawValue(Request(document, "New"));

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task SaveRawValue_UserWithUpdateButNotThePackageWritePermission_Returns403()
    {
        var document = new TestDocument();
        document.AddProperty("heading");
        SaveRawValueController controller = CreateController(document, ActionUpdate.ActionLetter);

        IActionResult result = await controller.SaveRawValue(Request(document, "New"));

        Assert.Equal(StatusCodes.Status403Forbidden, StatusCode(result));
    }

    [Fact]
    public async Task SaveRawValue_UserWithThePackageWritePermissionButNotUpdate_Returns403()
    {
        var document = new TestDocument();
        document.AddProperty("heading");
        SaveRawValueController controller = CreateController(
            document,
            PropertyJsonViewerPermissions.Write
        );

        IActionResult result = await controller.SaveRawValue(Request(document, "New"));

        Assert.Equal(StatusCodes.Status403Forbidden, StatusCode(result));
    }

    [Fact]
    public async Task SaveRawValue_RejectedValue_Returns400WithTheReason()
    {
        var document = new TestDocument();
        document.AddProperty("blocks").SetValue("""{"layout":{}}""");
        SaveRawValueController controller = CreateController(
            document,
            PropertyJsonViewerPermissions.Write,
            ActionUpdate.ActionLetter
        );

        IActionResult result = await controller.SaveRawValue(
            Request(document, "{broken", propertyAlias: "blocks")
        );

        // The backoffice only shows a ProblemDetails title when the body also has a type.
        var problem = Assert.IsType<ProblemDetails>(Assert.IsType<ObjectResult>(result).Value);
        Assert.Equal(
            (
                (int?)StatusCodes.Status400BadRequest,
                "Error",
                "The stored value is JSON, and the new value is not valid JSON."
            ),
            (problem.Status, problem.Type, problem.Title)
        );
    }

    private static PropertyJsonViewerSaveRawValueRequestModel Request(
        TestDocument document,
        string? value,
        string propertyAlias = "heading"
    ) => new(document.Key, propertyAlias, null, null, value);

    private static SaveRawValueController CreateController(
        TestDocument document,
        params string[] documentPermissions
    )
    {
        // Stands in for Umbraco's content permission handler: a check succeeds when the user holds every
        // permission it asks for.
        IAuthorizationService authorization = Substitute.For<IAuthorizationService>();
        authorization
            .AuthorizeAsync(Arg.Any<ClaimsPrincipal>(), Arg.Any<object?>(), Arg.Any<string>())
            .Returns(call =>
                call.ArgAt<object?>(1) is ContentPermissionResource resource
                && resource.PermissionsToCheck.All(documentPermissions.Contains)
                    ? AuthorizationResult.Success()
                    : AuthorizationResult.Failed()
            );

        // Built before configuring the accessor: NSubstitute cannot set up one substitute inside another's Returns.
        IUser user = TestUsers.WithGroup([ActionDocumentPropertyWrite.ActionLetter]);
        IBackOfficeSecurityAccessor securityAccessor =
            Substitute.For<IBackOfficeSecurityAccessor>();
        securityAccessor.BackOfficeSecurity!.CurrentUser.Returns(user);

        return new SaveRawValueController(
            authorization,
            securityAccessor,
            new RawValueWriter(document.ContentService())
        )
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
