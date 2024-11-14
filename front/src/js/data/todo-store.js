import { TodoDB } from "./todo-db.js";
import { TodoWS } from "./todo-ws.js";

class TodoStore {
  #db;
  #ws;
  #listeners = [];

  constructor() {
    this.#db = new TodoDB((items) => this.#notify(items));

    this.#ws = new TodoWS(
      (message) => this.#db.send(message),
      // If WS failed, trigger a notification from the store instead
      () => {
        console.warn("WS unavailable, working in local mode");
        this.#db.notify();
      }
    );
  }

  // Register a function that will be called when the store is updated
  // This way, components can keep track of what's happening
  subscribe(callback) {
    this.#listeners.push(callback);

    // Return a method that can be called to unsubscribe
    return () => this.#unsubscribe(callback);
  }

  // Get all the todos
  getAll() {
    return this.#db.getAll();
  }

  // Get an object containing total and done count of the todos
  async getCount() {
    const todos = await this.#db.getAll();

    const count = {
      total: todos.length,
      done: todos.filter((todo) => todo.done).length,
    };

    count.remaining = count.total - count.done;

    return count;
  }

  // Get a todo by id
  getById(id) {
    return this.#db.getById(id);
  }

  // Add a todo
  add(label) {
    this.#send({
      action: "add",
      payload: { todo: { id: crypto.randomUUID(), label, done: 0 } },
    });
  }

  // Update a todo
  updateById(id, changes) {
    // Transform the id into an array containing only itself
    this.#send({ action: "updateByIds", payload: { ids: [id], changes } });
  }

  // Set all todos to done = 1
  async markAllAsDone() {
    const idsToUpdate = (await this.#db.getAll())
      .filter((todo) => !todo.done)
      .map((todo) => todo.id);

    this.#send({
      action: "updateByIds",
      payload: { ids: idsToUpdate, changes: { done: 1 } },
    });
  }

  // Delete a todo
  deleteById(id) {
    // Transform the id into an array containing only itself
    this.#send({ action: "deleteByIds", payload: { ids: [id] } });
  }

  // Delete all todos where done = 1
  async deleteDone() {
    const idsToDelete = (await this.#db.getAll())
      .filter((todo) => todo.done)
      .map((todo) => todo.id);

    this.#send({ action: "deleteByIds", payload: { ids: idsToDelete } });
  }

  // Notify the changes to each listeners
  #notify(items) {
    this.#listeners.forEach((callback) => callback(items));
  }

  // Remove a listener
  #unsubscribe(callback) {
    this.#listeners = this.#listeners.filter(
      (listener) => listener !== callback
    );
  }

  // Send a message to both the store and the WS
  #send(message) {
    this.#db.send(message);
    this.#ws.send(message);
  }
}

export const todoStore = new TodoStore();
