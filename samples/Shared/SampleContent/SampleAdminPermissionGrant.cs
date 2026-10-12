using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.PropertyJsonViewer.Infrastructure;

namespace PropertyJsonViewer.Samples.SampleContent;

/// <summary>
/// Sample sites only: gives the Administrators group the package's read and write permissions on every start,
/// so the drawer works straight after a fresh install. The package itself grants it to nobody; on a real site an
/// administrator assigns it under Users > User Groups.
/// </summary>
public sealed class SampleAdminPermissionGrant(
    IRuntimeState runtimeState,
    IUserGroupService userGroupService
) : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    /// <inheritdoc />
    public async Task HandleAsync(
        UmbracoApplicationStartedNotification notification,
        CancellationToken cancellationToken
    )
    {
        if (runtimeState.Level != RuntimeLevel.Run)
        {
            return;
        }

        IUserGroup? administrators = await userGroupService.GetAsync(
            Constants.Security.AdminGroupKey
        );
        if (administrators is null)
        {
            return;
        }

        // Add returns false for a permission the group already has; only save when something was added.
        bool addedRead = administrators.Permissions.Add(PropertyJsonViewerPermissions.Read);
        bool addedWrite = administrators.Permissions.Add(PropertyJsonViewerPermissions.Write);
        if (!addedRead && !addedWrite)
        {
            return;
        }

        await userGroupService.UpdateAsync(administrators, Constants.Security.SuperUserKey);
    }
}

/// <summary>Registers <see cref="SampleAdminPermissionGrant"/>.</summary>
public sealed class SampleAdminPermissionGrantComposer : IComposer
{
    /// <inheritdoc />
    public void Compose(IUmbracoBuilder builder) =>
        builder.AddNotificationAsyncHandler<
            UmbracoApplicationStartedNotification,
            SampleAdminPermissionGrant
        >();
}
