/**
 * Base class for an IndexedDB store
 */
class Store {
  constructor(dbName, storeName) {
    this.dbName = dbName;
    this.storeName = storeName;

    this.listeners = [];

    this.ready = this.initializeDB();
  }

  // Register a function that will be called when the database is updated
  // This way, components can keep track of what's happening
  subscribe(callback) {
    // First call to get an immediate result
    const items = this.getAll();
    callback(items);

    this.listeners.push(callback);
  }

  // Notify the changes to each listeners
  notify() {
    const items = this.getAll();
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

  // Base function to read or write in the table
  async execute(getRequest, options = {}) {
    await this.ready;

    return await new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        this.storeName,
        options.mode ?? "readonly"
      );
      const store = transaction.objectStore(this.storeName);
      const request = getRequest(store);

      request.onsuccess = () => {
        resolve(request.result);

        if (options.onSuccess) {
          options.onSuccess(request.result, store);
        }
      };

      request.onerror = () => {
        reject(`Error executing ${this.storeName} task: ${request.errorCode}`);
      };
    });
  }

  // Base function to perform an operation on each item
  async executeForEach(getRequest, options = {}) {
    return await this.execute((store) => store.openCursor(), {
      mode: "readwrite",
      onSuccess: (result, store) => {
        const cursor = result;

        if (cursor) {
          const request = getRequest(cursor, store);

          if (request && options.onSuccess) {
            request.onsuccess = options.onSuccess(cursor);
          }

          cursor.continue();
        } else if (options.onGlobalSuccess) {
          options.onGlobalSuccess();
        }
      },
    });
  }

  async getAll() {
    return await this.execute((store) => store.getAll());
  }

  async getById(id) {
    return await this.execute((store) => store.get(id));
  }

  async add(item) {
    await this.execute((store) => store.add(item), {
      mode: "readwrite",
      onSuccess: (result) => {
        console.info(`Added ${this.storeName} #${result}`);
        this.notify();
      },
    });
  }

  async update(id, changes) {
    const item = await this.getById(id);

    if (item) {
      for (const [key, value] of Object.entries(changes)) {
        item[key] = value;
      }

      return this.execute((store) => store.put(item), {
        mode: "readwrite",
        onSuccess: () => {
          console.info(`Updated ${this.storeName} #${id}`);
          this.notify();
        },
      });
    }
  }

  async delete(id) {
    return this.execute((store) => store.delete(id), {
      mode: "readwrite",
      onSuccess: () => {
        console.info(`Deleted ${this.storeName} #${id}`);
        this.notify();
      },
    });
  }
}

export { Store };
