import { describe, expect, it } from "vitest";
import { availableTabs, initialTab } from "./raw-value-tabs.js";

describe("availableTabs", () => {
  it("offers Editor, Stored and Diff for a document property", () => {
    expect(availableTabs("document")).toEqual(["editor", "stored", "diff"]);
  });

  it("offers only Editor for a property inside a block", () => {
    expect(availableTabs("element")).toEqual(["editor"]);
  });

  it("offers only Editor for a media property", () => {
    expect(availableTabs("media")).toEqual(["editor"]);
  });
});

describe("initialTab", () => {
  it("opens on Stored when nothing was chosen before", () => {
    expect(initialTab(["editor", "stored", "diff"], undefined)).toBe("stored");
  });

  it("opens on the tab chosen last time", () => {
    expect(initialTab(["editor", "stored", "diff"], "diff")).toBe("diff");
  });

  it("falls back to Editor when the remembered tab is not offered", () => {
    expect(initialTab(["editor"], "diff")).toBe("editor");
  });
});
