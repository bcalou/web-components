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
        <label>
          <input type="checkbox" ${this.todo.done ? "checked" : ""}>
          ${this.todo.done ? `<del>${this.todo.label}</del>` : this.todo.label}
        </input>
        <button id="delete" aria-label="Supprimer ${this.todo.label}">
          🗑️
        </button>
        <button id="edit" aria-label="Modifier ${this.todo.label}">✏️</button>
      `;

      this.shadowRoot
        .querySelector("input[type='checkbox']")
        .addEventListener("input", this.onCheck.bind(this));
      this.shadowRoot
        .getElementById("delete")
        .addEventListener("click", this.onDelete.bind(this));
      this.shadowRoot
        .getElementById("edit")
        .addEventListener("click", this.onEdit.bind(this));
    }

    onCheck(event) {
      todoStore.setDone(this.todo.id, event.target.checked);
    }

    onDelete() {
      todoStore.delete(this.todo.id);
    }

    onEdit() {}
  }
);
