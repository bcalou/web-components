/**
 * WebSocket requests for the todos
 */
export class TodoWS {
  #onUpdate;
  #onError;
  #ready;
  #ws;

  constructor(onUpdate, onError) {
    this.#onUpdate = onUpdate;
    this.#onError = onError;

    this.#ready = this.#initializeWS().then(
      () => console.info("WS connection open"),
      () => this.#onError("WebSocket Error")
    );
  }

  // Send a message to the web socket server
  async send(message) {
    await this.#ready;

    if (this.#ws.readyState === WebSocket.OPEN) {
      console.info("Sending to WS:", message);
      this.#ws.send(JSON.stringify(message));
    }
  }

  async #initializeWS() {
    return await new Promise((resolve, reject) => {
      this.#ws = new WebSocket("ws://localhost:8080");

      this.#ws.onopen = () => resolve(this.#ws);

      this.#ws.onmessage = (event) => this.#onUpdate(JSON.parse(event.data));

      this.#ws.onclose = () =>
        console.info("Disconnected from WebSocket server");

      this.#ws.onerror = (error) => reject("WebSocket Error");
    });
  }
}
