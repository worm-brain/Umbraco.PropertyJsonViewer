import type { Locator, Page } from "@playwright/test";
import {
  chooseTab,
  openBlock,
  openDrawer,
  openPropertyActions,
  openTestPage,
  valueText,
} from "../support/raw-value.js";
import { repoRoot } from "../support/sites.js";
import { expect, test } from "../support/test.js";

/**
 * The documentation screenshots, written to `docs/images/`. Run with `bun run docs:screenshots`
 * (playwright.docs.config.ts). Each test sets up one view the docs show and saves it; they run in order on one
 * worker. The raw save shots change the test page's block, so the run starts and ends by putting the seeded
 * values back.
 */
test.describe.configure({ mode: "serial" });

/** The block list's block title and the third-party value, as the sample sites seed them. */
const SEEDED_TITLE = "A title inside a block";
const SEEDED_THIRD_PARTY = "Stored by a third-party editor";
const CORRECTED_TITLE = "A corrected title";

/** Saves the viewport to `docs/images/{name}.png`, after the view has settled. */
async function shoot(page: Page, name: string): Promise<void> {
  // Park the pointer in the bottom-left corner, so no hover state shows in the shot.
  await page.mouse.move(1, (page.viewportSize()?.height ?? 900) - 1);
  // Let transitions, popovers and late requests finish so a shot never catches a half-drawn view.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${repoRoot}docs/images/${name}.png` });
}

/** Works out the new raw text from the stored draft's text; null when the stored value is already as wanted. */
type RawEdit = (stored: string) => string | null;

/**
 * Starts a raw edit of a property on the open test page, puts the new text in the raw editor and moves on to the
 * review step with the alias typed.
 *
 * @param page - A page showing the test page.
 * @param alias - The property to edit.
 * @param edit - The change to make.
 * @returns The drawer at the review step, or null when there is nothing to change.
 */
async function reviewRawEdit(page: Page, alias: string, edit: RawEdit): Promise<Locator | null> {
  const drawer = await openDrawer(page, alias);
  await chooseTab(drawer, "Stored");
  const text = edit(await valueText(drawer, "Stored draft value"));
  if (text === null) return null;

  await drawer.getByRole("button", { name: "Edit raw value" }).click();
  const codeEditor = drawer.locator("pjv-raw-value-editor umb-code-editor");
  if ((await codeEditor.count()) > 0) {
    // Set on the code editor rather than typed, which would add the editor's own closing brackets and quotes.
    await codeEditor.evaluate((element, code) => ((element as HTMLElement & { code: string }).code = code), text);
  } else {
    await drawer.getByRole("textbox", { name: "New raw value" }).fill(text);
  }
  await drawer.getByRole("button", { name: "Review changes" }).click();
  await drawer.getByRole("textbox", { name: `Type ${alias} to confirm` }).fill(alias);
  return drawer;
}

/** Changes the block's title in the stored block list JSON, pretty-printed as the raw editor shows it. */
function withTitle(title: string): RawEdit {
  return (stored) => {
    const value = JSON.parse(stored);
    if (value.contentData[0].values[0].value === title) return null;
    value.contentData[0].values[0].value = title;
    return JSON.stringify(value, null, 2);
  };
}

/** Replaces a plain text value. */
function withText(text: string): RawEdit {
  return (stored) => (stored === text ? null : text);
}

/** Puts the seeded block title and third-party value back with raw saves, where they differ. */
async function restoreSeededValues(page: Page): Promise<void> {
  for (const [alias, edit] of [
    ["blocks", withTitle(SEEDED_TITLE)],
    ["thirdParty", withText(SEEDED_THIRD_PARTY)],
  ] as const) {
    await openTestPage(page);
    const drawer = await reviewRawEdit(page, alias, edit);
    if (!drawer) continue;
    await drawer.getByRole("button", { name: "Save raw value" }).click();
    await expect(drawer.getByRole("status")).toBeVisible();
  }
}

test("restore the seeded values", async ({ page }) => {
  await restoreSeededValues(page);
});

test("property action menu", async ({ page }) => {
  await openTestPage(page);
  await expect(await openPropertyActions(page, "blocks")).toBeVisible();
  await shoot(page, "property-action-menu");
});

test("stored tab", async ({ page }) => {
  await openTestPage(page);
  const drawer = await openDrawer(page, "blocks");
  await chooseTab(drawer, "Stored");
  await expect(drawer.getByRole("button", { name: "Edit raw value" })).toBeVisible();
  await shoot(page, "stored-tab");
});

test("diff tab", async ({ page }) => {
  await openTestPage(page);
  const drawer = await openDrawer(page, "blocks");
  const panel = await chooseTab(drawer, "Diff");
  const diff = panel.getByRole("region", { name: "Differences between the stored draft and the editor value" });
  await expect(diff.getByRole("textbox", { name: "Editor value" })).toBeAttached();
  // Scrolled so the tabs and as much of the difference as fits are in view.
  await drawer.getByRole("tablist").evaluate((tabs) => tabs.scrollIntoView({ block: "start" }));
  await shoot(page, "diff-tab");
});

test("property inside a block", async ({ page }) => {
  await openTestPage(page);
  const drawer = await openDrawer(await openBlock(page), "title");
  await expect(drawer.getByRole("tab")).toHaveText(["Editor"]);
  await shoot(page, "block-property");
});

test("permissions", async ({ page }) => {
  await page.goto("/umbraco/section/user-management");
  await page.getByRole("link", { name: "User Groups" }).click();
  await page.getByRole("link", { name: "Administrators" }).click();
  const heading = page.getByText("Property JSON Viewer", { exact: true });
  await expect(heading).toBeVisible();
  await heading.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await shoot(page, "permissions");
});

test("raw save review and result", async ({ page }) => {
  await openTestPage(page);
  const drawer = await reviewRawEdit(page, "blocks", withTitle(CORRECTED_TITLE));
  if (!drawer) throw new Error("The block title is already corrected; the restore step did not run.");
  await expect(drawer.getByRole("button", { name: "Save raw value" })).toBeEnabled();
  await drawer.getByRole("note").evaluate((note) => note.scrollIntoView({ block: "start" }));
  await shoot(page, "raw-save-review");

  await drawer.getByRole("button", { name: "Save raw value" }).click();
  await expect(drawer.getByRole("status")).toBeVisible();
  await drawer.getByRole("heading", { name: "Property" }).evaluate((h) => h.scrollIntoView({ block: "start" }));
  await shoot(page, "raw-save-done");
});

test("restore the seeded values afterwards", async ({ page }) => {
  await restoreSeededValues(page);
});
