import { todoStore } from "../data/todo-store.js";
import "./todo-form.js";
import "./todo-icon-button.js";
import "./todo-item.js";
import "./todo-list.js";

/**
 * The main component
 */
customElements.define(
  "todo-main",
  class TodoMain extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" });

      this.shadowRoot.innerHTML = /* HTML */ `
        <style>
          :host {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          [role="status"] {
            text-align: center;
            margin-block-start: auto;
            border-block-start: 0.0625rem solid var(--todo-color-blue-dark);
            padding-block-start: 1.5rem;
          }

          .actions {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
          }

          button {
            font-family: inherit;
            font-size: inherit;
            width: 100%;
            min-height: 3rem;
            background-color: var(--todo-color-blue-dark);
            color: var(--todo-color-white);
            border: none;
            cursor: pointer;
          }

          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        </style>

        <todo-form></todo-form>
        <todo-list></todo-list>
        <p role="status"></p>
        <div class="actions">
          <button id="markAllAsDone">Cocher toutes les tâches</button>
          <button id="deleteDone">Supprimer les tâches effectuées</button>
        </div>
      `;

      this.$todoForm = this.shadowRoot.querySelector("todo-form");
      this.$todoList = this.shadowRoot.querySelector("todo-list");
      this.$status = this.shadowRoot.querySelector('[role="status"]');
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

      if (total === 0) {
        state = "Aucune tâche pour le moment 🙏";
      } else if (remaining === 0) {
        state = "Toutes les tâches ont été effectuées ! ✨";
      } else {
        state = `${remaining} tâche${remaining > 1 ? "s" : ""} restante${
          remaining > 1 ? "s" : ""
        }`;
      }

      this.$status.innerHTML = state;
    }
  }
);
