import { todoStore } from "./todo-store.js";

/**
 * Detail of a todo list item and associated actions (delete, rename...)
 */
customElements.define(
  "todo-item",
  class TodoItem extends HTMLElement {
    static observedAttributes = ["todo"];

    connectedCallback() {
      this.attachShadow({ mode: "open" });

      if (!this.todo) {
        console.error("todo-item component must receive a todo object");
        return;
      }

      this.renderViewMode();
    }

    renderViewMode() {
      this.shadowRoot.innerHTML = /* HTML */ `
        <form>
          <label>
            <input type="checkbox" ${this.todo.done ? "checked" : ""}>
              ${this.todo.label}
            </input>
          </label>
        </form>
        <button id="delete" aria-label="Supprimer ${this.todo.label}">
          🗑️
        </button>
        <button id="edit" aria-label="Modifier ${this.todo.label}">✏️</button>
      `;

      this.shadowRoot
        .querySelector("input[type='checkbox']")
        .addEventListener("input", (event) =>
          todoStore.update(this.todo.id, { done: event.target.checked })
        );

      this.shadowRoot
        .getElementById("delete")
        .addEventListener("click", this.onDelete.bind(this));

      this.shadowRoot
        .getElementById("edit")
        .addEventListener("click", this.renderEditMode.bind(this));
    }

    renderEditMode() {
      this.shadowRoot.innerHTML = /* HTML */ `<todo-form
        submit-label="Valider"
        default-value=${this.todo.label}
        autofocus
      ></todo-form>`;

      this.shadowRoot.firstChild.addEventListener(
        "submit",
        this.onSubmit.bind(this)
      );

      this.shadowRoot.firstChild.addEventListener(
        "quit",
        this.renderViewMode.bind(this)
      );
    }

    async onSubmit(event) {
      this.todo.label = event.detail.label;
      todoStore.update(this.todo.id, { label: this.todo.label });

      this.renderViewMode();
    }

    onDelete() {
      todoStore.delete(this.todo.id);

      this.dispatchEvent(new CustomEvent("delete"));
    }
  }
);
