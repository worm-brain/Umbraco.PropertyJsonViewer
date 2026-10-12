using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Community.PropertyJsonViewer.Features.StoredValue;

namespace Umbraco.Community.PropertyJsonViewer.Infrastructure;

/// <summary>Registers the package's services.</summary>
public sealed class PropertyJsonViewerComposer : IComposer
{
    /// <inheritdoc />
    public void Compose(IUmbracoBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.Services.AddScoped<StoredValueReader>();
    }
}
