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

      this.shadowRoot.innerHTML = /* HTML */ `
        ${this.todo.label}
        <button id="delete" aria-label="Supprimer ${this.todo.label}">
          🗑️
        </button>
        <button id="edit" aria-label="Modifier ${this.todo.label}">✏️</button>
      `;

      this.shadowRoot
        .getElementById("delete")
        .addEventListener("click", this.onDelete.bind(this));
      this.shadowRoot
        .getElementById("edit")
        .addEventListener("click", this.onEdit.bind(this));
    }

    onDelete() {
      todoStore.deleteTodo(this.todo.id).then(() => {
        this.remove();
      });
    }

    onEdit() {}
  }
);
