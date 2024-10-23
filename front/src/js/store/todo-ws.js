/**
 * WebSocket requests for the todos
 */
class TodoWS {
  constructor() {
    this.listeners = [];

    this.ready = this.initializeWS();
  }

  async initializeWS() {
    return await new Promise((resolve, reject) => {
      this.ws = new WebSocket("ws://localhost:8080");

      this.ws.onopen = () => {
        console.info("WS connection open");

        resolve(this.ws);
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.notify(data.items);
      };

      this.ws.onclose = () => {
        console.info("Disconnected from WebSocket server");
      };

      this.ws.onerror = (error) => {
        reject(`WebSocket Error: ${error}`);
      };
    });
  }

  // Register a function that will be called when the database is updated
  // This way, components can keep track of what's happening
  subscribe(callback) {
    this.listeners.push(callback);
  }

  // Notify the changes to each listeners
  async notify(data) {
    this.listeners.forEach((callback) => callback(data));
  }

  async add(item) {
    await this.ready;

    this.ws.send(
      JSON.stringify({ action: "add", payload: { label: item.label } })
    );
  }

  async update(id, changes) {
    await this.ready;

    this.ws.send(
      JSON.stringify({ action: "update", payload: { id, changes } })
    );
  }

  async markAllAsDone() {
    await this.ready;

    this.ws.send(JSON.stringify({ action: "markAllAsDone" }));
  }

  async delete(id) {
    await this.ready;

    this.ws.send(JSON.stringify({ action: "delete", payload: { id } }));
  }

  async deleteDone(id) {
    await this.ready;

    this.ws.send(JSON.stringify({ action: "deleteDone" }));
  }
}

export const todoWS = new TodoWS();
