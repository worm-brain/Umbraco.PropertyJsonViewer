import { css, customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "@umbraco-cms/backoffice/code-editor";
import type { ValueDisplay } from "./value-display.js";

/** Shows one value read-only: JSON in the code editor, anything else as preformatted text. */
@customElement("pjv-value-view")
export class ValueViewElement extends UmbLitElement {
  /** The value to show. */
  @property({ attribute: false })
  display: ValueDisplay = { kind: "empty" };

  /** Accessible name for the code editor or text block, for example "Stored draft value". */
  @property()
  label = "";

  /** Message shown when there is no value. */
  @property({ attribute: "empty-message" })
  emptyMessage = "No value stored";

  override render() {
    switch (this.display.kind) {
      case "empty":
        return html`<p class="empty">${this.emptyMessage}</p>`;
      case "json":
        return html`<umb-code-editor
          language="json"
          .readonly=${true}
          .disableMinimap=${true}
          .label=${this.label}
          .code=${this.display.text}
        ></umb-code-editor>`;
      case "text":
        return html`<pre aria-label=${this.label} tabindex="0">${this.display.text}</pre>`;
    }
  }

  static override styles = [
    css`
      :host {
        display: block;
      }

      umb-code-editor {
        /* Monaco needs an explicit height; this keeps a long value scrollable inside the drawer. */
        height: min(60vh, 40rem);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      pre {
        margin: 0;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font-family: var(--uui-font-monospace, monospace);
      }

      .empty {
        margin: 0;
        color: var(--uui-color-text-alt);
        font-style: italic;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "pjv-value-view": ValueViewElement;
  }
}
