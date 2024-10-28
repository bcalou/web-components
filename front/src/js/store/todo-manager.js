import { todoStore } from "./todo-store.js";
import { todoWS } from "./todo-ws.js";

class TodoManager {
  constructor() {
    todoWS.subscribe((message) => todoStore.send(message));

    this.listeners = [];
  }

  // Register a function that will be called when the store is updated
  // This way, components can keep track of what's happening
  subscribe(callback) {
    this.listeners.push(callback);

    // Return a method that can be called to unsubscribe
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback) {
    this.listeners = this.listeners.filter((listener) => listener !== callback);
  }

  // Get all the todos
  getAll() {
    todoWS.send({ action: "getAll" });
  }

  // Get a todo by id
  getById() {}

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

  // Delete a todo
  deleteById(id) {
    this.send({ action: "deleteById", payload: { id } });
  }

  // Send a message to both the store and the WS
  send(message) {
    todoStore.send(message);
    todoWS.send(message);
  }
}

export const todoManager = new TodoManager();
