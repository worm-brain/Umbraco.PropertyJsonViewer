import {
  RAW_VALUE_MODAL_ALIAS,
  READ_PERMISSION,
  READ_PERMISSION_ALIAS,
  WRITE_PERMISSION,
  WRITE_PERMISSION_ALIAS,
} from "./constants.js";

/**
 * The raw value drawer and the document permissions that guard reading and writing. The property action that opens the drawer
 * is registered at runtime (ADR 0002).
 */
export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "modal",
    alias: RAW_VALUE_MODAL_ALIAS,
    name: "Property JSON Viewer: Raw Value Modal",
    element: () => import("./raw-value-modal.element.js"),
  },
  {
    // Listed under document permissions on user groups, both default and granular (per node).
    type: "entityUserPermission",
    alias: READ_PERMISSION_ALIAS,
    name: "Property JSON Viewer: Read Raw Values Document User Permission",
    forEntityTypes: ["document"],
    meta: {
      verbs: [READ_PERMISSION],
      label: "View raw property values",
      description: "Allow access to see the values Umbraco has stored for this document's properties",
      // Rendered as the heading "#actionCategories_<group>", defined in lang/en.ts.
      group: "propertyJsonViewer",
    },
  },
  {
    type: "entityUserPermission",
    alias: WRITE_PERMISSION_ALIAS,
    name: "Property JSON Viewer: Write Raw Values Document User Permission",
    forEntityTypes: ["document"],
    meta: {
      verbs: [WRITE_PERMISSION],
      label: "Write raw property values",
      description:
        "Allow saving a raw value straight to this document's draft, bypassing the property editor's checks. Also needs Update.",
      group: "propertyJsonViewer",
    },
  },
];
