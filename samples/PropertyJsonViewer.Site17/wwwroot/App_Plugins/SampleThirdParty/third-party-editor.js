// Stands in for a property editor from another package, so the sample sites can check that the
// "View raw value" action reaches editors this package knows nothing about. Plain JS, no build step.
export default class SampleThirdPartyEditor extends HTMLElement {
  #input = document.createElement("input");

  constructor() {
    super();
    this.#input.addEventListener("input", () => {
      this.value = this.#input.value;
      this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    });
  }

  connectedCallback() {
    this.#input.style.width = "100%";
    this.replaceChildren(this.#input);
  }

  set value(value) {
    this._value = value;
    if (this.#input.value !== (value ?? "")) this.#input.value = value ?? "";
  }

  get value() {
    return this._value;
  }
}

customElements.define("sample-third-party-editor", SampleThirdPartyEditor);
