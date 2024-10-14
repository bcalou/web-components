import { todoStore } from "./todo-store.js";

/**
 * A form to a add a new todo
 */
customElements.define(
  "todo-new",
  class TodoNew extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" });

      this.shadowRoot.innerHTML = /* HTML */ `<form>
        <label>Titre : <input name="label" required maxlength="100" /></label>
        <button>Ajouter</button>
      </form>`;

      this.$input = this.shadowRoot.querySelector("input");
      this.shadowRoot
        .getRootNode()
        .addEventListener("submit", this.onSubmit.bind(this));
    }

    onSubmit(event) {
      event.preventDefault();

      todoStore.add(this.$input.value);

      // Reset the input
      this.$input.value = "";
    }
  }
);
