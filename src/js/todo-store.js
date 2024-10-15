import { Store } from "./store.js";

/**
 * Store for the todos
 */
class TodoStore extends Store {
  constructor() {
    super("todo-list", "todo");
  }

  add(label) {
    const todo = {
      label,
      done: false,
      createdAt: Date().now,
    };

    return super.add(todo);
  }

  // Get an object containing the total, done and remaining todos count
  async getCount() {
    return await this.getAll().then((todos) => {
      const count = {
        total: todos.length,
        done: todos.filter((todo) => todo.done).length,
      };

      count.remaining = count.total - count.done;

      return count;
    });
  }

  async markAllAsDone() {
    return await this.executeForEach(
      (cursor, store) =>
        cursor.value.done
          ? undefined
          : store.put({
              ...cursor.value,
              done: true,
            }),
      {
        onSuccess: (cursor) =>
          console.info(`Set todo #${cursor.value.id} done property to true`),
        onGlobalSuccess: this.notify.bind(this),
      }
    );
  }

  async deleteDone() {
    return await this.executeForEach(
      (cursor) => (cursor.value.done ? cursor.delete() : undefined),
      {
        onSuccess: (cursor) => console.info(`Deleted todo #${cursor.value.id}`),
        onGlobalSuccess: this.notify.bind(this),
      }
    );
  }
}

export const todoStore = new TodoStore();
