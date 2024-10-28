/**
 * IndexedDB store
 */
class TodoStore {
  constructor() {
    this.dbName = "todo-list";
    this.storeName = "todo";

    this.listeners = [];

    this.ready = this.initializeDB();
  }

  // Register a function that will be called when the database is updated
  // This way, components can keep track of what's happening
  subscribe(callback) {
    this.listeners.push(callback);

    // Return a method that can be called to unsubscribe
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback) {
    this.listeners = this.listeners.filter((listener) => listener !== callback);
  }

  // Notify the changes to each listeners
  async notify() {
    const items = new Map((await this.getAll()).map((item) => [item.id, item]));

    this.listeners.forEach((callback) => callback(items));
  }

  async initializeDB() {
    return await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore(this.storeName, {
          keyPath: "id",
        });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject("Database error: " + event.target.errorCode);
      };
    });
  }

  send(message) {
    console.info("Store received: ", message);

    switch (message.action) {
      case "getAll":
        this.replaceStoreContent(message.payload);
        break;
      case "add":
        this.add(message.payload);
        break;
      case "updateById":
        this.updateById(message.payload);
        break;
      case "deleteById":
        this.deleteById(message.payload);
        break;
      default:
        break;
    }
  }

  // Replace the store content with a new list of items (backend update)
  async replaceStoreContent(payload) {
    const { todos } = payload;

    this.write(
      (store) => store.clear(),
      (result, store) => {
        console.info("Store was cleared");

        if (!todos || todos.length === 0) {
          console.info("Server sent no todos");
          this.notify();
          return;
        }

        Promise.all(
          todos.map((item) => {
            return new Promise((resolve, reject) => {
              const addRequest = store.add(item);

              addRequest.onsuccess = (event) => {
                console.info(`Added ${this.storeName} #${event.target.result}`);
                resolve();
              };

              addRequest.onerror = (event) => {
                console.info(`Error adding ${this.storeName}: ${error}`);
                reject();
              };
            });
          })
        ).then(() => {
          console.info("All todos were added");
          this.notify();
        });
      },
      false // Don't notify the clearing of the store, wait for the rest
    );
  }

  // Base function to perform anything in the table, used by read & write
  async request(getRequest, mode, onSuccess) {
    await this.ready;

    return await new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, mode);
      const store = transaction.objectStore(this.storeName);
      const request = getRequest(store);

      request.onsuccess = () => {
        resolve(request.result);

        if (onSuccess) {
          onSuccess(request.result, store);
        }
      };

      request.onerror = () => {
        reject(`Error executing ${this.storeName} task: ${request.errorCode}`);
      };
    });
  }

  // Base function to read in the table
  async read(getRequest) {
    return this.request(getRequest, "readonly");
  }

  // Base function to write in the table
  async write(getRequest, onSuccess, notify = true) {
    return this.request(getRequest, "readwrite", (result, store) => {
      if (notify) {
        this.notify();
      }

      if (onSuccess) {
        onSuccess(result, store);
      }
    });
  }

  // Base function to perform an operation on each item
  async writeForEach(getRequest, onSuccess) {
    return await this.write(
      (store) => store.openCursor(),
      (result, store) => {
        const cursor = result;

        if (cursor) {
          const request = getRequest(cursor, store);

          if (request && onSuccess) {
            request.onsuccess = onSuccess(cursor);
          }

          cursor.continue();
        } else {
          this.notify(); // Notify at the end
        }
      },
      false // Don't notify for each element
    );
  }

  async getAll() {
    return await this.read((store) => store.getAll());
  }

  async getById(id) {
    return await this.read((store) => store.get(id));
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

  add(payload) {
    this.write(
      (store) => store.add(payload.todo),
      (result) => console.info(`Added ${this.storeName} #${result}`)
    );
  }

  async updateById(payload) {
    const { id, changes } = payload;
    const item = await this.getById(id);

    if (item) {
      for (const [key, value] of Object.entries(changes)) {
        item[key] = value;
      }

      this.write(
        (store) => store.put(item),
        () => console.info(`Updated ${this.storeName} #${id}`)
      );
    }
  }

  async markAllAsDone() {
    // TODO : id must be truly unique...
    const ids = [];

    await this.writeForEach(
      (cursor, store) => {
        if (!cursor.value.done) {
          store.put({
            ...cursor.value,
            done: true,
          });

          ids.push(cursor.value.id);
        }
      },
      (cursor) =>
        console.info(`Set todo #${cursor.value.id} done property to true`)
    );
  }

  deleteById(payload) {
    this.write(
      (store) => store.delete(payload.id),
      () => console.info(`Deleted ${this.storeName} #${payload.id}`)
    );
  }

  async deleteDone() {
    await this.writeForEach(
      (cursor) => {
        if (cursor.value.done) {
          cursor.delete();
        }
      },
      (cursor) => console.info(`Deleted todo #${cursor.value.id}`)
    );
  }
}

export const todoStore = new TodoStore();
