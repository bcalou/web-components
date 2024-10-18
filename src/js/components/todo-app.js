import { todoStore } from "../store/todo-store.js";
import "./todo-form.js";
import "./todo-icon-button.js";
import "./todo-item.js";
import "./todo-list.js";

/**
 * The root component for the whole todo experience
 */
customElements.define(
  "todo-app",
  class TodoApp extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" });

      this.shadowRoot.innerHTML = /* HTML */ ` <style>
          :host {
            --todo-color-black: #333;
            --todo-color-white: white;

            --todo-color-blue-light: #e4f6fc;
            --todo-color-blue: #bae0ed;
            --todo-color-blue-dark: #023b4e;

            font-family: Monospace;
            font-size: 1.25rem;
            line-height: 1.5;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1rem 2rem;
            background: var(--todo-color-blue-light);
            min-height: 100dvh;
            box-sizing: border-box;
          }

          :host > * {
            max-width: 25rem;
          }

          :host > div {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            flex-grow: 1;
          }

          h1 {
            font-size: 2rem;
            font-weight: bold;
            margin-block-start: 0;
            margin-block-end: 1rem;
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

        <button id="install" hidden>Installer l'application</button>
        <h1>Ma Todo-List</h1>

        <div>
          <todo-form></todo-form>
          <todo-list></todo-list>
          <p role="status" id="state"></p>
          <div class="actions">
            <button id="markAllAsDone">Cocher toutes les tâches</button>
            <button id="deleteDone">Supprimer les tâches effectuées</button>
          </div>
        </div>`;

      this.$install = this.shadowRoot.getElementById("install");
      this.$todoForm = this.shadowRoot.querySelector("todo-form");
      this.$todoList = this.shadowRoot.querySelector("todo-list");
      this.$state = this.shadowRoot.getElementById("state");
      this.$markAllAsDone = this.shadowRoot.getElementById("markAllAsDone");
      this.$deleteDone = this.shadowRoot.getElementById("deleteDone");

      this.$install.addEventListener("click", () =>
        this.dispatchEvent(new CustomEvent("install"))
      );

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
        state = "Aucune tâche pour le moment 🙏";
      } else if (remaining === 0) {
        state = "Toutes les tâches ont été effectuées ! ✨";
      } else {
        state = `${remaining} tâche${remaining > 1 ? "s" : ""} restante${
          remaining > 1 ? "s" : ""
        }`;
      }

      this.$state.innerHTML = state;
    }
  }
);
