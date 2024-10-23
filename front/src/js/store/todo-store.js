import { todoWS } from "./todo-ws.js";

/**
 * IndexedDB + WS todo store
 */
class TodoStore {
  constructor() {
    this.dbName = "todo-list";
    this.storeName = "todo";

    this.listeners = [];

    this.ready = this.initializeDB();

    todoWS.subscribe(this.replaceStoreContent.bind(this));
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
          autoIncrement: true,
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

  // Replace the store content with a new list of items (backend update)
  async replaceStoreContent(items) {
    this.write(
      (store) => store.clear(),
      (result, store) => {
        console.info("Store was cleared");

        if (!items || items.length === 0) {
          console.info("Server sent no items");
          this.notify();
          return;
        }

        Promise.all(
          items.map((item) => {
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
          console.info("All items were added");
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

  async add(label) {
    const todo = {
      label,
      done: 0,
    };

    await this.write(
      (store) => store.add(todo),
      (result) => console.info(`Added ${this.storeName} #${result}`)
    );

    todoWS.add(todo);
  }

  async update(id, changes) {
    const item = await this.getById(id);

    if (item) {
      for (const [key, value] of Object.entries(changes)) {
        item[key] = value;
      }

      this.write(
        (store) => store.put(item),
        () => console.info(`Updated ${this.storeName} #${id}`)
      );

      todoWS.update(id, changes);
    }
  }

  async markAllAsDone() {
    await this.writeForEach(
      (cursor, store) => {
        if (!cursor.value.done) {
          store.put({
            ...cursor.value,
            done: true,
          });
        }
      },
      (cursor) =>
        console.info(`Set todo #${cursor.value.id} done property to true`)
    );

    todoWS.markAllAsDone();
  }

  async delete(id) {
    this.write(
      (store) => store.delete(id),
      () => console.info(`Deleted ${this.storeName} #${id}`)
    );

    todoWS.delete(id);
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

    todoWS.deleteDone();
  }
}

export const todoStore = new TodoStore();
