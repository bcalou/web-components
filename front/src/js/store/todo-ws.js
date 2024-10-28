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

      this.ws.onmessage = (event) => this.notify(JSON.parse(event.data));

      this.ws.onclose = () =>
        console.info("Disconnected from WebSocket server");

      this.ws.onerror = (error) => reject(`WebSocket Error: ${error}`);
    });
  }

  // Register a function that will be called when the database is updated
  // This way, components can keep track of what's happening
  subscribe(callback) {
    this.listeners.push(callback);
  }

  // Notify the changes to each listeners
  notify(data) {
    this.listeners.forEach((callback) => callback(data));
  }

  // Send a message to the web socket server
  async send(message) {
    await this.ready;

    console.info("Sending to WS:", message);
    this.ws.send(JSON.stringify(message));
  }
}

export const todoWS = new TodoWS();
