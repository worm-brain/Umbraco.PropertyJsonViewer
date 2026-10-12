/** The package's backoffice terms. English only; other cultures fall back to it. */
export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "localization",
    alias: "Umbraco.Community.PropertyJsonViewer.Localization.En",
    name: "Property JSON Viewer English Localization",
    meta: { culture: "en" },
    js: () => import("./en.js"),
  },
];
