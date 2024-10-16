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
      createdAt: new Date(),
    };

    return super.add(todo);
  }

  // Get an object containing the total, done and remaining todos count
  async getCount() {
    const todos = await this.getAll();

    const count = {
      total: todos.length,
      done: todos.filter((todo) => todo.done).length,
    };

    count.remaining = count.total - count.done;

    return count;
  }

  async markAllAsDone() {
    return await this.writeForEach(
      (cursor, store) =>
        cursor.value.done
          ? undefined
          : store.put({
              ...cursor.value,
              done: true,
            }),
      (cursor) =>
        console.info(`Set todo #${cursor.value.id} done property to true`)
    );
  }

  async deleteDone() {
    return await this.writeForEach(
      (cursor) => (cursor.value.done ? cursor.delete() : undefined),
      (cursor) => console.info(`Deleted todo #${cursor.value.id}`)
    );
  }
}

export const todoStore = new TodoStore();
