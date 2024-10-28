/**
 * IndexedDB store
 */
export class TodoStore {
  constructor(onUpdate) {
    this.dbName = "todo-list";
    this.storeName = "todo";
    this.onUpdate = onUpdate;

    this.ready = this.initializeDB();
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
      case "setAll":
        this.setAll(message.payload);
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
  async setAll(payload) {
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

  getStore(mode = "readonly") {
    const transaction = this.db.transaction(this.storeName, mode);
    const store = transaction.objectStore(this.storeName);

    return { store, transaction };
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

  // Notify the changes to each listeners
  async notify() {
    const items = new Map((await this.getAll()).map((item) => [item.id, item]));

    this.onUpdate(items);
  }

  async getAll() {
    return await this.read((store) => store.getAll());
  }

  async getById(id) {
    return await this.read((store) => store.get(id));
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

  async deleteById(payload) {
    const idsToDelete = Array.isArray(payload.id) ? payload.id : [payload.id];

    const { store, transaction } = this.getStore("readwrite");

    idsToDelete.forEach((id) => {
      const deleteRequest = store.delete(id);

      deleteRequest.onerror = () => console.error(`Failed deleting todo ${id}`);
      deleteRequest.onsuccess = () => console.info(`Deleted todo #${id}`);
    });

    transaction.oncomplete = () => {
      console.info("Deletion transaction completed");
      this.notify();
    };

    transaction.onerror = () => console.error("Deletion transaction failed");
  }
}
