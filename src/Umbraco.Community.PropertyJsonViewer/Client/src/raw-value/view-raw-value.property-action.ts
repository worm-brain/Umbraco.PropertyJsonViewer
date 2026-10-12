import { umbOpenModal } from "@umbraco-cms/backoffice/modal";
import { UMB_PROPERTY_CONTEXT, UMB_PROPERTY_DATASET_CONTEXT } from "@umbraco-cms/backoffice/property";
import { UmbPropertyActionBase } from "@umbraco-cms/backoffice/property-action";
import type { MetaPropertyActionDefaultKind } from "@umbraco-cms/backoffice/property-action";
import { RAW_VALUE_MODAL, type RawValueModalData } from "./raw-value-modal.token.js";

/** Opens the raw value drawer for the property whose "..." menu it sits in. */
export class ViewRawValuePropertyAction extends UmbPropertyActionBase<MetaPropertyActionDefaultKind> {
  override async execute(): Promise<void> {
    const property = await this.getContext(UMB_PROPERTY_CONTEXT);
    const dataset = await this.getContext(UMB_PROPERTY_DATASET_CONTEXT);
    if (!property || !dataset) {
      throw new Error("The View raw value action needs a property and a property dataset context.");
    }

    const editorManifest = property.getEditorManifest();
    const variantId = property.getVariantId();
    const data: RawValueModalData = {
      propertyLabel: property.getLabel() ?? "",
      propertyAlias: property.getAlias() ?? "",
      culture: variantId?.culture ?? null,
      segment: variantId?.segment ?? null,
      editorUiAlias: editorManifest?.alias ?? "",
      editorSchemaAlias: editorManifest?.meta.propertyEditorSchemaAlias,
      entityType: dataset.getEntityType(),
      unique: dataset.getUnique() ?? null,
    };

    // The modal rejects when it is closed without submitting, which is the only way this drawer closes.
    await umbOpenModal(this, RAW_VALUE_MODAL, { data }).catch(() => undefined);
  }
}

export { ViewRawValuePropertyAction as api };
