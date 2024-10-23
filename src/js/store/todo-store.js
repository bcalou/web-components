/**
 * IndexedDB + WS todo store
 */
class TodoStore {
  constructor() {
    this.dbName = "todo-list";
    this.storeName = "todo";

    this.listeners = [];
    this.itemsListeners = new Map();

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
          this.notify();
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
  }

  async update(id, changes) {
    const item = await this.getById(id);

    if (item) {
      for (const [key, value] of Object.entries(changes)) {
        item[key] = value;
      }

      return this.write(
        (store) => store.put(item),
        () => console.info(`Updated ${this.storeName} #${id}`)
      );
    }
  }

  async markAllAsDone() {
    return await this.writeForEach(
      (cursor, store) =>
        cursor.value.done
          ? undefined
          : store.put({
              ...cursor.value,
              done: true,
            }),
      (cursor) =>
        console.info(`Set todo #${cursor.value.id} done property to true`)
    );
  }

  async delete(id) {
    return this.write(
      (store) => store.delete(id),
      () => console.info(`Deleted ${this.storeName} #${id}`)
    );
  }

  async deleteDone() {
    return await this.writeForEach(
      (cursor) => (cursor.value.done ? cursor.delete() : undefined),
      (cursor) => console.info(`Deleted todo #${cursor.value.id}`)
    );
  }
}

export const todoStore = new TodoStore();
