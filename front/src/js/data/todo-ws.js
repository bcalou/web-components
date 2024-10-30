/**
 * WebSocket requests for the todos
 */
export class TodoWS {
  #onUpdate;
  #ready;
  #ws;

  constructor(onUpdate) {
    this.#onUpdate = onUpdate;

    this.#ready = this.#initializeWS();
  }

  // Send a message to the web socket server
  async send(message) {
    await this.#ready;

    console.info("Sending to WS:", message);
    this.#ws.send(JSON.stringify(message));
  }

  async #initializeWS() {
    return await new Promise((resolve, reject) => {
      this.#ws = new WebSocket("ws://localhost:8080");

      this.#ws.onopen = () => {
        console.info("WS connection open");
        resolve(this.#ws);
      };

      this.#ws.onmessage = (event) => this.#onUpdate(JSON.parse(event.data));

      this.#ws.onclose = () =>
        console.info("Disconnected from WebSocket server");

      this.#ws.onerror = (error) => reject(`WebSocket Error: ${error}`);
    });
  }
}
