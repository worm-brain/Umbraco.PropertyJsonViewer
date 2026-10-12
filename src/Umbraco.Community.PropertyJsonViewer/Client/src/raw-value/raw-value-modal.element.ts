import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UmbApiError } from "@umbraco-cms/backoffice/resources";
import type { RawValueModalData } from "./raw-value-modal.token.js";
import { fetchStoredValue, type StoredValueResponse } from "./stored-value.api.js";
import { displayStoredValue } from "./value-display.js";
import "./value-view.element.js";

/** The stored value request's state while the drawer is open. */
type StoredState =
  { status: "loading" } | { status: "loaded"; value: StoredValueResponse } | { status: "error"; message: string };

/**
 * The raw value drawer. Shows which property, variant and editor the values belong to, and the values Umbraco
 * has stored for it.
 */
@customElement("pjv-raw-value-modal")
export class RawValueModalElement extends UmbModalBaseElement<RawValueModalData, never> {
  @state()
  private _stored: StoredState = { status: "loading" };

  override connectedCallback(): void {
    super.connectedCallback();
    void this.#loadStored();
  }

  async #loadStored() {
    const data = this.data;
    if (!data?.unique || data.entityType !== "document") {
      this._stored = { status: "error", message: "Stored values can only be read for document properties." };
      return;
    }

    this._stored = { status: "loading" };
    const { data: response, error } = await fetchStoredValue(this, {
      documentId: data.unique,
      propertyAlias: data.propertyAlias,
      culture: data.culture,
      segment: data.segment,
    });

    this._stored =
      error || !response
        ? { status: "error", message: errorMessage(error) }
        : { status: "loaded", value: response as StoredValueResponse };
  }

  override render() {
    const data = this.data;
    if (!data) return nothing;

    return html`
      <umb-body-layout headline=${`Raw value: ${this.localize.string(data.propertyLabel)}`}>
        ${this.#renderProperty(data)} ${this.#renderStored()}
        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${() => this._rejectModal()}></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  #renderProperty(data: RawValueModalData) {
    return html`
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
            ${
              data.editorSchemaAlias
                ? html`<span class="secondary">(UI <code>${data.editorUiAlias}</code>)</span>`
                : nothing
            }
          </dd>
        </dl>
      </uui-box>
    `;
  }

  #renderStored() {
    const stored = this._stored;
    switch (stored.status) {
      case "loading":
        return html`<uui-box headline="Stored"><uui-loader-bar></uui-loader-bar></uui-box>`;
      case "error":
        return html`<uui-box headline="Stored">
          <p class="error" role="alert">${stored.message}</p>
        </uui-box>`;
      case "loaded":
        return html`
          <uui-box headline="Stored draft">
            <uui-tag slot="header-actions" look="secondary">${stored.value.storageType}</uui-tag>
            <pjv-value-view
              label="Stored draft value"
              .display=${displayStoredValue(stored.value.draft)}
            ></pjv-value-view>
          </uui-box>
          <uui-box headline="Stored published">
            ${
              stored.value.isPublished
                ? html`<pjv-value-view
                    label="Stored published value"
                    .display=${displayStoredValue(stored.value.published)}
                  ></pjv-value-view>`
                : html`<p class="secondary">Not published.</p>`
            }
          </uui-box>
        `;
    }
  }

  static override styles = [
    css`
      uui-box + uui-box {
        margin-top: var(--uui-size-space-5);
      }

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

      p {
        margin: 0;
      }

      .secondary {
        color: var(--uui-color-text-alt);
      }

      .error {
        color: var(--uui-color-danger);
      }
    `,
  ];
}

/**
 * Turns a failed stored-value request into the sentence the tab shows.
 *
 * @param error - The error `tryExecute` returned; an API error carries the HTTP status and ProblemDetails title.
 * @returns A message for the user.
 */
function errorMessage(error: unknown): string {
  if (!UmbApiError.isUmbApiError(error)) return "The stored value could not be loaded.";
  if (error.status === 403) return "You do not have permission to read this document's stored values.";
  return error.problemDetails.title || "The stored value could not be loaded.";
}

export default RawValueModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "pjv-raw-value-modal": RawValueModalElement;
  }
}
