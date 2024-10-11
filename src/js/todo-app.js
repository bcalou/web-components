/**
 * The root component for the whole todo experience
 */
customElements.define(
  "todo-app",
  class TodoApp extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" });

      this.shadowRoot.innerHTML = /* HTML */ ` <h1>Ma Todo-List</h1>
        <todo-new></todo-new>
        <todo-list></todo-list>`;
    }
  }
);
