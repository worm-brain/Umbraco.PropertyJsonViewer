using NSubstitute;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Models.Membership.Permissions;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.PropertyJsonViewer.Features.RawSave;
using Umbraco.Community.PropertyJsonViewer.Tests.Support;

namespace Umbraco.Community.PropertyJsonViewer.Tests.Features.RawSave;

public sealed class RawValueWriterTests
{
    private static readonly IUser PropertyWriter = TestUsers.WithGroup([
        ActionDocumentPropertyWrite.ActionLetter,
    ]);

    [Fact]
    public void Write_ValidJsonOverStoredJson_SavesItToTheDraftAsTheUser()
    {
        var document = new TestDocument();
        Property blocks = document.AddProperty("blocks");
        blocks.SetValue("""{"layout":{}}""");
        IContentService contentService = document.ContentService();

        RawSaveResult result = new RawValueWriter(contentService).Write(
            PropertyWriter,
            document.Key,
            "blocks",
            null,
            null,
            """{"layout":{"fixed":true}}"""
        );

        Assert.Equal(
            (RawSaveStatus.Saved, (object?)"""{"layout":{"fixed":true}}"""),
            (result.Status, blocks.GetValue())
        );
        contentService
            .Received(1)
            .Save(Arg.Any<IContent>(), 42, Arg.Any<ContentScheduleCollection?>());
    }

    [Fact]
    public void Write_InvalidJsonOverStoredJson_IsRejectedAndNotSaved()
    {
        var document = new TestDocument();
        Property blocks = document.AddProperty("blocks");
        blocks.SetValue("""{"layout":{}}""");
        IContentService contentService = document.ContentService();

        RawSaveResult result = new RawValueWriter(contentService).Write(
            PropertyWriter,
            document.Key,
            "blocks",
            null,
            null,
            """{"layout": """
        );

        Assert.Equal(
            new RawSaveResult(
                RawSaveStatus.Invalid,
                "The stored value is JSON, and the new value is not valid JSON."
            ),
            result
        );
        contentService
            .DidNotReceive()
            .Save(Arg.Any<IContent>(), Arg.Any<int?>(), Arg.Any<ContentScheduleCollection?>());
    }

    [Fact]
    public void Write_PlainTextOverStoredText_IsSaved()
    {
        var document = new TestDocument();
        Property heading = document.AddProperty("heading", ValueStorageType.Nvarchar);
        heading.SetValue("Old");

        RawSaveResult result = new RawValueWriter(document.ContentService()).Write(
            PropertyWriter,
            document.Key,
            "heading",
            null,
            null,
            "New {not json"
        );

        Assert.Equal(
            (RawSaveStatus.Saved, (object?)"New {not json"),
            (result.Status, heading.GetValue())
        );
    }

    [Fact]
    public void Write_NumberToIntegerProperty_StoresAnInteger()
    {
        var document = new TestDocument();
        Property count = document.AddProperty("count", ValueStorageType.Integer);

        new RawValueWriter(document.ContentService()).Write(
            PropertyWriter,
            document.Key,
            "count",
            null,
            null,
            "7"
        );

        Assert.Equal(7, count.GetValue());
    }

    [Theory]
    [InlineData(ValueStorageType.Integer, "seven")]
    [InlineData(ValueStorageType.Decimal, "1,5")]
    [InlineData(ValueStorageType.Date, "not a date")]
    public void Write_ValueTheStorageTypeCannotHold_IsRejected(
        ValueStorageType storageType,
        string value
    )
    {
        var document = new TestDocument();
        document.AddProperty("field", storageType);

        RawSaveResult result = new RawValueWriter(document.ContentService()).Write(
            PropertyWriter,
            document.Key,
            "field",
            null,
            null,
            value
        );

        Assert.Equal(RawSaveStatus.Invalid, result.Status);
    }

    [Fact]
    public void Write_ValueLongerThanTheNvarcharColumn_IsRejected()
    {
        var document = new TestDocument();
        document.AddProperty("heading", ValueStorageType.Nvarchar);

        RawSaveResult result = new RawValueWriter(document.ContentService()).Write(
            PropertyWriter,
            document.Key,
            "heading",
            null,
            null,
            new string('x', 513)
        );

        Assert.Equal(RawSaveStatus.Invalid, result.Status);
    }

