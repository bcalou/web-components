import { todoManager } from "../data/todo-manager.js";
import "./todo-main.js";

/**
 * The root component, responsible for holding the root styles and the app main
 * component
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
            background: var(--todo-color-blue-light);

            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            box-sizing: border-box;
            padding: 1rem 1rem 2rem;
            min-height: 100dvh;
          }

          h1 {
            font-size: 2rem;
            font-weight: bold;
            margin-block: 0;
          }

          .content {
            max-width: 25rem;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          }
        </style>

        <h1>Ma Todo-List</h1>

        <div class="content">
          <todo-main></todo-main>
        </div>`;
    }
  }
);
