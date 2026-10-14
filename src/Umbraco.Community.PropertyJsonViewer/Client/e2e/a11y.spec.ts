// axe reports no serious or critical accessibility issues in the raw value drawer: each tab, the drawer for a
// property inside a block, and both steps of a raw save.
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { chooseTab, openBlock, openDrawer, openTestPage } from "./support/raw-value.js";
import { expect, test } from "./support/test.js";

/** The impacts that fail the check; minor and moderate findings are not enforced. */
const FAILING_IMPACTS = new Set(["serious", "critical"]);

/**
 * Findings that are not the package's to fix, each with its reason. Matched against the rule id and the last
 * selector of the node's target.
 */
const ACCEPTED: ReadonlyArray<{ rule: string; target: RegExp; reason: string }> = [
  {
    rule: "color-contrast",
    target: /\.mtk\d+$/,
    reason:
      "Syntax colours of Monaco's own theme (the one Umbraco's code editor uses) on its diff highlight " +
      "backgrounds; the package does not style either.",
  },
];

/**
 * Runs axe on the drawer and returns its serious and critical violations, one line per rule with the offending
 * targets, so a failure reads as a list.
 *
 * Only the drawer is scanned. The document workspace behind it is Umbraco's, and the sample site's stand-in
 * third-party editor (an unlabelled input) stands for code the package does not own.
 */
async function seriousViolations(page: Page): Promise<Array<string>> {
  // The drawer sits in the backoffice's modal container, inside umb-app's shadow root.
  const results = await new AxeBuilder({ page })
    .include({ fromShadowDom: ["umb-app", "umb-backoffice-modal-container", "pjv-raw-value-modal"] })
    .analyze();
  return results.violations
    .filter((violation) => FAILING_IMPACTS.has(violation.impact ?? ""))
    .map((violation) => ({
      ...violation,
      nodes: violation.nodes.filter((node) => {
        const target = node.target.flat();
        const last = String(target[target.length - 1] ?? "");
        return !ACCEPTED.some((accepted) => accepted.rule === violation.id && accepted.target.test(last));
      }),
    }))
    .filter((violation) => violation.nodes.length > 0)
    .map(
      (violation) =>
        `${violation.impact} ${violation.id}: ${violation.help} -> ${violation.nodes
          .map((node) => JSON.stringify(node.target))
          .join(", ")}`,
    );
}

test.beforeEach(async ({ page }) => {
  await openTestPage(page);
});

for (const tab of ["Stored", "Editor", "Diff"] as const) {
  test(`finds no serious issues on the ${tab} tab`, async ({ page }) => {
    const drawer = await openDrawer(page, "blocks");
    const panel = await chooseTab(drawer, tab);
    // Let the code editors and the diff finish loading so axe sees the settled tab.
    await expect(panel.locator("uui-loader-bar")).toHaveCount(0);
    if (tab === "Diff") await expect(panel.getByRole("textbox", { name: "Editor value" })).toBeAttached();

    expect(await seriousViolations(page)).toEqual([]);
  });
}

test("finds no serious issues in the drawer of a property inside a block", async ({ page }) => {
  const drawer = await openDrawer(await openBlock(page), "title");
  await expect(drawer.getByRole("tab")).toHaveText(["Editor"]);

  expect(await seriousViolations(page)).toEqual([]);
});

test("finds no serious issues while editing and reviewing a raw value", async ({ page }) => {
  const drawer = await openDrawer(page, "thirdParty");
  await chooseTab(drawer, "Stored");
  await drawer.getByRole("button", { name: "Edit raw value" }).click();
  await drawer.getByRole("textbox", { name: "New raw value" }).fill("A value that is never saved");

  expect(await seriousViolations(page), "editing").toEqual([]);

  await drawer.getByRole("button", { name: "Review changes" }).click();
  await expect(drawer.getByRole("textbox", { name: "Value to save" })).toBeAttached();

  expect(await seriousViolations(page), "reviewing").toEqual([]);
});
