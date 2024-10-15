import { todoStore } from "./todo-store.js";

/**
 * The actual list of items
 */
customElements.define(
  "todo-list",
  class TodoList extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" });

      this.shadowRoot.innerHTML = `<ol></ol>`;

      this.showTodos();

      todoStore.subscribe(this.updateTodos.bind(this));
    }

    async showTodos() {
      this.todos = await todoStore.getAll();

      this.todos.forEach(this.showTodo.bind(this));
    }

    showTodo(todo) {
      const $todoLi = document.createElement("li");
      $todoLi.setAttribute("data-id", todo.id);
      const $todoItem = document.createElement("todo-item");

      // Pass the todo object to the todo-item component
      $todoItem.todo = todo;

      $todoItem.addEventListener("delete", () => this.onDelete($todoLi, todo));

      $todoLi.appendChild($todoItem);
      this.shadowRoot.firstChild.appendChild($todoLi);
    }

    onDelete($todoLi, todoToDelete) {
      $todoLi.remove();

      this.todos = this.todos.filter((todo) => todo.id !== !todoToDelete.id);
    }

    async updateTodos(newTodos) {
      // Check if there are new todos to display
      newTodos.forEach((newTodo) => {
        if (!this.todos.find((todo) => todo.id === newTodo.id)) {
          this.showTodo(newTodo);
        }
      });

      // Update the local list of todos for the next check
      this.todos = newTodos;
    }
  }
);
