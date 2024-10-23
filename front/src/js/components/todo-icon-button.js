/**
 * An clickable icon
 */
customElements.define(
  "todo-icon-button",
  class TodoIconButton extends HTMLElement {
    static observedAttributes = ["icon", "label"];

    connectedCallback() {
      this.attachShadow({ mode: "open" });

      if (!this.hasAttribute("icon") || !this.hasAttribute("label")) {
        console.error(
          "todo-icon-button component requires both a label and an icon"
        );
        return;
      }

      this.shadowRoot.innerHTML = /* HTML */ `<style>
          button {
            height: 2rem;
            width: 2rem;
            background-color: var(--todo-color-blue);
            border: 0.0625rem solid var(--todo-color-blue-dark);
            border-radius: 0.25rem;
            font-size: 1.25rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }
        </style>

        <button aria-label="${this.getAttribute("label")}">
          ${this.getAttribute("icon")}
        </button>`;
    }
  }
);
