using Umbraco.Cms.Core.Models;
using Umbraco.Community.PropertyJsonViewer.Features.StoredValue;
using Umbraco.Community.PropertyJsonViewer.Tests.Support;

namespace Umbraco.Community.PropertyJsonViewer.Tests.Features.StoredValue;

public sealed class StoredValueReaderTests
{
    [Fact]
    public void Read_PublishedInvariantProperty_ReturnsStoredDraftAndPublishedText()
    {
        var document = new TestDocument();
        Property blocks = document.AddProperty("blocks");
        blocks.SetValue("""{"layout":{}}""");
        blocks.PublishValues();
        blocks.SetValue("""{"layout":{"changed":true}}""");
        document.Publish();
        var reader = new StoredValueReader(document.ContentService());

        StoredValueResult result = reader.Read(
            document.Key,
            "blocks",
            culture: null,
            segment: null
        );

        Assert.Equal(
            new StoredValueResult(
                StoredValueStatus.Found,
                Draft: """{"layout":{"changed":true}}""",
                Published: """{"layout":{}}""",
                IsPublished: true,
                StorageType: "Ntext"
            ),
            result
        );
    }

    [Fact]
    public void Read_UnpublishedDocument_ReturnsNoPublishedValue()
    {
        var document = new TestDocument();
        Property heading = document.AddProperty("heading");
        heading.SetValue("Draft only");
        var reader = new StoredValueReader(document.ContentService());

        StoredValueResult result = reader.Read(
            document.Key,
            "heading",
            culture: null,
            segment: null
        );

        Assert.Equal((false, (string?)null), (result.IsPublished, result.Published));
    }

    [Fact]
    public void Read_CultureVariantProperty_ReturnsTheRequestedCulturesValue()
    {
        var document = new TestDocument().Publish("en-US");
        Property title = document.AddProperty("title", variations: ContentVariation.Culture);
        title.SetValue("Hello", culture: "en-US");
        title.SetValue("Hej", culture: "da-DK");
        var reader = new StoredValueReader(document.ContentService());

        StoredValueResult result = reader.Read(
            document.Key,
            "title",
            culture: "da-DK",
            segment: null
        );

        Assert.Equal(("Hej", false), (result.Draft, result.IsPublished));
    }

    [Fact]
    public void Read_InvariantPropertyViewedFromACulture_IgnoresTheCulture()
    {
        var document = new TestDocument();
        Property heading = document.AddProperty("heading");
        heading.SetValue("Shared across cultures");
        var reader = new StoredValueReader(document.ContentService());

        StoredValueResult result = reader.Read(
            document.Key,
            "heading",
            culture: "da-DK",
            segment: null
        );

        Assert.Equal("Shared across cultures", result.Draft);
    }

    [Fact]
    public void Read_SegmentVariantProperty_ReturnsTheRequestedSegmentsValue()
    {
        var document = new TestDocument();
        Property banner = document.AddProperty("banner", variations: ContentVariation.Segment);
        banner.SetValue("Everyone");
        banner.SetValue("Members only", segment: "members");
        var reader = new StoredValueReader(document.ContentService());

        StoredValueResult result = reader.Read(
            document.Key,
            "banner",
            culture: null,
            segment: "members"
        );

        Assert.Equal("Members only", result.Draft);
    }

    [Fact]
    public void Read_DecimalProperty_ReturnsInvariantText()
    {
        var document = new TestDocument();
        Property price = document.AddProperty("price", ValueStorageType.Decimal);
        price.SetValue(12.5m);
        var reader = new StoredValueReader(document.ContentService());

        StoredValueResult result = reader.Read(document.Key, "price", culture: null, segment: null);

        Assert.Equal(("12.5", "Decimal"), (result.Draft, result.StorageType));
    }

    [Fact]
    public void Read_PropertyWithNoValue_ReturnsNullDraft()
    {
        var document = new TestDocument();
        document.AddProperty("heading");
        var reader = new StoredValueReader(document.ContentService());

        StoredValueResult result = reader.Read(
            document.Key,
            "heading",
            culture: null,
            segment: null
        );

        Assert.Equal((StoredValueStatus.Found, (string?)null), (result.Status, result.Draft));
    }

    [Fact]
    public void Read_UnknownDocument_ReturnsDocumentNotFound()
    {
        var reader = new StoredValueReader(new TestDocument().ContentService());

        StoredValueResult result = reader.Read(
            Guid.NewGuid(),
            "heading",
            culture: null,
            segment: null
        );

        Assert.Equal(StoredValueStatus.DocumentNotFound, result.Status);
    }

    [Fact]
    public void Read_UnknownPropertyAlias_ReturnsPropertyNotFound()
    {
        var document = new TestDocument();
        document.AddProperty("heading");
        var reader = new StoredValueReader(document.ContentService());

        StoredValueResult result = reader.Read(
            document.Key,
            "missing",
            culture: null,
            segment: null
        );

        Assert.Equal(StoredValueStatus.PropertyNotFound, result.Status);
    }
}
