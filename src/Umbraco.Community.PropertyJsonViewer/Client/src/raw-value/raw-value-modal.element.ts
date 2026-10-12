import { css, customElement, html, nothing, repeat, state } from "@umbraco-cms/backoffice/external/lit";
import { createExtensionApiByAlias } from "@umbraco-cms/backoffice/extension-registry";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_PROPERTY_CONTEXT } from "@umbraco-cms/backoffice/property";
import { UmbApiError } from "@umbraco-cms/backoffice/resources";
import { DOCUMENT_USER_PERMISSION_CONDITION_ALIAS, UPDATE_PERMISSION, WRITE_PERMISSION } from "./constants.js";
import type { RawValueModalData } from "./raw-value-modal.token.js";
import { availableTabs, initialTab, type RawValueTab } from "./raw-value-tabs.js";
import { fetchStoredValue, type StoredValueRequest, type StoredValueResponse } from "./stored-value.api.js";
import { compareValues, displayEditorValue, displayStoredValue, type ValueDisplay } from "./value-display.js";
import "./raw-value-edit-panel.element.js";
import "./value-diff.element.js";
import "./value-view.element.js";

/** The stored value request's state while the drawer is open. */
type StoredState =
  { status: "loading" } | { status: "loaded"; value: StoredValueResponse } | { status: "error"; message: string };

const TAB_LABELS: Record<RawValueTab, string> = { editor: "Editor", stored: "Stored", diff: "Diff" };

// The tab last chosen in any drawer, kept for the rest of the backoffice session (until the page reloads).
let rememberedTab: RawValueTab | undefined;

/**
 * The raw value drawer. Shows which property, variant and editor the values belong to, then three tabs: the
 * value the property editor holds now (unsaved edits included), the values Umbraco has stored, and the
 * difference between the editor value and the stored draft.
 */
@customElement("pjv-raw-value-modal")
export class RawValueModalElement extends UmbModalBaseElement<RawValueModalData, never> {
  @state()
  private _stored: StoredState = { status: "loading" };

  @state()
  private _editor: ValueDisplay = { kind: "empty" };

  @state()
  private _tab: RawValueTab = "stored";

  // Whether the user may write raw values here: the package's write permission and Update on the document,
  // and the property is not read-only (which is how core applies the property value write permission).
  @state()
  private _hasWritePermission = false;

  @state()
  private _propertyReadOnly = true;

  @state()
  private _editing = false;

  @state()
  private _savedMessage?: string;

  #tabs: Array<RawValueTab> = [];

  constructor() {
    super();
    // The modal forwards context requests to the element that opened it, so this is the property whose "..."
    // menu was used. Observing keeps the Editor tab live while the editor changes behind the drawer.
    this.consumeContext(UMB_PROPERTY_CONTEXT, (property) => {
      this.observe(property?.value, (value) => (this._editor = displayEditorValue(value)), "observeEditorValue");
      this.observe(property?.isReadOnly, (readOnly) => (this._propertyReadOnly = readOnly ?? true), "observeReadOnly");
    });

    // The same condition the action uses, evaluated here for the write verbs; it reads the document through the
    // entity context the modal forwards from the property.
    void createExtensionApiByAlias(this, DOCUMENT_USER_PERMISSION_CONDITION_ALIAS, [
      {
        config: { allOf: [WRITE_PERMISSION, UPDATE_PERMISSION] },
        onChange: (permitted: boolean) => (this._hasWritePermission = permitted),
      },
    ]);
  }

