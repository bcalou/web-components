import { todoStore } from "../store/todo-store.js";

/**
 * Detail of a todo list item and associated actions (delete, rename...)
 */
customElements.define(
  "todo-item",
  class TodoItem extends HTMLElement {
    static observedAttributes = ["todo-id"];

    connectedCallback() {
      this.attachShadow({ mode: "open", delegatesFocus: true });

      this.init();
    }

    disconnectedCallback() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    }

    async init() {
      const id = this.getAttribute("todo-id");

      if (!id) {
        console.error("todo-item component must receive a todo-id attribute");
        return;
      }

      this.todo = await todoStore.getById(parseInt(id));

      if (!this.todo) {
        console.error(`No todo-item found with id ${id}`);
        return;
      }

      this.renderViewMode();

      this.unsubscribe = todoStore.subscribe(this.update.bind(this));
    }

    renderViewMode(focusEditButton = false) {
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

      this.$input = this.shadowRoot.querySelector("input");
      this.$delete = this.shadowRoot.getElementById("delete");
      this.$edit = this.shadowRoot.getElementById("edit");

      this.$input.addEventListener("input", (event) =>
        todoStore.update(this.todo.id, { done: event.target.checked })
      );

      if (focusEditButton) {
        this.$edit.focus();
      }

      this.$delete.addEventListener("click", this.onDelete.bind(this));
      this.$edit.addEventListener("click", this.renderEditMode.bind(this));
    }

    onDelete() {
      todoStore.delete(this.todo.id);

      this.dispatchEvent(new CustomEvent("delete"));
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

      this.shadowRoot.firstChild.addEventListener("quit", () =>
        this.renderViewMode(true)
      );
    }

    onSubmit(event) {
      this.todo.label = event.detail.label;
      todoStore.update(this.todo.id, { label: this.todo.label });

      this.renderViewMode(true);
    }

    update(updatedTodos) {
      const updatedTodo = updatedTodos.get(this.todo.id);

      if (updatedTodo && this.$input.checked !== updatedTodo.done) {
        this.$input.checked = updatedTodo.done;
      }
    }
  }
);
