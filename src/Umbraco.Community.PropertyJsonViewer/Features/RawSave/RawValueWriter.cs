using System.Globalization;
using System.Text.Json;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Models.Membership.Permissions;
using Umbraco.Cms.Core.Services;
using Umbraco.Extensions;

namespace Umbraco.Community.PropertyJsonViewer.Features.RawSave;

/// <summary>The outcome of a raw save.</summary>
public enum RawSaveStatus
{
    /// <summary>The value was saved to the draft.</summary>
    Saved,

    /// <summary>No document has the requested key.</summary>
    DocumentNotFound,

    /// <summary>The document's type has no property with the requested alias.</summary>
    PropertyNotFound,

    /// <summary>The user may not write this property (Umbraco's "UI Write" property value permission).</summary>
    PropertyWriteDenied,

    /// <summary>The value was rejected; <see cref="RawSaveResult.Reason"/> says why. Nothing was stored.</summary>
    Invalid,

    /// <summary>A notification handler cancelled the save. Nothing was stored.</summary>
    Cancelled,
}

/// <summary>The outcome of a raw save.</summary>
/// <param name="Status">What happened.</param>
/// <param name="Reason">For <see cref="RawSaveStatus.Invalid"/>, a sentence the drawer can show as-is.</param>
public sealed record RawSaveResult(RawSaveStatus Status, string? Reason = null);

/// <summary>
/// Writes a raw value straight to a document property's draft through <see cref="IContentService"/>, skipping the
/// property editor's <c>FromEditor</c> conversion and validation. That is the point of the feature, so the checks
/// here are the only ones the value gets: it must parse as JSON when the stored value is JSON, fit the property's
/// storage type, and fit the column.
/// </summary>
/// <remarks>
/// Saving through <see cref="IContentService"/> (never SQL) creates a new version, writes the audit log, fires the
/// usual notifications and refreshes the caches. It saves the draft only; it never publishes.
/// </remarks>
public sealed class RawValueWriter(IContentService contentService)
{
    /// <summary>Length of the <c>varcharValue</c> column that <c>Nvarchar</c> properties are stored in.</summary>
    internal const int NvarcharLength = 512;

    /// <summary>Writes the value to one property variant of the document's draft.</summary>
    /// <param name="user">The user saving; the save is recorded against them.</param>
    /// <param name="documentKey">The document's key.</param>
    /// <param name="propertyAlias">The property type alias.</param>
    /// <param name="culture">The culture being edited; ignored for a property that does not vary by culture.</param>
    /// <param name="segment">The segment being edited; ignored for a property that does not vary by segment.</param>
    /// <param name="value">The raw value as text, or null to clear the stored value.</param>
    /// <returns>What happened. Anything but <see cref="RawSaveStatus.Saved"/> means nothing was stored.</returns>
    public RawSaveResult Write(
        IUser user,
        Guid documentKey,
        string propertyAlias,
        string? culture,
        string? segment,
        string? value
    )
    {
        IContent? content = contentService.GetById(documentKey);
        if (content is null)
        {
            return new RawSaveResult(RawSaveStatus.DocumentNotFound);
        }

        if (!content.Properties.TryGetValue(propertyAlias, out IProperty? property))
        {
            return new RawSaveResult(RawSaveStatus.PropertyNotFound);
        }

        if (!MayWriteProperty(user, content.ContentType.Key, property.PropertyType.Key))
        {
            return new RawSaveResult(RawSaveStatus.PropertyWriteDenied);
        }

        string? valueCulture = property.PropertyType.VariesByCulture() ? culture : null;
        string? valueSegment = property.PropertyType.VariesBySegment() ? segment : null;

        object? current = property.GetValue(valueCulture, valueSegment, published: false);
        RawSaveResult? invalid = Validate(
            property.PropertyType.ValueStorageType,
            current,
            value,
            out object? typed
        );
        if (invalid is not null)
        {
            return invalid;
        }

        content.SetValue(propertyAlias, typed, valueCulture, valueSegment);
        OperationResult saved = contentService.Save(content, user.Id);
        return saved.Success
            ? new RawSaveResult(RawSaveStatus.Saved)
            : new RawSaveResult(RawSaveStatus.Cancelled);
    }

    /// <summary>
    /// Umbraco's property value write permission, resolved the way the backoffice resolves it (core only enforces
    /// it in the UI): granular permissions for this property type win; without any, the groups' default
    /// permissions decide.
    /// </summary>
    internal static bool MayWriteProperty(IUser user, Guid documentTypeKey, Guid propertyTypeKey)
    {
        // Granular property permissions are stored per document type as "<propertyTypeKey>|<verb>".
        string prefix = $"{propertyTypeKey}|";
        string[] granular =
        [
            .. user
                .Groups.SelectMany(group => group.GranularPermissions)
                .OfType<DocumentPropertyValueGranularPermission>()
                .Where(permission =>
                    permission.Key == documentTypeKey
                    && permission.Permission.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                )
                .Select(permission => permission.Permission[prefix.Length..]),
        ];

        return granular.Length > 0
            ? granular.Contains(ActionDocumentPropertyWrite.ActionLetter)
            : user.Groups.Any(group =>
                group.Permissions.Contains(ActionDocumentPropertyWrite.ActionLetter)
            );
    }

    // Returns null when the value is acceptable, with the value converted to what the storage type holds.
    private static RawSaveResult? Validate(
        ValueStorageType storageType,
        object? current,
        string? value,
        out object? typed
    )
    {
        typed = value;
        if (value is null)
        {
            return null;
        }

        switch (storageType)
        {
            case ValueStorageType.Integer:
                if (
                    !int.TryParse(
                        value,
                        NumberStyles.Integer,
                        CultureInfo.InvariantCulture,
                        out int integer
                    )
                )
                {
                    return Invalid("This property stores whole numbers, and the value is not one.");
                }

                typed = integer;
                return null;

            case ValueStorageType.Decimal:
                if (
                    !decimal.TryParse(
                        value,
                        NumberStyles.Float,
                        CultureInfo.InvariantCulture,
                        out decimal number
                    )
                )
                {
                    return Invalid(
                        "This property stores numbers, and the value is not one (use . for decimals)."
                    );
                }

                typed = number;
                return null;

            case ValueStorageType.Date:
                if (
                    !DateTime.TryParse(
                        value,
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime date
                    )
                )
                {
                    return Invalid(
                        "This property stores dates, and the value is not one (use yyyy-MM-dd HH:mm:ss)."
                    );
                }

                typed = date;
                return null;

            case ValueStorageType.Nvarchar when value.Length > NvarcharLength:
                return Invalid(
                    $"This property's column holds at most {NvarcharLength} characters; the value has {value.Length}."
                );
        }

        // A value that was JSON must stay JSON: the property editor will try to parse whatever is stored.
        if (current is string stored && LooksLikeJson(stored) && !IsValidJson(value))
        {
            return Invalid("The stored value is JSON, and the new value is not valid JSON.");
        }

        return null;
    }

    private static bool LooksLikeJson(string text)
    {
        string trimmed = text.TrimStart();
        return (trimmed.StartsWith('{') || trimmed.StartsWith('[')) && IsValidJson(text);
    }

    private static bool IsValidJson(string text)
    {
        try
        {
            using var document = JsonDocument.Parse(text);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static RawSaveResult Invalid(string reason) => new(RawSaveStatus.Invalid, reason);
}
