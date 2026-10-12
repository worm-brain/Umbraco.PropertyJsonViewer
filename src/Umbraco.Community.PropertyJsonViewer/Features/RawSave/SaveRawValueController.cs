using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Security.Authorization;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Community.PropertyJsonViewer.Infrastructure;
using Umbraco.Extensions;

namespace Umbraco.Community.PropertyJsonViewer.Features.RawSave;

/// <summary>A raw value to write to one property variant of a document's draft.</summary>
/// <param name="DocumentId">The document key.</param>
/// <param name="PropertyAlias">The property type alias.</param>
/// <param name="Culture">The culture being edited; ignored for a property that does not vary by culture.</param>
/// <param name="Segment">The segment being edited; ignored for a property that does not vary by segment.</param>
/// <param name="Value">The raw value as text, stored as-is (after checks); null clears it.</param>
public sealed record PropertyJsonViewerSaveRawValueRequestModel(
    Guid DocumentId,
    string PropertyAlias,
    string? Culture,
    string? Segment,
    string? Value
);

/// <summary>
/// Writes a raw value straight to a document property's draft, bypassing the property editor (ADR 0005). Guarded
/// by the package's write permission, Umbraco's Update permission (with language access for the culture) and the
/// property value write permission.
/// </summary>
[ApiVersion("1.0")]
public sealed class SaveRawValueController(
    IAuthorizationService authorizationService,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
    RawValueWriter writer
) : PropertyJsonViewerControllerBase
{
    /// <summary>Saves a raw value to the document's draft. It never publishes.</summary>
    /// <param name="request">What to write.</param>
    /// <returns>
    /// 200 when saved; 400 with the reason when the value is rejected or the save was cancelled; 403 without the
    /// permissions; 404 when the document or property does not exist.
    /// </returns>
    [HttpPut("stored-value")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SaveRawValue(
        PropertyJsonViewerSaveRawValueRequestModel request
    )
    {
        ArgumentNullException.ThrowIfNull(request);

        IUser? user = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        if (user is null || !await IsAuthorizedAsync(request))
        {
            return Forbidden();
        }

        RawSaveResult result = writer.Write(
            user,
            request.DocumentId,
            request.PropertyAlias,
            request.Culture,
            request.Segment,
            request.Value
        );

        return result.Status switch
        {
            RawSaveStatus.Saved => Ok(),
            RawSaveStatus.DocumentNotFound => PackageProblem(
                StatusCodes.Status404NotFound,
                "The document could not be found"
            ),
            RawSaveStatus.PropertyNotFound => PackageProblem(
                StatusCodes.Status404NotFound,
                $"The document has no property with the alias '{request.PropertyAlias}'"
            ),
            RawSaveStatus.PropertyWriteDenied => Forbidden(),
            RawSaveStatus.Cancelled => PackageProblem(
                StatusCodes.Status400BadRequest,
                "The save was cancelled by another part of the site"
            ),
            _ => PackageProblem(StatusCodes.Status400BadRequest, result.Reason!),
        };
    }

    // The package's write permission, plus the core Update permission a normal save needs, checked for the
    // culture being written so language restrictions on the user's groups still apply.
    private async Task<bool> IsAuthorizedAsync(PropertyJsonViewerSaveRawValueRequestModel request)
    {
        AuthorizationResult write = await authorizationService.AuthorizeResourceAsync(
            User,
            ContentPermissionResource.WithKeys(
                PropertyJsonViewerPermissions.Write,
                request.DocumentId
            ),
            AuthorizationPolicies.ContentPermissionByResource
        );
        if (!write.Succeeded)
        {
            return false;
        }

        ContentPermissionResource update = request.Culture is null
            ? ContentPermissionResource.WithKeys(ActionUpdate.ActionLetter, request.DocumentId)
            : ContentPermissionResource.WithKeys(
                ActionUpdate.ActionLetter,
                request.DocumentId,
                [request.Culture]
            );
        AuthorizationResult updateResult = await authorizationService.AuthorizeResourceAsync(
            User,
            update,
            AuthorizationPolicies.ContentPermissionByResource
        );
        return updateResult.Succeeded;
    }
}
