import type { UmbLocalizationDictionary } from "@umbraco-cms/backoffice/localization-api";

/**
 * English terms. Merged into the backoffice's own dictionary, so `actionCategories` adds a heading for the
 * package's group of document permissions rather than replacing the core headings.
 */
export default {
  actionCategories: {
    propertyJsonViewer: "Property JSON Viewer",
  },
} satisfies UmbLocalizationDictionary;
