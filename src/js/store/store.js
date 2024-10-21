/**
 * Base class for an IndexedDB store
 */https://github.com/bcalou/web-components/edit/main/src/js/store/store.js
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

  async add(item) {
    await this.write(
      (store) => store.add(item),
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

  async delete(id) {
    return this.write(
      (store) => store.delete(id),
      () => console.info(`Deleted ${this.storeName} #${id}`)
    );
  }
}

export { Store };