    [Fact]
    public void Write_NullValue_ClearsTheStoredValue()
    {
        var document = new TestDocument();
        Property heading = document.AddProperty("heading");
        heading.SetValue("Old");

        new RawValueWriter(document.ContentService()).Write(
            PropertyWriter,
            document.Key,
            "heading",
            null,
            null,
            null
        );

        Assert.Null(heading.GetValue());
    }

    [Fact]
    public void Write_CultureVariantProperty_WritesOnlyThatCulture()
    {
        var document = new TestDocument();
        Property title = document.AddProperty("title", variations: ContentVariation.Culture);
        title.SetValue("Hello", culture: "en-US");

        new RawValueWriter(document.ContentService()).Write(
            PropertyWriter,
            document.Key,
            "title",
            "da-DK",
            null,
            "Hej"
        );

        Assert.Equal(("Hello", "Hej"), (title.GetValue("en-US"), title.GetValue("da-DK")));
    }

    [Fact]
    public void Write_UserWithoutPropertyWriteByDefault_IsDenied()
    {
        var document = new TestDocument();
        document.AddProperty("heading");
        IUser readOnlyUser = TestUsers.WithGroup([ActionDocumentPropertyRead.ActionLetter]);

        RawSaveResult result = new RawValueWriter(document.ContentService()).Write(
            readOnlyUser,
            document.Key,
            "heading",
            null,
            null,
            "New"
        );

        Assert.Equal(RawSaveStatus.PropertyWriteDenied, result.Status);
    }

    [Fact]
    public void Write_GranularReadOnlyOnThisProperty_OverridesTheDefaultWrite()
    {
        var document = new TestDocument();
        Property heading = document.AddProperty("heading");
        IUser user = TestUsers.WithGroup(
            [ActionDocumentPropertyWrite.ActionLetter],
            [PropertyPermission(document, heading, ActionDocumentPropertyRead.ActionLetter)]
        );

        RawSaveResult result = new RawValueWriter(document.ContentService()).Write(
            user,
            document.Key,
            "heading",
            null,
            null,
            "New"
        );

        Assert.Equal(RawSaveStatus.PropertyWriteDenied, result.Status);
    }

    [Fact]
    public void Write_GranularWriteOnThisProperty_OverridesTheDefaultReadOnly()
    {
        var document = new TestDocument();
        Property heading = document.AddProperty("heading");
        IUser user = TestUsers.WithGroup(
            [ActionDocumentPropertyRead.ActionLetter],
            [PropertyPermission(document, heading, ActionDocumentPropertyWrite.ActionLetter)]
        );

        RawSaveResult result = new RawValueWriter(document.ContentService()).Write(
            user,
            document.Key,
            "heading",
            null,
            null,
            "New"
        );

        Assert.Equal(RawSaveStatus.Saved, result.Status);
    }

    [Fact]
    public void Write_SaveCancelledByANotificationHandler_ReturnsCancelled()
    {
        var document = new TestDocument { CancelSaves = true };
        document.AddProperty("heading");

        RawSaveResult result = new RawValueWriter(document.ContentService()).Write(
            PropertyWriter,
            document.Key,
            "heading",
            null,
            null,
            "New"
        );

        Assert.Equal(RawSaveStatus.Cancelled, result.Status);
    }

    [Fact]
    public void Write_UnknownDocument_ReturnsDocumentNotFound()
    {
        RawSaveResult result = new RawValueWriter(new TestDocument().ContentService()).Write(
            PropertyWriter,
            Guid.NewGuid(),
            "heading",
            null,
            null,
            "New"
        );

        Assert.Equal(RawSaveStatus.DocumentNotFound, result.Status);
    }

    private static DocumentPropertyValueGranularPermission PropertyPermission(
        TestDocument document,
        Property property,
        string verb
    ) =>
        new()
        {
            Key = document.DocumentTypeKey,
            Permission = $"{property.PropertyType.Key}|{verb}",
        };
}
