import { describe, expect, it } from "vitest";
import { confirmationMatches, prepareRawValue } from "./raw-save.js";

describe("prepareRawValue", () => {
  it("stores valid JSON compact", () => {
    expect(prepareRawValue('{\n  "layout": {\n    "Umbraco.BlockList": []\n  }\n}')).toBe(
      '{"layout":{"Umbraco.BlockList":[]}}',
    );
  });

  it("sends broken JSON exactly as typed, for the server to reject", () => {
    expect(prepareRawValue('{"layout": ')).toBe('{"layout": ');
  });

  it("sends plain text exactly as typed", () => {
    expect(prepareRawValue("  Hello  ")).toBe("  Hello  ");
  });

  it("clears the value when the text is empty", () => {
    expect(prepareRawValue("   \n")).toBeNull();
  });
});

describe("confirmationMatches", () => {
  it("confirms when the alias is typed exactly", () => {
    expect(confirmationMatches("blocks", "blocks")).toBe(true);
  });

  it("ignores spaces around a pasted alias", () => {
    expect(confirmationMatches(" blocks ", "blocks")).toBe(true);
  });

  it("does not confirm a different case", () => {
    expect(confirmationMatches("Blocks", "blocks")).toBe(false);
  });

  it("does not confirm a partial alias", () => {
    expect(confirmationMatches("block", "blocks")).toBe(false);
  });
});
