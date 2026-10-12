import { css, customElement, html, property, query } from "@umbraco-cms/backoffice/external/lit";
import type { UmbCodeEditorElement } from "@umbraco-cms/backoffice/code-editor";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "@umbraco-cms/backoffice/code-editor";
import type { ValueDisplay } from "./value-display.js";

/**
 * The editable form of a stored value: the JSON code editor when the stored value is JSON (or empty), a plain
 * text area otherwise. The drawer reads {@link RawValueEditorElement.text} when the user saves.
 */
@customElement("pjv-raw-value-editor")
export class RawValueEditorElement extends UmbLitElement {
  /** The stored draft the edit starts from. Only read on first render; later changes do not reset the edit. */
  @property({ attribute: false })
  initial: ValueDisplay = { kind: "empty" };

  @query("umb-code-editor")
  private _codeEditor?: UmbCodeEditorElement;

  @query("textarea")
  private _textArea?: HTMLTextAreaElement;

  /** The text as currently typed. */
  get text(): string {
    return this._codeEditor?.code ?? this._textArea?.value ?? "";
  }

  override render() {
    const initialText = this.initial.kind === "empty" ? "" : this.initial.text;
    if (this.initial.kind === "text") {
      return html`<textarea aria-label="New raw value" .value=${initialText} spellcheck="false"></textarea>`;
    }
    return html`<umb-code-editor
      language="json"
      label="New raw value"
      .disableMinimap=${true}
      .code=${initialText}
    ></umb-code-editor>`;
  }

  static override styles = [
    css`
      :host {
        display: block;
      }

      umb-code-editor,
      textarea {
        box-sizing: border-box;
        width: 100%;
        height: min(60vh, 40rem);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      textarea {
        padding: var(--uui-size-space-4);
        font-family: var(--uui-font-monospace, monospace);
        font-size: inherit;
        resize: vertical;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "pjv-raw-value-editor": RawValueEditorElement;
  }
}
