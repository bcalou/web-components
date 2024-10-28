import { TodoStore } from "./todo-store.js";
import { TodoWS } from "./todo-ws.js";

class TodoManager {
  constructor() {
    this.store = new TodoStore((items) => this.notify(items));
    this.ws = new TodoWS((message) => this.store.send(message));

    this.listeners = [];
  }

  // Register a function that will be called when the store is updated
  // This way, components can keep track of what's happening
  subscribe(callback) {
    this.listeners.push(callback);

    // Return a method that can be called to unsubscribe
    return () => this.unsubscribe(callback);
  }

  // Remove a listener
  unsubscribe(callback) {
    this.listeners = this.listeners.filter((listener) => listener !== callback);
  }

  // Notify the changes to each listeners
  notify(items) {
    this.listeners.forEach((callback) => callback(items));
  }

  // Get all the todos
  getAll() {
    return this.store.getAll();
  }

  // Get an object containing total and done count of the todos
  async getCount() {
    const todos = await this.store.getAll();

    const count = {
      total: todos.length,
      done: todos.filter((todo) => todo.done).length,
    };

    count.remaining = count.total - count.done;

    return count;
  }

  // Get a todo by id
  getById(id) {
    return this.store.getById(id);
  }

  // Add a todo
  add(label) {
    this.send({
      action: "add",
      payload: { todo: { id: crypto.randomUUID(), label, done: 0 } },
    });
  }

  // Update a todo
  updateById(id, changes) {
    this.send({ action: "updateById", payload: { id, changes } });
  }

  // Set all todos to done = 1
  async markAllAsDone() {
    const idsToUpdate = (await this.store.getAll())
      .filter((todo) => !todo.done)
      .map((todo) => todo.id);

    this.send({
      action: "updateById",
      payload: { id: idsToUpdate, changes: { done: 1 } },
    });
  }

  // Delete a todo
  deleteById(id) {
    this.send({ action: "deleteById", payload: { id } });
  }

  // Delete all todos where done = 1
  async deleteDone() {
    const idsToDelete = (await this.store.getAll())
      .filter((todo) => todo.done)
      .map((todo) => todo.id);

    this.send({ action: "deleteById", payload: { id: idsToDelete } });
  }

  // Send a message to both the store and the WS
  send(message) {
    this.store.send(message);
    this.ws.send(message);
  }
}

export const todoManager = new TodoManager();
