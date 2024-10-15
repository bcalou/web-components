/**
 * A form to a add or edit a todo
 */
customElements.define(
  "todo-form",
  class TodoForm extends HTMLElement {
    static get observedAttributes() {
      return ["autofocus", "default-value", "submit-label"];
    }

    connectedCallback() {
      this.attachShadow({ mode: "open" });

      this.shadowRoot.innerHTML = /* HTML */ `<form>
        <label
          >Titre :
          <input
            name="label"
            required
            maxlength="100"
            value="${this.getAttribute("default-value") ?? ""}"
        /></label>
        <button>${this.getAttribute("submit-label") ?? "Ajouter"}</button>
      </form>`;

      this.$input = this.shadowRoot.querySelector("input");

      if (this.hasAttribute("autofocus")) {
        this.$input.focus();

        // Set cursor to end
        this.$input.selectionStart = this.$input.selectionEnd =
          this.$input.value.length;
      }

      this.shadowRoot
        .getRootNode()
        .addEventListener("submit", this.onSubmit.bind(this));

      this.$input.addEventListener("keydown", this.onKeydown.bind(this));
    }

    onSubmit(event) {
      event.preventDefault();

      this.dispatchEvent(
        new CustomEvent("submit", {
          detail: {
            label: this.$input.value,
          },
        })
      );

      // Reset the input
      this.$input.value = "";
    }

    onKeydown(event) {
      if (event.key === "Escape") {
        this.dispatchEvent(new CustomEvent("quit"));
      }
    }
  }
);
