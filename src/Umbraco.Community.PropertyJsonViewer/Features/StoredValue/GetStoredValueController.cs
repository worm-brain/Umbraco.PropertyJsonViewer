using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security.Authorization;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Community.PropertyJsonViewer.Infrastructure;
using Umbraco.Extensions;

namespace Umbraco.Community.PropertyJsonViewer.Features.StoredValue;

/// <summary>A property's stored values, as the drawer's Stored tab shows them.</summary>
/// <param name="Draft">The stored draft value as text; null when nothing is stored.</param>
/// <param name="Published">The stored published value as text; null when nothing is stored or the variant is not published.</param>
/// <param name="IsPublished">Whether the variant is published.</param>
/// <param name="StorageType">The database column type: <c>Ntext</c>, <c>Nvarchar</c>, <c>Integer</c>, <c>Decimal</c> or <c>Date</c>.</param>
public sealed record PropertyJsonViewerStoredValueResponseModel(
    string? Draft,
    string? Published,
    bool IsPublished,
    string StorageType
);

/// <summary>
/// Returns the values Umbraco has stored for one document property variant, before any property editor
/// conversion. The core document endpoints only return editor values (<c>ToEditor</c> output).
/// </summary>
/// <remarks>Read-only: it never modifies content.</remarks>
[ApiVersion("1.0")]
public sealed class GetStoredValueController(
    IAuthorizationService authorizationService,
    StoredValueReader reader
) : PropertyJsonViewerControllerBase
{
    /// <summary>Gets the stored draft and published values of a document property.</summary>
    /// <param name="documentId">The document key.</param>
    /// <param name="propertyAlias">The property type alias.</param>
    /// <param name="culture">The culture being viewed; ignored for a property that does not vary by culture.</param>
    /// <param name="segment">The segment being viewed; ignored for a property that does not vary by segment.</param>
    /// <returns>The values; 403 without <see cref="PropertyJsonViewerPermissions.Read"/> on the document; 404 when the document or property does not exist.</returns>
    [HttpGet("stored-value")]
    [ProducesResponseType<PropertyJsonViewerStoredValueResponseModel>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStoredValue(
        Guid documentId,
        string propertyAlias,
        string? culture = null,
        string? segment = null
    )
    {
        // The package's own document permission, resolved like core ones: granular permissions on the
        // document or its nearest ancestor win over the user groups' default permissions.
        AuthorizationResult authorization = await authorizationService.AuthorizeResourceAsync(
            User,
            ContentPermissionResource.WithKeys(PropertyJsonViewerPermissions.Read, documentId),
            AuthorizationPolicies.ContentPermissionByResource
        );
        if (!authorization.Succeeded)
        {
            return Forbidden();
        }

        StoredValueResult result = reader.Read(documentId, propertyAlias, culture, segment);
        return result.Status switch
        {
            StoredValueStatus.Found => Ok(
                new PropertyJsonViewerStoredValueResponseModel(
                    result.Draft,
                    result.Published,
                    result.IsPublished,
                    result.StorageType!
                )
            ),
            StoredValueStatus.DocumentNotFound => PackageProblem(
                StatusCodes.Status404NotFound,
                "The document could not be found"
            ),
            _ => PackageProblem(
                StatusCodes.Status404NotFound,
                $"The document has no property with the alias '{propertyAlias}'"
            ),
        };
    }
}
