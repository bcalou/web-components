/**
 * IndexedDB store
 */
export class TodoStore {
  #dbName = "todo-list";
  #storeName = "todo";
  #onUpdate;
  #ready;
  #db;

  constructor(onUpdate) {
    this.#onUpdate = onUpdate;

    this.#ready = this.#initializeDB();
  }

  // Get all the todos
  async getAll() {
    await this.#ready;

    return await new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(this.#storeName, "readonly");
      const store = transaction.objectStore(this.#storeName);

      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);

      request.onerror = (error) => reject(`Failed to get all todos:`, error);
    });
  }

  // Get the todo matching the given ID
  async getById(id) {
    await this.#ready;

    return await new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(this.#storeName, "readonly");
      const store = transaction.objectStore(this.#storeName);

      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);

      request.onerror = (error) => reject(`Failed to get todo #${id}:`, error);
    });
  }

  send(message) {
    console.info("Store received: ", message);
    const { action, payload } = message;

    switch (action) {
      case "setAll":
        this.#setAll(payload);
        break;
      case "add":
        this.#add(payload);
        break;
      case "updateByIds":
        this.#updateByIds(payload);
        break;
      case "deleteByIds":
        this.#deleteByIds(payload);
        break;
      default:
        break;
    }
  }

  // Notify the changes to each listeners
  async notify() {
    const items = new Map((await this.getAll()).map((item) => [item.id, item]));

    this.#onUpdate(items);
  }

  async #initializeDB() {
    return await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore(this.#storeName, {
          keyPath: "id",
        });
      };

      request.onsuccess = (event) => {
        this.#db = event.target.result;
        resolve(this.#db);
      };

      request.onerror = (event) => {
        reject("Database error: " + event.target.errorCode);
      };
    });
  }

  // Replace the store content with a whole new list of items (backend update)
  async #setAll(payload) {
    const transaction = this.#db.transaction(this.#storeName, "readwrite");
    const store = transaction.objectStore(this.#storeName);

    const request = store.clear();

    request.onerror = (error) => console.error("Failed to clear store:", error);

    request.onsuccess = () => {
      console.info("Store was cleared");

      const { todos } = payload;

      if (!todos || todos.length === 0) {
        console.info("Server sent no todos");
        this.notify();
        return;
      }

      todos.forEach(async (todo) => {
        await new Promise((resolve, reject) => {
          const addRequest = store.add(todo);

          addRequest.onsuccess = () => {
            console.info(`Added todo #${todo.id}`);
            resolve();
          };

          addRequest.onerror = (error) => {
            console.info(`Error adding todo #${todo.id}:`, error);
            reject();
          };
        });
      });

      transaction.oncomplete = () => {
        console.info("All todos were added");
        this.notify();
      };

      transaction.onerror = (error) =>
        console.error("Adding all todos failed:", error);
    };
  }

  // Add the given todo to the store
  async #add(payload) {
    await this.#ready;

    const { todo } = payload;

    const transaction = this.#db.transaction(this.#storeName, "readwrite");
    const store = transaction.objectStore(this.#storeName);
    const request = store.add(payload.todo);

    request.onerror = (error) =>
      console.error(`Failed adding todo #${todo.id}:`, error);
    request.onsuccess = () => {
      console.info(`Added todo #${todo.id}`);
      this.notify();
    };
  }

  // Update the given ids with the given changes
  async #updateByIds(payload) {
    await this.#ready;

    const { ids, changes } = payload;

    const transaction = this.#db.transaction(this.#storeName, "readwrite");
    const store = transaction.objectStore(this.#storeName);

    ids.forEach(async (id) => {
      // Find the item in the store
      const item = await new Promise((resolve, reject) => {
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);

        request.onerror = (error) =>
          reject(`Failed to get the todo #${id}:`, error);
      });

      // Apply the changes to the item
      for (const [key, value] of Object.entries(changes)) {
        item[key] = value;
      }

      const request = store.put(item);

      request.onerror = (error) =>
        console.error(`Failed updating todo ${item.id}:`, error);
      request.onsuccess = () =>
        console.info(`Updated todo #${item.id} with changes:`, changes);
    });

    transaction.oncomplete = () => {
      console.info("Update transaction completed");
      this.notify();
    };

    transaction.onerror = (error) =>
      console.error("Update transaction failed:", error);
  }

  // Delete the given ids
  async #deleteByIds(payload) {
    await this.#ready;

    const { ids } = payload;

    const transaction = this.#db.transaction(this.#storeName, "readwrite");
    const store = transaction.objectStore(this.#storeName);

    ids.forEach((id) => {
      const request = store.delete(id);

      request.onerror = (error) =>
        console.error(`Failed deleting todo ${id}:`, error);
      request.onsuccess = () => console.info(`Deleted todo #${id}`);
    });

    transaction.oncomplete = () => {
      console.info("Deletion transaction completed");
      this.notify();
    };

    transaction.onerror = (error) =>
      console.error("Deletion transaction failed:", error);
  }
}
