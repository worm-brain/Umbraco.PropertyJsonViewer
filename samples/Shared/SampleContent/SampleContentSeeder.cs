using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;

namespace PropertyJsonViewer.Samples.SampleContent;

/// <summary>
/// Seeds the sample site with a document type and a published page covering the property shapes the
/// package must handle: a plain string, a block list (JSON, with a property inside a block) and a data
/// type using a property editor UI that a separate "third-party" package registers
/// (each site's <c>wwwroot/App_Plugins/SampleThirdParty</c>). Runs once: it does nothing when the document type exists.
/// </summary>
/// <remarks>
/// Keys are fixed so e2e tests and manual checks can find the page and its block by key.
/// </remarks>
public sealed class SampleContentSeeder(
    IRuntimeState runtimeState,
    IContentTypeService contentTypeService,
    IDataTypeService dataTypeService,
    IContentService contentService,
    PropertyEditorCollection propertyEditors,
    IConfigurationEditorJsonSerializer configurationSerializer,
    IShortStringHelper shortStringHelper
) : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    /// <summary>Key of the seeded "Raw value test page" document.</summary>
    public static readonly Guid TestPageKey = new("5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a01");

    private static readonly Guid PageTypeKey = new("5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a02");
    private static readonly Guid BlockTypeKey = new("5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a03");
    private static readonly Guid BlockListDataTypeKey = new("5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a04");
    private static readonly Guid ThirdPartyDataTypeKey = new(
        "5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a05"
    );
    private static readonly Guid BlockContentKey = new("5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a06");

    /// <inheritdoc />
    public async Task HandleAsync(
        UmbracoApplicationStartedNotification notification,
        CancellationToken cancellationToken
    )
    {
        if (
            runtimeState.Level != RuntimeLevel.Run
            || contentTypeService.Get(PageTypeKey) is not null
        )
        {
            return;
        }

        Guid user = Constants.Security.SuperUserKey;
        IDataType textstring =
            await dataTypeService.GetAsync(Constants.DataTypes.Guids.TextstringGuid)
            ?? throw new InvalidOperationException("The default Textstring data type is missing.");

        // Element type used inside the block list.
        var blockType = new ContentType(shortStringHelper, Constants.System.Root)
        {
            Key = BlockTypeKey,
            Alias = "pjvTextBlock",
            Name = "Text block",
            Icon = "icon-document",
            IsElement = true,
        };
        blockType.AddPropertyType(
            new PropertyType(shortStringHelper, textstring, "title") { Name = "Title" },
            "content",
            "Content"
        );
        await contentTypeService.CreateAsync(blockType, user);

        IDataType blockList = await CreateDataTypeAsync(
            BlockListDataTypeKey,
            "PJV Block list",
            Constants.PropertyEditors.Aliases.BlockList,
            "Umb.PropertyEditorUi.BlockList",
            new Dictionary<string, object>
            {
                ["blocks"] = new[]
                {
                    new Dictionary<string, object> { ["contentElementTypeKey"] = BlockTypeKey },
                },
            },
            user
        );

        // A text box schema behind a UI that only the sample "third-party" package registers.
        IDataType thirdParty = await CreateDataTypeAsync(
            ThirdPartyDataTypeKey,
            "PJV Third-party editor",
            Constants.PropertyEditors.Aliases.TextBox,
            "Sample.PropertyEditorUi.ThirdParty",
            new Dictionary<string, object>(),
            user
        );

        var pageType = new ContentType(shortStringHelper, Constants.System.Root)
        {
            Key = PageTypeKey,
            Alias = "pjvTestPage",
            Name = "Raw value test page",
            Icon = "icon-brackets",
            AllowedAsRoot = true,
        };
        pageType.AddPropertyType(
            new PropertyType(shortStringHelper, textstring, "heading") { Name = "Heading" },
            "content",
            "Content"
        );
        pageType.AddPropertyType(
            new PropertyType(shortStringHelper, blockList, "blocks") { Name = "Blocks" },
            "content",
            "Content"
        );
        pageType.AddPropertyType(
            new PropertyType(shortStringHelper, thirdParty, "thirdParty")
            {
                Name = "Third-party value",
            },
            "content",
            "Content"
        );
        await contentTypeService.CreateAsync(pageType, user);

        IContent page = contentService.Create(
            "Raw value test page",
            Constants.System.Root,
            pageType
        );
        page.Key = TestPageKey;
        page.SetValue("heading", "Hello from the raw value test page");
        page.SetValue("blocks", BlockListValue());
        page.SetValue("thirdParty", "Stored by a third-party editor");
        contentService.Save(page);
        contentService.Publish(page, ["*"]);
    }

    private async Task<IDataType> CreateDataTypeAsync(
        Guid key,
        string name,
        string editorAlias,
        string editorUiAlias,
        Dictionary<string, object> configuration,
        Guid user
    )
    {
        if (!propertyEditors.TryGet(editorAlias, out IDataEditor? editor))
        {
            throw new InvalidOperationException($"No property editor with alias {editorAlias}.");
        }

        var dataType = new DataType(editor, configurationSerializer)
        {
            Key = key,
            Name = name,
            EditorUiAlias = editorUiAlias,
            ConfigurationData = configuration,
        };

        Attempt<
            IDataType,
            Umbraco.Cms.Core.Services.OperationStatus.DataTypeOperationStatus
        > result = await dataTypeService.CreateAsync(dataType, user);
        return result.Success
            ? result.Result
            : throw new InvalidOperationException(
                $"Could not create data type {name}: {result.Status}."
            );
    }

    // The stored block list format (Umbraco 15+): layout, content data and the expose list.
    private static string BlockListValue() =>
        $$"""
            {
              "layout": { "Umbraco.BlockList": [ { "contentKey": "{{BlockContentKey}}" } ] },
              "contentData": [
                {
                  "key": "{{BlockContentKey}}",
                  "contentTypeKey": "{{BlockTypeKey}}",
                  "values": [ { "alias": "title", "value": "A title inside a block" } ]
                }
              ],
              "settingsData": [],
              "expose": [ { "contentKey": "{{BlockContentKey}}", "culture": null, "segment": null } ]
            }
            """;
}

/// <summary>Registers <see cref="SampleContentSeeder"/>.</summary>
public sealed class SampleContentComposer : IComposer
{
    /// <inheritdoc />
    public void Compose(IUmbracoBuilder builder) =>
        builder.AddNotificationAsyncHandler<
            UmbracoApplicationStartedNotification,
            SampleContentSeeder
        >();
}
