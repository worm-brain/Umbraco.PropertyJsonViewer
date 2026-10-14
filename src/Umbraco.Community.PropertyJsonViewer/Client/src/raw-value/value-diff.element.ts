import {
  css,
  customElement,
  html,
  property,
  state,
  unsafeCSS,
  type PropertyValues,
} from "@umbraco-cms/backoffice/external/lit";
import type { monaco as Monaco } from "@umbraco-cms/backoffice/external/monaco-editor";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

/**
 * A read-only side-by-side diff in Monaco's own diff editor, the one `umb-code-editor` is built on. The core
 * element has no diff mode, so this creates Monaco's diff editor directly with the same bundled Monaco and CSS.
 */
@customElement("pjv-value-diff")
export class ValueDiffElement extends UmbLitElement {
  /** Left-hand text. Changing it after the first render updates the diff in place. */
  @property()
  original = "";

  /** Right-hand text. Changing it after the first render updates the diff in place. */
  @property()
  modified = "";

  /** Monaco language id for both sides, for example `json` or `plaintext`. */
  @property()
  language = "plaintext";

  /**
   * Accessible name of the left-hand side, which screen readers announce in its text area. Read once, when the
   * diff is first drawn.
   */
  @property({ attribute: "original-label" })
  originalLabel = "Stored draft";

  /** Accessible name of the right-hand side. Read once, when the diff is first drawn. */
  @property({ attribute: "modified-label" })
  modifiedLabel = "Editor value";

  @state()
  private _styles = "";

  #monaco?: typeof Monaco;
  #editor?: Monaco.editor.IStandaloneDiffEditor;
  #models: Array<Monaco.editor.ITextModel> = [];

  override async firstUpdated() {
    // Loaded on first use: Monaco is large, and most drawer openings never reach the Diff tab.
    const { monaco, styles } = await import("@umbraco-cms/backoffice/external/monaco-editor");
    this.#monaco = monaco;
    this._styles = styles;
    await this.updateComplete;

    const container = this.renderRoot.querySelector<HTMLElement>("#diff");
    if (!container || !this.isConnected) return;
    this.#editor = monaco.editor.createDiffEditor(container, {
      readOnly: true,
      originalEditable: false,
      automaticLayout: true,
      renderSideBySide: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
    });
    // Each side has its own text area for keyboard and screen reader use, which has no name unless its editor is
    // given one. Set on the two editors because the diff editor's own originalAriaLabel and modifiedAriaLabel
    // options are declared but not applied by the bundled Monaco.
    this.#editor.getOriginalEditor().updateOptions({ ariaLabel: this.originalLabel });
    this.#editor.getModifiedEditor().updateOptions({ ariaLabel: this.modifiedLabel });
    this.#setModels();
  }

  override updated(changed: PropertyValues<this>) {
    if (this.#editor && (changed.has("original") || changed.has("modified") || changed.has("language"))) {
      this.#setModels();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#editor?.dispose();
    this.#editor = undefined;
    this.#disposeModels();
  }

  #setModels() {
    if (!this.#monaco || !this.#editor) return;
    const previous = this.#models;
    this.#models = [
      this.#monaco.editor.createModel(this.original, this.language),
      this.#monaco.editor.createModel(this.modified, this.language),
    ];
    this.#editor.setModel({ original: this.#models[0]!, modified: this.#models[1]! });
    // Models outlive editors in Monaco, so replaced ones must be disposed or they leak.
    previous.forEach((model) => model.dispose());
  }

  #disposeModels() {
    this.#models.forEach((model) => model.dispose());
    this.#models = [];
  }

  override render() {
    return html`
      <style>
        ${unsafeCSS(this._styles)}
      </style>
      <div id="diff" role="region" aria-label="Differences between the stored draft and the editor value"></div>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
      }

      #diff {
        height: min(60vh, 40rem);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "pjv-value-diff": ValueDiffElement;
  }
}
