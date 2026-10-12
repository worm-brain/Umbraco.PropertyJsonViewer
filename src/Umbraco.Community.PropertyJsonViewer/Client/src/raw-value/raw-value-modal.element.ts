import { css, customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { RawValueModalData } from "./raw-value-modal.token.js";

/**
 * The raw value drawer. Shows which property, variant and editor the values belong to.
 */
@customElement("pjv-raw-value-modal")
export class RawValueModalElement extends UmbModalBaseElement<RawValueModalData, never> {
  override render() {
    const data = this.data;
    if (!data) return html``;

    return html`
      <umb-body-layout headline=${`Raw value: ${this.localize.string(data.propertyLabel)}`}>
        <uui-box headline="Property">
          <dl>
            <dt>Alias</dt>
            <dd><code>${data.propertyAlias}</code></dd>
            <dt>Culture</dt>
            <dd>${data.culture ?? "Invariant"}</dd>
            <dt>Segment</dt>
            <dd>${data.segment ?? "None"}</dd>
            <dt>Property editor</dt>
            <dd>
              <code>${data.editorSchemaAlias ?? data.editorUiAlias}</code>
              ${data.editorSchemaAlias ? html`<span class="ui-alias">(UI <code>${data.editorUiAlias}</code>)</span>` : ""}
            </dd>
          </dl>
        </uui-box>
        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${() => this._rejectModal()}></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = [
    css`
      dl {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: var(--uui-size-space-2) var(--uui-size-space-5);
        margin: 0;
      }

      dt {
        font-weight: bold;
      }

      dd {
        margin: 0;
        overflow-wrap: anywhere;
      }

      .ui-alias {
        color: var(--uui-color-text-alt);
      }
    `,
  ];
}

export default RawValueModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "pjv-raw-value-modal": RawValueModalElement;
  }
}
