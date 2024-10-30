/**
 * A form to a add or edit a todo
 */
customElements.define(
  "todo-form",
  class TodoForm extends HTMLElement {
    connectedCallback() {
      this.defaultValue = this.getAttribute("default-value") ?? "";
      this.submitLabel = this.getAttribute("submit-label") ?? "Ajouter";
      this.submitIcon = this.getAttribute("submit-icon") ?? "➕";
      this.autofocus = this.hasAttribute("autofocus");

      this.attachShadow({ mode: "open", delegatesFocus: true });

      this.shadowRoot.innerHTML = /* HTML */ ` <style>
          form {
            display: flex;
            gap: 0.75rem;
          }

          label {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-grow: 1;

            span {
              flex-shrink: 0;
            }
          }

          input {
            min-width: 0;
            width: 100%;
            height: 2rem;
            box-sizing: border-box;
            font-size: inherit;
            font-family: inherit;
          }
        </style>

        <form>
          <label
            ><span>Tâche :</span>
            <input
              name="label"
              required
              maxlength="100"
              value="${this.defaultValue}"
              pattern=".*[a-zA-Z0-9].*"
          /></label>
          <todo-icon-button
            label="${this.submitLabel}"
            icon="${this.submitIcon}"
          ></todo-icon-button>
        </form>`;

      this.$form = this.shadowRoot.lastElementChild;
      this.$input = this.shadowRoot.querySelector("input");

      if (this.autofocus) {
        this.$input.focus();

        // Set cursor to end
        this.$input.selectionStart = this.$input.selectionEnd =
          this.$input.value.length;
      }

      this.shadowRoot
        .querySelector("todo-icon-button")
        .addEventListener("click", () => this.$form.requestSubmit());

      this.$form.addEventListener("submit", this.onSubmit.bind(this));

      this.$form.addEventListener("keydown", this.onKeydown.bind(this));
    }

    onSubmit(event) {
      event.preventDefault();

      this.dispatchEvent(
        new CustomEvent("submit", {
          detail: {
            label: this.$input.value,
          },
        })
      );

      // Reset the input
      this.$input.value = "";
    }

    onKeydown(event) {
      if (event.key === "Escape") {
        this.dispatchEvent(new CustomEvent("quit"));
      }
    }
  }
);
