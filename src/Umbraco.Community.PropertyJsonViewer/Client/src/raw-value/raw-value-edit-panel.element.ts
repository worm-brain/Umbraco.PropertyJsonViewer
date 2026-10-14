import { css, customElement, html, nothing, property, query, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/document";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbApiError } from "@umbraco-cms/backoffice/resources";
import { confirmationMatches, prepareRawValue, saveRawValue } from "./raw-save.js";
import type { RawValueEditorElement } from "./raw-value-editor.element.js";
import type { StoredValueRequest } from "./stored-value.api.js";
import { compareValues, displayStoredValue, type ValueComparison, type ValueDisplay } from "./value-display.js";
import "./raw-value-editor.element.js";
import "./value-diff.element.js";

/**
 * Edits the stored draft and saves it straight to the database (ADR 0005), in two steps: edit, then review the
 * difference and confirm by typing the property alias. Dispatches `saved` once the value is stored and the
 * document workspace has reloaded, and `cancel` when the user backs out.
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

  /** The property variant being written; its alias is what the user types to confirm. */
  @property({ attribute: false })
  request?: StoredValueRequest;

  @state()
  private _step: "edit" | "review" = "edit";

  // The value to save and how it differs from the stored draft, worked out when the user moves to review.
  @state()
  private _pending?: { value: string | null; comparison: ValueComparison };

  @state()
  private _confirmation = "";

  @state()
  private _error?: string;

  @state()
  private _saving = false;

  @query("pjv-raw-value-editor")
  private _editor?: RawValueEditorElement;

  #review() {
    if (!this._editor) return;
    const value = prepareRawValue(this._editor.text);
    this._pending = { value, comparison: compareValues(this.storedDraft, displayStoredValue(value)) };
    this._confirmation = "";
    this._error = undefined;
    this._step = "review";
  }

  #backToEdit() {
    this._error = undefined;
    this._step = "edit";
  }

  async #save() {
    if (!this.request || !this._pending) return;
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
    const { error } = await saveRawValue(this, this.request, this._pending.value);
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
      <div class="warning" role="note">
        <uui-icon name="icon-alert"></uui-icon>
        <p>
          <strong>This writes straight to the database.</strong> The value is saved exactly as entered, without the
          property editor's conversion or validation. A value the editor cannot read can break this property for every
          editor until it is fixed or rolled back.
        </p>
      </div>
      <!-- Hidden rather than removed during review, so the typed text survives going back to edit. -->
      <div ?hidden=${this._step !== "edit"}>
        <pjv-raw-value-editor .initial=${this.storedDraft}></pjv-raw-value-editor>
      </div>
      ${this._step === "review" ? this.#renderReview() : nothing}
      ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}
      <div class="actions">${this._step === "edit" ? this.#renderEditActions() : this.#renderReviewActions()}</div>
    `;
  }

  #renderReview() {
    const comparison = this._pending?.comparison;
    if (!comparison) return nothing;
    if (comparison.same) {
      return html`<p class="review-note">The new value is the same as the stored draft. There is nothing to save.</p>`;
    }

    const alias = this.request?.propertyAlias ?? "";
    return html`
      <p class="review-note">Left: stored draft. Right: the value that will be saved.</p>
      <pjv-value-diff
        .original=${comparison.original}
        .modified=${comparison.modified}
        language=${comparison.language}
        modified-label="Value to save"
      ></pjv-value-diff>
      <div class="confirm">
        <label for="confirmation">Type <code>${alias}</code> to confirm</label>
        <uui-input
          id="confirmation"
          label=${`Type ${alias} to confirm`}
          autocomplete="off"
          spellcheck="false"
          .value=${this._confirmation}
          @input=${(event: Event) => (this._confirmation = (event.target as HTMLInputElement).value)}
        ></uui-input>
      </div>
    `;
  }

  #renderEditActions() {
    return html`
      <uui-button
        label="Cancel"
        look="secondary"
        @click=${() => this.dispatchEvent(new CustomEvent("cancel", { bubbles: true, composed: true }))}
      ></uui-button>
      <uui-button label="Review changes" look="primary" @click=${this.#review}></uui-button>
    `;
  }

  #renderReviewActions() {
    const comparison = this._pending?.comparison;
    const confirmed =
      comparison !== undefined &&
      !comparison.same &&
      confirmationMatches(this._confirmation, this.request?.propertyAlias ?? "");
    return html`
      <uui-button
        label="Back to editing"
        look="secondary"
        ?disabled=${this._saving}
        @click=${this.#backToEdit}
      ></uui-button>
      <uui-button
        label="Save raw value"
        look="primary"
        color="danger"
        .state=${this._saving ? "waiting" : undefined}
        ?disabled=${!confirmed || this._saving}
        @click=${this.#save}
      ></uui-button>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
      }

      [hidden] {
        display: none;
      }

      .warning {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: flex-start;
        margin-bottom: var(--uui-size-space-4);
        padding: var(--uui-size-space-4);
        border-left: 4px solid var(--uui-color-danger);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-danger-standalone, #fbe9e9);
        color: var(--uui-color-danger-contrast, inherit);
      }

      .warning uui-icon {
        flex: none;
        margin-top: 2px;
      }

      .warning p,
      .review-note {
        margin: 0;
      }

      .review-note {
        margin-bottom: var(--uui-size-space-3);
        color: var(--uui-color-text-alt);
      }

      .confirm {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
        margin-top: var(--uui-size-space-4);
        max-width: 30rem;
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
