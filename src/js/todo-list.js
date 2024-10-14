import { todoStore } from "./todo-store.js";

/**
 * The actual list of items
 */
customElements.define(
  "todo-list",
  class TodoList extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" });

      todoStore.subscribe(this.showTodos.bind(this));
    }

    async showTodos(todos) {
      this.shadowRoot.innerHTML = "";

      const $list = document.createElement("ul");

      (await todos).forEach((todo) => {
        const $todoLi = document.createElement("li");
        $todoLi.setAttribute("data-id", todo.id);
        const $todoItem = document.createElement("todo-item");

        // Pass the todo object to the todo-item component
        $todoItem.todo = todo;

        $todoLi.appendChild($todoItem);
        $list.appendChild($todoLi);
      });

      this.shadowRoot.appendChild($list);
    }
  }
);
