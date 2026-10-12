import { describe, expect, it } from "vitest";
import { displayEditorValue, displayStoredValue } from "./value-display.js";

describe("displayStoredValue", () => {
  it("pretty-prints a stored JSON object", () => {
    expect(displayStoredValue('{"layout":{"Umbraco.BlockList":[]}}')).toEqual({
      kind: "json",
      text: '{\n  "layout": {\n    "Umbraco.BlockList": []\n  }\n}',
    });
  });

  it("pretty-prints a stored JSON array", () => {
    expect(displayStoredValue('[{"udi":"umb://document/1"}]')).toEqual({
      kind: "json",
      text: '[\n  {\n    "udi": "umb://document/1"\n  }\n]',
    });
  });

  it("shows plain text as stored", () => {
    expect(displayStoredValue("Hello from the raw value test page")).toEqual({
      kind: "text",
      text: "Hello from the raw value test page",
    });
  });

  it("shows a stored number as text, not JSON", () => {
    expect(displayStoredValue("42")).toEqual({ kind: "text", text: "42" });
  });

  it("shows broken JSON exactly as stored", () => {
    expect(displayStoredValue('{"layout": ')).toEqual({ kind: "text", text: '{"layout": ' });
  });

  it("says nothing is stored for null", () => {
    expect(displayStoredValue(null)).toEqual({ kind: "empty" });
  });

  it("keeps an empty string as stored text", () => {
    expect(displayStoredValue("")).toEqual({ kind: "text", text: "" });
  });
});

describe("displayEditorValue", () => {
  it("shows an editor object as JSON", () => {
    expect(displayEditorValue({ contentData: [] })).toEqual({ kind: "json", text: '{\n  "contentData": []\n}' });
  });

  it("shows an editor number as text", () => {
    expect(displayEditorValue(12.5)).toEqual({ kind: "text", text: "12.5" });
  });

  it("says the editor holds nothing for undefined", () => {
    expect(displayEditorValue(undefined)).toEqual({ kind: "empty" });
  });
});
