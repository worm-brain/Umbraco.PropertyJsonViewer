import { RAW_VALUE_MODAL_ALIAS } from "./constants.js";

/** The raw value drawer. The property action that opens it is registered at runtime (ADR 0002). */
export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "modal",
    alias: RAW_VALUE_MODAL_ALIAS,
    name: "Property JSON Viewer: Raw Value Modal",
    element: () => import("./raw-value-modal.element.js"),
  },
];
