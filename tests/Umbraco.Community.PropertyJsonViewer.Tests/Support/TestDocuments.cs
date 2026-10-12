using NSubstitute;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;

namespace Umbraco.Community.PropertyJsonViewer.Tests.Support;

/// <summary>
/// Builds documents for tests: a substitute <see cref="IContent"/> holding real <see cref="Property"/> objects,
/// so property values, variation and publishing behave as Umbraco's own models do.
/// </summary>
internal sealed class TestDocument
{
    private static readonly IShortStringHelper ShortStringHelper = new DefaultShortStringHelper(
        new DefaultShortStringHelperConfig()
    );

    private readonly List<IProperty> _properties = [];
    private readonly HashSet<string> _publishedCultures = new(StringComparer.OrdinalIgnoreCase);

    public Guid Key { get; } = Guid.NewGuid();

    public bool Published { get; private set; }

    /// <summary>Adds a property and returns it so the test can set its draft and published values.</summary>
    public Property AddProperty(
        string alias,
        ValueStorageType storageType = ValueStorageType.Ntext,
        ContentVariation variations = ContentVariation.Nothing
    )
    {
        var propertyType = new PropertyType(
            ShortStringHelper,
            "Umbraco.TextBox",
            storageType,
            forceValueStorageType: true,
            alias
        )
        {
            Variations = variations,
            // Document property types support publishing; without it Property keeps no published value.
            SupportsPublishing = true,
        };
        var property = new Property(propertyType);
        _properties.Add(property);
        return property;
    }

    /// <summary>Marks the document (or one of its cultures) as published.</summary>
    public TestDocument Publish(string? culture = null)
    {
        Published = true;
        if (culture is not null)
        {
            _publishedCultures.Add(culture);
        }

        return this;
    }

    /// <summary>A content service that returns this document for its key and nothing for any other key.</summary>
    public IContentService ContentService()
    {
        IContent content = Substitute.For<IContent>();
        content.Key.Returns(Key);
        content.Properties.Returns(new PropertyCollection(_properties));
        content.Published.Returns(_ => Published);
        content
            .IsCulturePublished(Arg.Any<string>())
            .Returns(call => _publishedCultures.Contains(call.Arg<string>()));

        IContentService service = Substitute.For<IContentService>();
        // NSubstitute would otherwise return an auto-created IContent for every other key.
        service.GetById(Arg.Any<Guid>()).Returns((IContent?)null);
        service.GetById(Key).Returns(content);
        return service;
    }
}
