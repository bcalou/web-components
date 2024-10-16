import { todoStore } from "../store/todo-store.js";
import "./todo-form.js";
import "./todo-list.js";

/**
 * The root component for the whole todo experience
 */
customElements.define(
  "todo-app",
  class TodoApp extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" });

      this.shadowRoot.innerHTML = /* HTML */ ` <h1>Ma Todo-List</h1>
        <todo-form></todo-form>
        <todo-list></todo-list>
        <p role="status" id="state"></p>
        <button id="markAllAsDone">Cocher toutes les tâches</button>
        <button id="deleteDone">Supprimer les tâches effectuées</button>`;

      this.$todoForm = this.shadowRoot.querySelector("todo-form");
      this.$todoList = this.shadowRoot.querySelector("todo-list");
      this.$state = this.shadowRoot.getElementById("state");
      this.$markAllAsDone = this.shadowRoot.getElementById("markAllAsDone");
      this.$deleteDone = this.shadowRoot.getElementById("deleteDone");

      this.$todoForm.addEventListener("submit", (event) =>
        todoStore.add(event.detail.label)
      );

      // Transfer focus to form if list becomes empty
      this.$todoList.addEventListener(
        "empty",
        this.$todoForm.focus.bind(this.$todoForm)
      );

      this.$markAllAsDone.addEventListener(
        "click",
        todoStore.markAllAsDone.bind(todoStore)
      );

      this.$deleteDone.addEventListener(
        "click",
        todoStore.deleteDone.bind(todoStore)
      );

      this.update();
      this.unsubscribe = todoStore.subscribe(this.update.bind(this));
    }

    disconnectedCallback() {
      this.unsubscribe();
    }

    async update() {
      const { total, done, remaining } = await todoStore.getCount();

      this.setState(total, remaining);

      // Disable the buttons when actions are useless
      this.$markAllAsDone.disabled = remaining === 0;
      this.$deleteDone.disabled = done === 0;
    }

    setState(total, remaining) {
      let state = "";
      Gamepad;

      if (total === 0) {
        state = "Aucune tâche pour le moment";
      } else if (remaining === 0) {
        state = "Toutes les tâches ont été effectuées !";
      } else {
        state = `${remaining} tâche${remaining > 1 ? "s" : ""} restantes`;
      }

      this.$state.innerHTML = state;
    }
  }
);
