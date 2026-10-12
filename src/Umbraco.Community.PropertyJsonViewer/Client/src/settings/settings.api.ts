import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { umbHttpClient } from "@umbraco-cms/backoffice/http-client";
import { tryExecute } from "@umbraco-cms/backoffice/resources";

/**
 * Asks the server whether the package is enabled. The settings endpoint, like every package endpoint, answers
 * 404 while `PropertyJsonViewer:Enabled` is false.
 *
 * @param host - The element or controller making the request.
 * @returns True only when the server answered successfully; any error (404, network) counts as disabled.
 */
export async function isPackageEnabled(host: UmbControllerHost): Promise<boolean> {
  const { error } = await tryExecute(
    host,
    umbHttpClient.get({
      security: [{ scheme: "bearer", type: "http" }],
      url: "/umbraco/management/api/v1/property-json-viewer/settings",
      throwOnError: true,
    }),
    { disableNotifications: true },
  );
  return !error;
}
