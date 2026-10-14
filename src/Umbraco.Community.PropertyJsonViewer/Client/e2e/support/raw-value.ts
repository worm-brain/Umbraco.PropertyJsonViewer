import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Id (the document key) of the "Raw value test page" the sample sites seed (`samples/Shared/SampleContent`). It
 * has a text box (`heading`), a block list with one text block (`blocks`, the block's `title` inside it) and a
 * property using the stand-in third-party editor (`thirdParty`).
 */
export const TEST_PAGE_ID = "5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a01";

/** Id (the content key) of the one block in the test page's block list. */
export const TEST_BLOCK_ID = "5a1d9c61-8f0e-4d3c-9b8a-2f7f0d0c1a06";

/** The test page's property aliases. */
export type TestPageProperty = "heading" | "blocks" | "thirdParty";

/**
 * Opens the test page in the Content section and waits until its properties have rendered.
 *
 * @param page - A logged-in page.
 */
export async function openTestPage(page: Page): Promise<void> {
  await page.goto(`/umbraco/section/content/workspace/document/edit/${TEST_PAGE_ID}`);
  await expect(page.getByRole("textbox", { name: "Field for Heading" })).toBeVisible({ timeout: 30_000 });
}

/**
 * A property on the page, by alias. Core marks every rendered property with `data-mark="property:<alias>"`.
 *
 * @param scope - The page, or a dialog such as the block editor.
 * @param alias - The property alias.
 * @returns The `umb-property` element.
 */
export function property(scope: Page | Locator, alias: string): Locator {
  return scope.locator(`[data-mark="property:${alias}"]`);
}

/**
 * Opens the test page's block from its block list, in the block editor Umbraco opens beside the document.
 *
 * @param page - A page showing the test page.
 * @returns The block editor, with the block's `title` property rendered.
 */
export async function openBlock(page: Page): Promise<Locator> {
  await property(page, "blocks").getByRole("link", { name: "Edit" }).click();
  const blockEditor = page.locator("umb-block-workspace-editor");
  await expect(property(blockEditor, "title")).toBeVisible();
  return blockEditor;
}

/**
 * Opens a property's "..." menu, the property actions menu next to its label.
 *
 * @param scope - The page, or a dialog such as the block editor.
 * @param alias - The property alias.
 * @returns The "View raw value" item in the open menu.
 */
export async function openPropertyActions(scope: Page | Locator, alias: string): Promise<Locator> {
  await property(scope, alias).getByRole("button", { name: "View actions" }).click();
  const page = "page" in scope ? scope.page() : scope;
  return page.getByRole("button", { name: "View raw value" });
}

/**
 * Opens the raw value drawer from a property's "..." menu.
 *
 * @param scope - The page, or a dialog such as the block editor.
 * @param alias - The property alias.
 * @returns The drawer.
 */
export async function openDrawer(scope: Page | Locator, alias: string): Promise<Locator> {
  await (await openPropertyActions(scope, alias)).click();
  const page = "page" in scope ? scope.page() : scope;
  const drawer = page.locator("pjv-raw-value-modal");
  await expect(drawer.getByRole("heading", { name: /^Raw value: / })).toBeVisible();
  return drawer;
}

/**
 * Chooses a drawer tab and waits for its panel.
 *
 * @param drawer - The open drawer.
 * @param tab - The tab's label.
 * @returns The tab's panel.
 */
export async function chooseTab(drawer: Locator, tab: "Editor" | "Stored" | "Diff"): Promise<Locator> {
  await drawer.getByRole("tab", { name: tab }).click();
  const panel = drawer.getByRole("tabpanel", { name: tab });
  await expect(panel).toBeVisible();
  return panel;
}

/**
 * Reads the text of a value view in the drawer, whichever way it is shown: JSON in Umbraco's code editor
 * (`umb-code-editor`, whose `code` property holds all of it, not only the lines on screen) or anything else as
 * preformatted text.
 *
 * @param drawer - The open drawer.
 * @param label - The value view's accessible name, for example "Stored draft value".
 * @returns The text.
 */
export async function valueText(drawer: Locator, label: string): Promise<string> {
  const view = drawer.locator("pjv-value-view").filter({ has: drawer.page().getByLabel(label, { exact: true }) });
  await expect(view).toHaveCount(1);
  const codeEditor = view.locator("umb-code-editor");
  if ((await codeEditor.count()) > 0) {
    return codeEditor.evaluate((element) => (element as HTMLElement & { code: string }).code);
  }
  return (await view.locator("pre").innerText()).trim();
}
