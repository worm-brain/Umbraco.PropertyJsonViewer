import type { UmbEntryPointOnInit, UmbEntryPointOnUnload } from "@umbraco-cms/backoffice/extension-api";
import { syncViewRawValueAction } from "../raw-value/view-raw-value-registration.js";

let stopSync: (() => void) | undefined;

/**
 * Runs once when the backoffice loads the package bundle. Starts keeping the "View raw value" property
 * action registered for every property editor UI (ADR 0002).
 *
 * @param _host - The backoffice host element.
 * @param extensionRegistry - The registry the property action is registered in.
 */
export const onInit: UmbEntryPointOnInit = (_host, extensionRegistry) => {
  stopSync?.();
  stopSync = syncViewRawValueAction(extensionRegistry);
};

/**
 * Stops watching the property editor UIs when the backoffice unloads the package.
 *
 * @param _host - The backoffice host element.
 * @param _extensionRegistry - The extension registry.
 */
export const onUnload: UmbEntryPointOnUnload = (_host, _extensionRegistry) => {
  stopSync?.();
  stopSync = undefined;
};
