import { css, customElement, html, nothing, property, query, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/document";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbApiError } from "@umbraco-cms/backoffice/resources";
import { prepareRawValue, saveRawValue } from "./raw-save.js";
import type { RawValueEditorElement } from "./raw-value-editor.element.js";
import type { StoredValueRequest } from "./stored-value.api.js";
import type { ValueDisplay } from "./value-display.js";
import "./raw-value-editor.element.js";

/**
 * Edits the stored draft and saves it straight to the database (ADR 0005). Dispatches `saved` once the value is
 * stored and the document workspace has reloaded, and `cancel` when the user backs out.
 *
 * The open document workspace still holds the old value after a raw save, and a normal Save would write it back
 * over the raw edit. So the panel refuses to save while the workspace has unsaved changes, and reloads the
 * workspace after saving.
 */
@customElement("pjv-raw-value-edit-panel")
export class RawValueEditPanelElement extends UmbLitElement {
  /** The stored draft the edit starts from. */
  @property({ attribute: false })
  storedDraft: ValueDisplay = { kind: "empty" };

  /** The property variant being written. */
  @property({ attribute: false })
  request?: StoredValueRequest;

  @state()
  private _error?: string;

  @state()
  private _saving = false;

  @query("pjv-raw-value-editor")
  private _editor?: RawValueEditorElement;

  async #save() {
    if (!this.request || !this._editor) return;
    this._error = undefined;

    // Reached through the modal, which forwards context requests to the property that opened it.
    const workspace = await this.getContext(UMB_DOCUMENT_WORKSPACE_CONTEXT);
    if (workspace?.getHasUnpersistedChanges()) {
      this._error =
        "This document has unsaved changes. Save or discard them first: saving the document after a raw save " +
        "would write the editor's old value back over it.";
      return;
    }

    this._saving = true;
    const { error } = await saveRawValue(this, this.request, prepareRawValue(this._editor.text));
    if (error) {
      this._saving = false;
      this._error = saveErrorMessage(error);
      return;
    }

    await workspace?.reload();
    this._saving = false;
    this.dispatchEvent(new CustomEvent("saved", { bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <pjv-raw-value-editor .initial=${this.storedDraft}></pjv-raw-value-editor>
      ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}
      <div class="actions">
        <uui-button
          label="Cancel"
          look="secondary"
          ?disabled=${this._saving}
          @click=${() => this.dispatchEvent(new CustomEvent("cancel", { bubbles: true, composed: true }))}
        ></uui-button>
        <uui-button
          label="Save raw value"
          look="primary"
          color="danger"
          .state=${this._saving ? "waiting" : undefined}
          ?disabled=${this._saving}
          @click=${this.#save}
        ></uui-button>
      </div>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--uui-size-space-3);
        margin-top: var(--uui-size-space-4);
      }

      .error {
        margin: var(--uui-size-space-4) 0 0;
        color: var(--uui-color-danger);
      }
    `,
  ];
}

/**
 * Turns a failed save into the sentence the panel shows.
 *
 * @param error - The error `tryExecute` returned; a 400 carries the server's reason as its ProblemDetails title.
 * @returns A message for the user.
 */
function saveErrorMessage(error: unknown): string {
  if (!UmbApiError.isUmbApiError(error)) return "The raw value could not be saved.";
  if (error.status === 403) return "You do not have permission to write this property's raw value.";
  return error.problemDetails.title || "The raw value could not be saved.";
}

declare global {
  interface HTMLElementTagNameMap {
    "pjv-raw-value-edit-panel": RawValueEditPanelElement;
  }
}
