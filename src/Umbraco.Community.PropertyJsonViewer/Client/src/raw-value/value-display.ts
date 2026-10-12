/**
 * How a value is shown in the drawer: an explicit "nothing stored" message, pretty-printed JSON in the code
 * editor, or plain text.
 */
export type ValueDisplay = { kind: "empty" } | { kind: "json"; text: string } | { kind: "text"; text: string };

/**
 * Prepares a stored value for display. Stored values are text exactly as the database holds them; only a JSON
 * object or array is pretty-printed, so a stored `"42"` or `"true"` still reads as the scalar it is.
 *
 * @param stored - The stored value, or null when nothing is stored.
 * @returns How to show it.
 */
export function displayStoredValue(stored: string | null | undefined): ValueDisplay {
  if (stored === null || stored === undefined) return { kind: "empty" };

  const trimmed = stored.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return { kind: "json", text: JSON.stringify(JSON.parse(trimmed), null, 2) };
    } catch {
      // Starts like JSON but is not valid JSON, which is itself worth seeing exactly as stored.
    }
  }

  return { kind: "text", text: stored };
}

/**
 * Prepares a property editor's in-memory value for display. Editors hold strings, numbers, objects or
 * arrays; objects and arrays are shown as JSON, strings go through {@link displayStoredValue} so a JSON
 * string looks the same as it does in the Stored tab.
 *
 * @param value - The value from the property context; undefined or null when the editor holds none.
 * @returns How to show it.
 */
export function displayEditorValue(value: unknown): ValueDisplay {
  if (value === null || value === undefined) return { kind: "empty" };
  if (typeof value === "string") return displayStoredValue(value);
  if (typeof value === "object") return { kind: "json", text: JSON.stringify(value, null, 2) };
  return { kind: "text", text: String(value) };
}

/** What the Diff tab shows: a note that the two values match, or the two texts to diff. */
export type ValueComparison =
  { same: true } | { same: false; original: string; modified: string; language: "json" | "plaintext" };

/**
 * Compares the stored draft with the editor value as they are displayed, so JSON that differs only in
 * whitespace or formatting counts as the same. An empty value compares as the empty string.
 *
 * @param stored - The stored draft, as {@link displayStoredValue} prepared it.
 * @param editor - The editor value, as {@link displayEditorValue} prepared it.
 * @returns Whether they match, and if not, the texts to diff. The language is JSON only when both sides are
 *   JSON; otherwise JSON highlighting would flag the other side as invalid.
 */
export function compareValues(stored: ValueDisplay, editor: ValueDisplay): ValueComparison {
  const original = stored.kind === "empty" ? "" : stored.text;
  const modified = editor.kind === "empty" ? "" : editor.text;
  if (original === modified) return { same: true };
  return {
    same: false,
    original,
    modified,
    language: stored.kind === "json" && editor.kind === "json" ? "json" : "plaintext",
  };
}
