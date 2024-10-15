import { todoStore } from "./todo-store.js";

/**
 * The root component for the whole todo experience
 */
customElements.define(
  "todo-app",
  class TodoApp extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" });

      this.shadowRoot.innerHTML = /* HTML */ `<h1>Ma Todo-List</h1>
        <todo-form></todo-form>
        <todo-list></todo-list>
        <p role="status" id="state"></p>
        <button id="markAllAsDone">Cocher toutes les tâches</button>
        <button id="deleteDone">Supprimer les tâches effectuées</button>`;

      this.shadowRoot
        .querySelector("todo-form")
        .addEventListener("submit", (event) =>
          todoStore.add(event.detail.label)
        );

      this.$state = this.shadowRoot.getElementById("state");
      this.$markAllAsDone = this.shadowRoot.getElementById("markAllAsDone");
      this.$deleteDone = this.shadowRoot.getElementById("deleteDone");

      this.update();
      todoStore.subscribe(this.update.bind(this));

      this.$markAllAsDone.addEventListener(
        "click",
        todoStore.markAllAsDone.bind(todoStore)
      );

      this.$deleteDone.addEventListener(
        "click",
        todoStore.deleteDone.bind(todoStore)
      );
    }

    async update() {
      const { total, done, remaining } = await todoStore.getCount();

      this.setState(total, remaining);

      // Disable the buttons when actions are useless
      this.$markAllAsDone.disabled = remaining === 0;
      this.$deleteDone.disabled = done === 0;
    }

    async setState(total, remaining) {
      let state = "";

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
