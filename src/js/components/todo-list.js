import { todoStore } from "../store/todo-store.js";
import "./todo-item.js";

/**
 * The actual list of items
 */
customElements.define(
  "todo-list",
  class TodoList extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" });

      this.shadowRoot.innerHTML = `<ol></ol>`;

      this.init();
    }

    disconnectedCallback() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    }

    async init() {
      // Get a local record of the todos for clever DOM updates
      this.todos = new Map(
        (await todoStore.getAll()).map((todo) => [todo.id, todo])
      );

      this.todos.forEach(this.showTodo.bind(this));

      this.unsubscribe = todoStore.subscribe(this.update.bind(this));
    }

    showTodo(todo) {
      const $todoLi = document.createElement("li");

      const $todoItem = document.createElement("todo-item");
      $todoItem.setAttribute("todo-id", todo.id);

      $todoItem.addEventListener("delete", () => this.onDelete($todoLi));

      $todoLi.appendChild($todoItem);
      this.shadowRoot.firstChild.appendChild($todoLi);
    }

    // Handle focus position when an item is deleted
    onDelete($todoLi) {
      if ($todoLi.nextSibling) {
        $todoLi.nextSibling.firstChild.focus();
      } else if ($todoLi.previousSibling) {
        $todoLi.previousSibling.firstChild.focus();
      } else {
        this.dispatchEvent(new CustomEvent("empty"));
      }
    }

    update(updatedTodos) {
      // Check if there are new todos to display
      updatedTodos.forEach((updatedTodo) => {
        if (!this.todos.get(updatedTodo.id)) {
          this.showTodo(updatedTodo);

          this.todos.set(updatedTodo.id, updatedTodo); // Update local state
        }
      });

      // Check if todos need to be removed
      this.todos.forEach((todo) => {
        if (!updatedTodos.get(todo.id)) {
          const $li = this.shadowRoot
            .querySelector(`[todo-id="${todo.id}"]`)
            .parentElement.remove();

          this.todos.delete(todo.id); // Update local state
        }
      });
    }
  }
);
