import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { umbHttpClient } from "@umbraco-cms/backoffice/http-client";
import { tryExecute } from "@umbraco-cms/backoffice/resources";

/** A document property's stored values, as `GET /property-json-viewer/stored-value` returns them. */
export interface StoredValueResponse {
  /** The stored draft value as text; null when nothing is stored. */
  draft: string | null;
  /** The stored published value as text; null when nothing is stored or the variant is not published. */
  published: string | null;
  isPublished: boolean;
  /** The database column type: `Ntext`, `Nvarchar`, `Integer`, `Decimal` or `Date`. */
  storageType: string;
}

/** Which property variant to read. */
export interface StoredValueRequest {
  documentId: string;
  propertyAlias: string;
  culture: string | null;
  segment: string | null;
}

/**
 * Reads a document property's stored values from the package's Management API endpoint, as the signed-in
 * backoffice user.
 *
 * @param host - The element or controller making the request.
 * @param request - The property variant to read.
 * @returns The values, or an error (403, 404, network) for the caller to show; no notification is raised.
 */
export async function fetchStoredValue(host: UmbControllerHost, request: StoredValueRequest) {
  return tryExecute(
    host,
    umbHttpClient.get<{ 200: StoredValueResponse }, unknown, true>({
      security: [{ scheme: "bearer", type: "http" }],
      url: "/umbraco/management/api/v1/property-json-viewer/stored-value",
      query: {
        documentId: request.documentId,
        propertyAlias: request.propertyAlias,
        culture: request.culture ?? undefined,
        segment: request.segment ?? undefined,
      },
      throwOnError: true,
    }),
    // The tab shows the problem in place; a toast as well would be noise.
    { disableNotifications: true },
  );
}
