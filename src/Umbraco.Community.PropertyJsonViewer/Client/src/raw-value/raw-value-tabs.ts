/** The drawer's tabs. */
export type RawValueTab = "editor" | "stored" | "diff";

/**
 * Which tabs the drawer offers. Only document properties have a stored value of their own; a property inside a
 * block (entity type `element`) or on any other entity has only the editor value (ADR 0003).
 *
 * @param entityType - Entity type of the property's nearest property dataset.
 * @returns The tabs, in display order.
 */
export function availableTabs(entityType: string): Array<RawValueTab> {
  return entityType === "document" ? ["editor", "stored", "diff"] : ["editor"];
}

/**
 * The tab the drawer opens on: the one the user last chose, if this drawer offers it, otherwise Stored when
 * offered (the reason most people open the drawer), otherwise the first.
 *
 * @param available - The tabs this drawer offers.
 * @param remembered - The tab last chosen in this browser session, if any.
 * @returns The tab to show.
 */
export function initialTab(available: Array<RawValueTab>, remembered: RawValueTab | undefined): RawValueTab {
  if (remembered && available.includes(remembered)) return remembered;
  return available.includes("stored") ? "stored" : available[0]!;
}
