import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import type { UmbEntryPointOnInit, UmbEntryPointOnUnload } from "@umbraco-cms/backoffice/extension-api";
import { syncViewRawValueAction } from "../raw-value/view-raw-value-registration.js";
import { isPackageEnabled } from "../settings/settings.api.js";

let stopSync: (() => void) | undefined;

/**
 * Runs once when the backoffice loads the package bundle. When the server says the package is enabled, keeps
 * the "View raw value" property action registered for every property editor UI (ADR 0002); when it is
 * disabled, registers nothing.
 *
 * @param host - The backoffice host element.
 * @param extensionRegistry - The registry the property action is registered in.
 */
export const onInit: UmbEntryPointOnInit = (host, extensionRegistry) => {
  let checked = false;
  // The settings request must carry the signed-in user's token, which is only available once the auth
  // context exists; the flag stops a re-provided context from checking (and registering) twice.
  host.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
    if (!authContext || checked) return;
    checked = true;
    void isPackageEnabled(host).then((enabled) => {
      if (!enabled) return;
      stopSync?.();
      stopSync = syncViewRawValueAction(extensionRegistry);
    });
  });
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
