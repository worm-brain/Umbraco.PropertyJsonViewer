import { describe, expect, it } from "vitest";
import { prepareRawValue } from "./raw-save.js";

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
