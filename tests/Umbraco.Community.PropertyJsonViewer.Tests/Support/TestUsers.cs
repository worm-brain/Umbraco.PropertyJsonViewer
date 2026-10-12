using NSubstitute;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Models.Membership.Permissions;

namespace Umbraco.Community.PropertyJsonViewer.Tests.Support;

/// <summary>Builds backoffice users for tests from the permissions their single user group holds.</summary>
internal static class TestUsers
{
    /// <summary>A user whose one group has these default permissions and these granular permissions.</summary>
    public static IUser WithGroup(
        IEnumerable<string> permissions,
        IEnumerable<IGranularPermission>? granularPermissions = null
    )
    {
        IReadOnlyUserGroup group = Substitute.For<IReadOnlyUserGroup>();
        group.Permissions.Returns(new HashSet<string>(permissions));
        group.GranularPermissions.Returns(
            new HashSet<IGranularPermission>(granularPermissions ?? [])
        );

        IUser user = Substitute.For<IUser>();
        user.Id.Returns(42);
        user.Groups.Returns([group]);
        return user;
    }
}
