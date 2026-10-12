import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import { RAW_VALUE_MODAL_ALIAS } from "./constants.js";

/** What the "View raw value" action knows about the property when it opens the drawer. */
export interface RawValueModalData {
  /** The property's label as configured, which may be a localisation key such as `#general_name`. */
  propertyLabel: string;
  propertyAlias: string;
  /** Null when the property does not vary by culture. */
  culture: string | null;
  /** Null when the property does not vary by segment. */
  segment: string | null;
  /** The property editor UI alias, for example `Umb.PropertyEditorUi.BlockList`. */
  editorUiAlias: string;
  /** The property editor schema alias, for example `Umbraco.BlockList`, when the UI declares one. */
  editorSchemaAlias: string | undefined;
  /**
   * Entity type of the nearest property dataset: `document` for a document property, `element` for a
   * property inside a block (ADR 0003).
   */
  entityType: string;
  /** Key of that entity (the document key for a document property), or null when it has none yet. */
  unique: string | null;
}

/** The raw value drawer: a large sidebar modal, so it slides in like infinite editing. */
export const RAW_VALUE_MODAL = new UmbModalToken<RawValueModalData, never>(RAW_VALUE_MODAL_ALIAS, {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
