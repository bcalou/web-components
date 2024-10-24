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

      if (this.hasFocus) {
        this.dispatchEvent(new CustomEvent("delete"));
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

      this.shadowRoot.addEventListener("focusin", () => (this.hasFocus = true));
      this.shadowRoot.addEventListener(
        "focusout",
        (event) =>
          (this.hasFocus =
            // Absence of relatedTarget = the item was just deleted
            // (in that case, we consider that the focus is still on the item)
            !event.relatedTarget ||
            // Related target included in shadowRoot : still has focus
            this.shadowRoot.contains(event.relatedTarget))
      );
    }

    renderViewMode(focusEditButton = false) {
      this.mode = "view";

      this.shadowRoot.innerHTML = /* HTML */ `
        <style>
          :host {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
            width: 100%;
          }

          label {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            user-select: none;
            cursor: pointer;
            overflow-wrap: anywhere;
          }

          input {
            height: 1.5rem;
            width: 1.5rem;
            flex-shrink: 0;
          }

          input:checked ~ span {
            text-decoration: line-through;
          }

          .actions {
            flex-shrink: 0;
          }
        </style>
        <form>
          <label>
            <input type="checkbox" ${this.todo.done ? "checked" : ""} />
            <span id="label">${this.todo.label}</span>
          </label>
        </form>
        <div class="actions">
          <todo-icon-button
            id="delete"
            icon="🗑️"
            label="Supprimer ${this.todo.label}"
          ></todo-icon-button>
          <todo-icon-button
            id="edit"
            icon="✏️"
            label="Modifier ${this.todo.label}"
          ></todo-icon-button>
        </div>
      `;

      this.$label = this.shadowRoot.getElementById("label");

      this.$input = this.shadowRoot.querySelector("input");
      this.$input.addEventListener("input", (event) =>
        todoStore.update(this.todo.id, { done: event.target.checked })
      );

      this.shadowRoot
        .getElementById("delete")
        .addEventListener("click", () => todoStore.delete(this.todo.id));

      this.$edit = this.shadowRoot.getElementById("edit");
      this.$edit.addEventListener("click", this.renderEditMode.bind(this));

      if (focusEditButton) {
        this.$edit.focus();
      }
    }

    renderEditMode() {
      this.mode = "edit";

      this.shadowRoot.innerHTML = /* HTML */ `<todo-form
        submit-icon="✔️"
        default-value="${this.todo.label}"
        autofocus
      ></todo-form>`;

      this.shadowRoot.firstElementChild.addEventListener(
        "submit",
        this.onSubmit.bind(this)
      );

      this.shadowRoot.firstElementChild.addEventListener("quit", () =>
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

      if (!updatedTodo) return;

      // In view mode, update the todo if there are changes
      if (this.mode === "view") {
        if (updatedTodo.label !== this.todo.label) {
          this.$label.innerHTML = updatedTodo.label;
        }

        if (updatedTodo.done !== this.todo.done) {
          this.$input.checked = !!updatedTodo.done;
        }
      }

      // Update local state
      this.todo = updatedTodo;
    }
  }
);
