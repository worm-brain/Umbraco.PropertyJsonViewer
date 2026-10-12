using System.Globalization;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Extensions;

namespace Umbraco.Community.PropertyJsonViewer.Features.StoredValue;

/// <summary>Why a stored value could not be read.</summary>
public enum StoredValueStatus
{
    /// <summary>The value was read.</summary>
    Found,

    /// <summary>No document has the requested key.</summary>
    DocumentNotFound,

    /// <summary>The document's type has no property with the requested alias.</summary>
    PropertyNotFound,
}

/// <summary>
/// A property's stored values, as <see cref="IContentService"/> loads them from the database, before any
/// property editor conversion.
/// </summary>
/// <param name="Status">Whether the value was found; the other members are empty unless it is <see cref="StoredValueStatus.Found"/>.</param>
/// <param name="Draft">The stored draft (edited) value as text, or null when nothing is stored.</param>
/// <param name="Published">The stored published value as text, or null when nothing is stored or the variant is not published.</param>
/// <param name="IsPublished">Whether the variant the value belongs to is published.</param>
/// <param name="StorageType">The database column the value lives in: <c>Ntext</c>, <c>Nvarchar</c>, <c>Integer</c>, <c>Decimal</c> or <c>Date</c>.</param>
public sealed record StoredValueResult(
    StoredValueStatus Status,
    string? Draft = null,
    string? Published = null,
    bool IsPublished = false,
    string? StorageType = null
);

/// <summary>Reads a document property's stored draft and published values.</summary>
public sealed class StoredValueReader(IContentService contentService)
{
    /// <summary>Reads the stored values of one property variant.</summary>
    /// <param name="documentKey">The document's key.</param>
    /// <param name="propertyAlias">The property type alias.</param>
    /// <param name="culture">
    /// The culture asked for. Ignored when the property does not vary by culture, because an invariant value is
    /// stored without one.
    /// </param>
    /// <param name="segment">The segment asked for. Ignored when the property does not vary by segment.</param>
    /// <returns>The values, or the reason they could not be read.</returns>
    public StoredValueResult Read(
        Guid documentKey,
        string propertyAlias,
        string? culture,
        string? segment
    )
    {
        IContent? content = contentService.GetById(documentKey);
        if (content is null)
        {
            return new StoredValueResult(StoredValueStatus.DocumentNotFound);
        }

        if (!content.Properties.TryGetValue(propertyAlias, out IProperty? property))
        {
            return new StoredValueResult(StoredValueStatus.PropertyNotFound);
        }

        // Property.GetValue returns null for a culture or segment the property type does not vary by,
        // so the variant the client is showing is narrowed to the one the value is stored under.
        string? valueCulture = property.PropertyType.VariesByCulture() ? culture : null;
        string? valueSegment = property.PropertyType.VariesBySegment() ? segment : null;

        bool isPublished = valueCulture is null
            ? content.Published
            : content.IsCulturePublished(valueCulture);

        return new StoredValueResult(
            StoredValueStatus.Found,
            Draft: AsText(property.GetValue(valueCulture, valueSegment, published: false)),
            Published: isPublished
                ? AsText(property.GetValue(valueCulture, valueSegment, published: true))
                : null,
            IsPublished: isPublished,
            StorageType: property.PropertyType.ValueStorageType.ToString()
        );
    }

    // Non-text storage types come back as int, decimal or DateTime; show them as invariant text so a
    // decimal never renders with a culture's comma.
    private static string? AsText(object? value) =>
        value switch
        {
            null => null,
            string text => text,
            DateTime date => date.ToString(
                "yyyy-MM-dd HH:mm:ss.FFFFFFF",
                CultureInfo.InvariantCulture
            ),
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString(),
        };
}
