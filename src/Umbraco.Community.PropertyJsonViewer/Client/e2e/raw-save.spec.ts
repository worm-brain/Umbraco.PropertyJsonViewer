// Raw saves and their safety rails: the warning, the review of the difference, confirmation by typing the
// property alias, the refusal while the document has unsaved changes, and the server's own checks.
//
// The saves write only to the test page's third-party property, which no other spec reads, and each one
// stores a new value, so the specs pass on a site that has run them before. They run in order, because they
// read and write the same stored value.
import type { Locator, Page } from "@playwright/test";
import { chooseTab, openDrawer, openTestPage, property, valueText } from "./support/raw-value.js";
import { expect, test } from "./support/test.js";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await openTestPage(page);
});

/** Opens the third-party property's drawer on the Stored tab and starts a raw edit. */
async function startEdit(page: Page): Promise<{ drawer: Locator; stored: string }> {
  const drawer = await openDrawer(page, "thirdParty");
  await chooseTab(drawer, "Stored");
  const stored = await valueText(drawer, "Stored draft value");
  await drawer.getByRole("button", { name: "Edit raw value" }).click();
  await expect(drawer.getByRole("heading", { name: "Edit stored draft" })).toBeVisible();
  return { drawer, stored };
}

test("a raw save warns, shows the difference and needs the alias typed exactly", async ({ page }) => {
  const { drawer, stored } = await startEdit(page);
  const value = `Raw saved ${Date.now()}`;

  // Editing: the warning is shown above the stored draft, ready to change.
  await expect(drawer.getByRole("note")).toContainText("This writes straight to the database.");
  const editor = drawer.getByRole("textbox", { name: "New raw value" });
  await expect(editor).toHaveValue(stored);
  await editor.fill(value);
  await drawer.getByRole("button", { name: "Review changes" }).click();

  // Review: the difference, and a save button that stays off until the alias is typed with the right case.
  await expect(drawer.getByText("Left: stored draft. Right: the value that will be saved.")).toBeVisible();
  const diff = drawer.getByRole("region", { name: /^Differences between/ });
  await expect(diff.getByRole("textbox", { name: "Value to save" })).toBeAttached();
  await expect(diff).toContainText(value);
  const save = drawer.getByRole("button", { name: "Save raw value" });
  const confirmation = drawer.getByRole("textbox", { name: "Type thirdParty to confirm" });
  await expect(save).toBeDisabled();
  await confirmation.fill("thirdparty");
  await expect(save).toBeDisabled();
  await confirmation.fill("thirdParty");
  await expect(save).toBeEnabled();

  await save.click();

  // Saved to the draft only, and the open document has reloaded with the new value.
  await expect(drawer.getByRole("status")).toContainText("Raw value saved to the draft. It is not published");
  await expect(drawer.getByRole("heading", { name: "Stored draft", exact: true })).toBeVisible();
  expect(await valueText(drawer, "Stored draft value")).toBe(value);
  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(property(page, "thirdParty").locator("input")).toHaveValue(value);
});

test("review offers nothing to save when the value has not changed", async ({ page }) => {
  const { drawer } = await startEdit(page);

  await drawer.getByRole("button", { name: "Review changes" }).click();

  await expect(
    drawer.getByText("The new value is the same as the stored draft. There is nothing to save."),
  ).toBeVisible();
  await expect(drawer.getByRole("textbox", { name: /to confirm$/ })).toHaveCount(0);
  await expect(drawer.getByRole("button", { name: "Save raw value" })).toBeDisabled();
});

test("a raw save is refused while the document has unsaved changes", async ({ page }) => {
  await property(page, "heading").getByRole("textbox", { name: "Field for Heading" }).fill("An unsaved heading");
  const { drawer, stored } = await startEdit(page);
  await drawer.getByRole("textbox", { name: "New raw value" }).fill(`Never saved ${Date.now()}`);
  await drawer.getByRole("button", { name: "Review changes" }).click();
  await drawer.getByRole("textbox", { name: "Type thirdParty to confirm" }).fill("thirdParty");

  await drawer.getByRole("button", { name: "Save raw value" }).click();

  await expect(drawer.getByRole("alert")).toContainText("This document has unsaved changes.");
  await drawer.getByRole("button", { name: "Back to editing" }).click();
  await drawer.getByRole("button", { name: "Cancel" }).click();
  expect(await valueText(drawer, "Stored draft value")).toBe(stored);
  // Cancel ends the edit, not the drawer: it stays open and usable.
  await expect(drawer.getByRole("button", { name: "Edit raw value" })).toBeVisible();
  await chooseTab(drawer, "Diff");
});

test.describe("the server's checks", () => {
  // The browser logs the refused request itself, as "Failed to load resource: ... status of 400".
  test.use({ expectedConsoleErrors: [/status of 400 .*\/property-json-viewer\/stored-value/] });

  test("the server refuses a value that is not JSON over a stored JSON value", async ({ page }) => {
    const drawer = await openDrawer(page, "blocks");
    await chooseTab(drawer, "Stored");
    const stored = await valueText(drawer, "Stored draft value");
    await drawer.getByRole("button", { name: "Edit raw value" }).click();

    // The stored block list is JSON, so the raw editor is Umbraco's code editor: replace its text from the keyboard.
    await drawer.getByRole("textbox", { name: "New raw value" }).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText("not json");
    await drawer.getByRole("button", { name: "Review changes" }).click();
    await drawer.getByRole("textbox", { name: "Type blocks to confirm" }).fill("blocks");
    await drawer.getByRole("button", { name: "Save raw value" }).click();

    await expect(drawer.getByRole("alert")).toHaveText(
      "The stored value is JSON, and the new value is not valid JSON.",
    );
    await drawer.getByRole("button", { name: "Back to editing" }).click();
    await drawer.getByRole("button", { name: "Cancel" }).click();
    expect(await valueText(drawer, "Stored draft value")).toBe(stored);
  });
});
