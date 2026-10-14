// The "View raw value" property action and the drawer it opens: the property's details and the Editor, Stored
// and Diff tabs, on the sample sites' seeded "Raw value test page".
import {
  chooseTab,
  openBlock,
  openDrawer,
  openPropertyActions,
  openTestPage,
  property,
  TEST_BLOCK_ID,
  valueText,
} from "./support/raw-value.js";
import { expect, test } from "./support/test.js";

test.beforeEach(async ({ page }) => {
  await openTestPage(page);
});

test.describe("the property action", () => {
  for (const alias of ["heading", "blocks", "thirdParty"] as const) {
    test(`is in the "..." menu of the ${alias} property`, async ({ page }) => {
      const action = await openPropertyActions(page, alias);

      await expect(action).toBeVisible();
    });
  }

  test("opens the drawer for a property whose editor comes from another package", async ({ page }) => {
    const drawer = await openDrawer(page, "thirdParty");

    await expect(drawer.getByRole("heading", { name: "Raw value: Third-party value" })).toBeVisible();
    await expect(
      drawer.getByRole("definition").filter({ hasText: "Sample.PropertyEditorUi.ThirdParty" }),
    ).toBeVisible();
  });
});

test("the drawer names the property, its variant and its editor", async ({ page }) => {
  const drawer = await openDrawer(page, "blocks");

  await expect(drawer.getByRole("heading", { name: "Raw value: Blocks" })).toBeVisible();
  const details = drawer.getByRole("definition");
  await expect(details).toHaveText([
    "blocks",
    "Invariant",
    "None",
    "Umbraco.BlockList (UI Umb.PropertyEditorUi.BlockList)",
  ]);
});

test.describe("the Stored tab", () => {
  test("is where the drawer opens, and shows a block list as it is stored", async ({ page }) => {
    const drawer = await openDrawer(page, "blocks");

    const panel = drawer.getByRole("tabpanel", { name: "Stored" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Ntext", { exact: true })).toBeVisible();
    const draft = JSON.parse(await valueText(drawer, "Stored draft value"));
    // Stored, not as the editor holds it: layout items carry only their content key.
    expect(draft.layout["Umbraco.BlockList"]).toEqual([{ contentKey: TEST_BLOCK_ID }]);
    expect(draft.contentData[0].values[0]).toEqual({ alias: "title", value: "A title inside a block" });
  });

  test("shows the stored published value of a published property", async ({ page }) => {
    const drawer = await openDrawer(page, "heading");

    const panel = drawer.getByRole("tabpanel", { name: "Stored" });
    await expect(panel.getByText("Nvarchar", { exact: true })).toBeVisible();
    expect(await valueText(drawer, "Stored draft value")).toBe("Hello from the raw value test page");
    expect(await valueText(drawer, "Stored published value")).toBe("Hello from the raw value test page");
  });
});

test.describe("the Editor tab", () => {
  test("shows the value the editor holds, unsaved edits included", async ({ page }) => {
    await property(page, "heading").getByRole("textbox", { name: "Field for Heading" }).fill("An unsaved heading");

    const drawer = await openDrawer(page, "heading");
    await chooseTab(drawer, "Editor");

    expect(await valueText(drawer, "Editor value")).toBe("An unsaved heading");
  });

  test("shows a block list the way its editor holds it", async ({ page }) => {
    const drawer = await openDrawer(page, "blocks");
    await chooseTab(drawer, "Editor");

    const editorValue = JSON.parse(await valueText(drawer, "Editor value"));
    expect(editorValue.layout["Umbraco.BlockList"][0]).toHaveProperty("$type");
  });
});

test.describe("the Diff tab", () => {
  test("says when the editor value and the stored draft are the same", async ({ page }) => {
    const drawer = await openDrawer(page, "heading");
    const panel = await chooseTab(drawer, "Diff");

    await expect(panel.getByText("The editor value and the stored draft are the same.")).toBeVisible();
  });

  test("puts the stored draft and the editor value side by side when they differ", async ({ page }) => {
    await property(page, "heading").getByRole("textbox", { name: "Field for Heading" }).fill("An unsaved heading");

    const drawer = await openDrawer(page, "heading");
    const panel = await chooseTab(drawer, "Diff");

    await expect(panel.getByText("Left: stored draft. Right: editor value.")).toBeVisible();
    const diff = panel.getByRole("region", { name: "Differences between the stored draft and the editor value" });
    await expect(diff.getByRole("textbox", { name: "Stored draft" })).toBeAttached();
    await expect(diff.getByRole("textbox", { name: "Editor value" })).toBeAttached();
    await expect(diff).toContainText("An unsaved heading");
  });
});

test("the drawer reopens on the tab last chosen", async ({ page }) => {
  let drawer = await openDrawer(page, "blocks");
  await chooseTab(drawer, "Diff");
  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(drawer).toHaveCount(0);

  drawer = await openDrawer(page, "heading");

  await expect(drawer.getByRole("tabpanel", { name: "Diff" })).toBeVisible();
});

test("a property inside a block has only the Editor tab, and says where its value is stored", async ({ page }) => {
  const blockEditor = await openBlock(page);

  const drawer = await openDrawer(blockEditor, "title");

  await expect(drawer.getByRole("heading", { name: "Raw value: Title" })).toBeVisible();
  await expect(drawer.getByRole("tab")).toHaveText(["Editor"]);
  await expect(drawer.getByText(/This property is inside a block, so it has no stored value of its own/)).toBeVisible();
  expect(await valueText(drawer, "Editor value")).toBe("A title inside a block");
});