  get #request(): StoredValueRequest | undefined {
    const data = this.data;
    if (!data?.unique) return undefined;
    return {
      documentId: data.unique,
      propertyAlias: data.propertyAlias,
      culture: data.culture,
      segment: data.segment,
    };
  }

  get #canEdit(): boolean {
    return this._hasWritePermission && !this._propertyReadOnly && this.#request !== undefined;
  }

  async #onSaved() {
    this._editing = false;
    this._savedMessage =
      "Raw value saved to the draft. It is not published: publish the document to make it live. " +
      "The previous value is kept as a version and can be rolled back from Info > Rollback.";
    await this.#loadStored();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#tabs = availableTabs(this.data?.entityType ?? "");
    this._tab = initialTab(this.#tabs, rememberedTab);
    // Only a document property has a stored value of its own to ask for (ADR 0003).
    if (this.#tabs.includes("stored")) void this.#loadStored();
  }

  async #loadStored() {
    const data = this.data;
    if (!data?.unique) {
      this._stored = { status: "error", message: "This document has not been saved yet, so nothing is stored." };
      return;
    }

    this._stored = { status: "loading" };
    const { data: response, error } = await fetchStoredValue(this, this.#request!);

    this._stored =
      error || !response
        ? { status: "error", message: errorMessage(error) }
        : { status: "loaded", value: response as StoredValueResponse };
  }

  #selectTab(tab: RawValueTab) {
    this._tab = tab;
    rememberedTab = tab;
  }

  override render() {
    const data = this.data;
    if (!data) return nothing;

    return html`
      <umb-body-layout headline=${`Raw value: ${this.localize.string(data.propertyLabel)}`}>
        ${this.#renderProperty(data)}
        <uui-tab-group>
          ${repeat(
            this.#tabs,
            (tab) => tab,
            (tab) =>
              html`<uui-tab
                label=${TAB_LABELS[tab]}
                ?active=${this._tab === tab}
                @click=${() => this.#selectTab(tab)}
              ></uui-tab>`,
          )}
        </uui-tab-group>
        <div class="panel" role="tabpanel" aria-label=${TAB_LABELS[this._tab]}>${this.#renderPanel()}</div>
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

  #renderPanel() {
    switch (this._tab) {
      case "editor":
        return html`
          ${this.#renderNoStoredValueNote()}
          <uui-box headline="Editor value">
            <p slot="header-actions" class="secondary">Unsaved changes included</p>
            <pjv-value-view
              label="Editor value"
              empty-message="The editor holds no value"
              .display=${this._editor}
            ></pjv-value-view>
          </uui-box>
        `;
      case "stored":
        return this.#renderStored();
      case "diff":
        return this.#renderDiff();
    }
  }

  #renderNoStoredValueNote() {
    if (this.#tabs.includes("stored")) return nothing;
    const message =
      this.data?.entityType === "element"
        ? html`This property is inside a block, so it has no stored value of its own: it is stored inside the parent
            block property's value. Use <strong>View raw value</strong> on that property to see it.`
        : html`Stored values can only be read for document properties.`;
    return html`<uui-box class="note" headline="No stored value"><p>${message}</p></uui-box>`;
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
          ${
            this._savedMessage
              ? html`<uui-box class="saved"><p role="status">${this._savedMessage}</p></uui-box>`
              : nothing
          }
          <uui-box headline=${this._editing ? "Edit stored draft" : "Stored draft"}>
            <div slot="header-actions" class="header-actions">
              <uui-tag look="secondary">${stored.value.storageType}</uui-tag>
              ${
                this.#canEdit && !this._editing
                  ? html`<uui-button
                      label="Edit raw value"
                      look="outline"
                      compact
                      @click=${() => {
                        this._savedMessage = undefined;
                        this._editing = true;
                      }}
                    ></uui-button>`
                  : nothing
              }
            </div>
            ${
              this._editing
                ? html`<pjv-raw-value-edit-panel
                    .storedDraft=${displayStoredValue(stored.value.draft)}
                    .request=${this.#request}
                    @saved=${this.#onSaved}
                    @cancel=${() => (this._editing = false)}
                  ></pjv-raw-value-edit-panel>`
                : html`<pjv-value-view
                    label="Stored draft value"
                    .display=${displayStoredValue(stored.value.draft)}
                  ></pjv-value-view>`
            }
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

  #renderDiff() {
    const stored = this._stored;
    if (stored.status !== "loaded") return this.#renderStored();

    const comparison = compareValues(displayStoredValue(stored.value.draft), this._editor);
    if (comparison.same) {
      return html`<uui-box headline="Stored draft and editor value">
        <p>The editor value and the stored draft are the same.</p>
      </uui-box>`;
    }

    return html`
      <uui-box headline="Stored draft and editor value">
        <p slot="header-actions" class="secondary">Left: stored draft. Right: editor value.</p>
        <pjv-value-diff
          .original=${comparison.original}
          .modified=${comparison.modified}
          language=${comparison.language}
        ></pjv-value-diff>
      </uui-box>
    `;
  }

  static override styles = [
    css`
      uui-box + uui-box {
        margin-top: var(--uui-size-space-5);
      }

      uui-tab-group {
        /* The tab group fills its container's height by default, which in the drawer body is the whole panel. */
        height: auto;
        margin-top: var(--uui-size-space-5);
        --uui-tab-divider: var(--uui-color-border);
      }

      .panel {
        margin-top: var(--uui-size-space-4);
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

      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
      }

      .saved {
        --uui-box-default-padding: var(--uui-size-space-4);
        border-left: 4px solid var(--uui-color-positive);
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
