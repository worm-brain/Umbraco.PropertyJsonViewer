import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { umbHttpClient } from "@umbraco-cms/backoffice/http-client";
import { tryExecute } from "@umbraco-cms/backoffice/resources";
import type { StoredValueRequest } from "./stored-value.api.js";

/**
 * Turns the text typed in the drawer into the value to store.
 *
 * - Empty (or whitespace-only) text clears the stored value.
 * - Valid JSON is stored compact, the way property editors store it, so a raw save does not leave the
 *   drawer's pretty-printing in the database.
 * - Anything else is sent exactly as typed; if the stored value was JSON the server rejects it and says why.
 *
 * @param text - The text from the edit form.
 * @returns The value to send, or null to clear the stored value.
 */
export function prepareRawValue(text: string): string | null {
  if (text.trim() === "") return null;

  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(trimmed));
    } catch {
      // Not valid JSON: send it as typed and let the server decide (it rejects it over a JSON value).
    }
  }

  return text;
}

/**
 * Writes a raw value to the document property's draft through the package's Management API endpoint.
 *
 * @param host - The element or controller making the request.
 * @param request - The property variant to write.
 * @param value - The value to store, as {@link prepareRawValue} returned it.
 * @returns An error (400 with the reason, 403, 404) for the caller to show, or none when saved.
 */
export async function saveRawValue(host: UmbControllerHost, request: StoredValueRequest, value: string | null) {
  return tryExecute(
    host,
    umbHttpClient.put({
      security: [{ scheme: "bearer", type: "http" }],
      url: "/umbraco/management/api/v1/property-json-viewer/stored-value",
      body: { ...request, value },
      headers: { "Content-Type": "application/json" },
      throwOnError: true,
    }),
    { disableNotifications: true },
  );
}
