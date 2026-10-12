/** Manifests for the package's backoffice entry point. */
export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Umbraco Community Property JSON Viewer Entrypoint",
    alias: "Umbraco.Community.PropertyJsonViewer.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint.js"),
  },
];
