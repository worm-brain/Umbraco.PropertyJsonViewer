import type { ManifestBase, UmbExtensionRegistry } from "@umbraco-cms/backoffice/extension-api";
import type { ManifestPropertyActionDefaultKind } from "@umbraco-cms/backoffice/property-action";
import { DOCUMENT_USER_PERMISSION_CONDITION_ALIAS, READ_PERMISSION, VIEW_RAW_VALUE_ACTION_ALIAS } from "./constants.js";

/** The registry members the sync uses, so tests can pass a small fake. */
export type ViewRawValueRegistry = Pick<
  UmbExtensionRegistry<ManifestBase>,
  "byType" | "register" | "unregister" | "isRegistered"
>;

/**
 * Builds the "View raw value" property action manifest for the given property editor UIs.
 *
 * @param propertyEditorUiAliases - Every property editor UI alias the action should appear on.
 * @returns The manifest to register.
 */
export function createViewRawValueManifest(propertyEditorUiAliases: Array<string>): ManifestPropertyActionDefaultKind {
  return {
    type: "propertyAction",
    kind: "default",
    alias: VIEW_RAW_VALUE_ACTION_ALIAS,
    name: "Property JSON Viewer: View Raw Value Property Action",
    // Low weight puts it after the core actions (Clear, Copy, Paste) in the menu.
    weight: -100,
    forPropertyEditorUis: propertyEditorUiAliases,
    conditions: [{ alias: DOCUMENT_USER_PERMISSION_CONDITION_ALIAS, allOf: [READ_PERMISSION] }],
    api: () => import("./view-raw-value.property-action.js"),
    meta: {
      icon: "icon-brackets",
      label: "View raw value",
    },
  };
}

/**
 * Keeps the "View raw value" action registered for every property editor UI, including ones that other
 * packages register later.
 *
 * Property action menus only show an action whose `forPropertyEditorUis` lists the property's editor UI
 * alias, and there is no wildcard (ADR 0002). So this watches the `propertyEditorUi` extensions and
 * re-registers the action whenever the set of aliases changes.
 *
 * @param registry - The backoffice extension registry.
 * @returns A function that stops watching. It leaves the last registration in place.
 */
export function syncViewRawValueAction(registry: ViewRawValueRegistry): () => void {
  let registeredKey: string | undefined;

  const subscription = registry.byType("propertyEditorUi").subscribe((editorUis) => {
    const aliases = [...new Set(editorUis.map((ui) => ui.alias))].sort();
    const key = aliases.join("\n");
    // The registry emits on every registration of any kind; only re-register when the aliases changed,
    // because each re-registration re-creates the action in every open property menu.
    if (key === registeredKey) return;
    registeredKey = key;

    if (registry.isRegistered(VIEW_RAW_VALUE_ACTION_ALIAS)) {
      registry.unregister(VIEW_RAW_VALUE_ACTION_ALIAS);
    }
    registry.register(createViewRawValueManifest(aliases));
  });

  return () => subscription.unsubscribe();
}
