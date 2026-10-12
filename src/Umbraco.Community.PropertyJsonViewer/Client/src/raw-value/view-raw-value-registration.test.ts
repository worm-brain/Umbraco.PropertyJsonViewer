import { describe, expect, it } from "vitest";
import { UmbExtensionRegistry, type ManifestBase } from "@umbraco-cms/backoffice/extension-api";
import { firstValueFrom } from "@umbraco-cms/backoffice/external/rxjs";
import type { ManifestPropertyAction } from "@umbraco-cms/backoffice/property-action";
import { VIEW_RAW_VALUE_ACTION_ALIAS } from "./constants.js";
import { syncViewRawValueAction } from "./view-raw-value-registration.js";

function editorUi(alias: string): ManifestBase {
  return { type: "propertyEditorUi", alias, name: alias };
}

async function registeredAction(registry: UmbExtensionRegistry<ManifestBase>) {
  const actions = await firstValueFrom(registry.byType("propertyAction"));
  return actions as Array<ManifestPropertyAction>;
}

describe("syncViewRawValueAction", () => {
  it("registers one action for every property editor UI already registered", async () => {
    const registry = new UmbExtensionRegistry<ManifestBase>();
    registry.register(editorUi("Umb.PropertyEditorUi.TextBox"));
    registry.register(editorUi("Umb.PropertyEditorUi.BlockList"));

    syncViewRawValueAction(registry);

    const actions = await registeredAction(registry);
    expect(actions.map((a) => [a.alias, a.forPropertyEditorUis])).toEqual([
      [VIEW_RAW_VALUE_ACTION_ALIAS, ["Umb.PropertyEditorUi.BlockList", "Umb.PropertyEditorUi.TextBox"]],
    ]);
  });

  it("adds property editor UIs that another package registers later", async () => {
    const registry = new UmbExtensionRegistry<ManifestBase>();
    registry.register(editorUi("Umb.PropertyEditorUi.TextBox"));
    syncViewRawValueAction(registry);

    registry.register(editorUi("Our.PropertyEditorUi.ThirdParty"));

    const [action] = await registeredAction(registry);
    expect(action?.forPropertyEditorUis).toEqual(["Our.PropertyEditorUi.ThirdParty", "Umb.PropertyEditorUi.TextBox"]);
  });

  it("stops following new property editor UIs once stopped", async () => {
    const registry = new UmbExtensionRegistry<ManifestBase>();
    registry.register(editorUi("Umb.PropertyEditorUi.TextBox"));
    const stop = syncViewRawValueAction(registry);

    stop();
    registry.register(editorUi("Our.PropertyEditorUi.ThirdParty"));

    const [action] = await registeredAction(registry);
    expect(action?.forPropertyEditorUis).toEqual(["Umb.PropertyEditorUi.TextBox"]);
  });
});
