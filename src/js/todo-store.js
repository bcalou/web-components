/**
 * Storing the todo items in indexedDB
 */
class TodoStore {
  constructor() {
    this.dbName = "todo-list";
    this.storeName = "todos";
    this.listeners = [];

    this.ready = this.initializeDB();
  }

  // Register a function that will be called when the database is updated
  // This way, components can keep track of what's happening
  subscribe(callback) {
    this.listeners.push(callback);
  }

  // Notify the changes to each listeners
  notify() {
    const todos = this.getTodos();
    this.listeners.forEach((callback) => callback(todos));
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

  async execute(getRequest, onSuccess, onError, notify, readwrite) {
    await this.ready;

    return await new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = getRequest(store);

      request.onsuccess = (event) => {
        resolve(event.target.result);

        if (onSuccess) {
          onSuccess(request.result);
        }
      };

      request.onerror = (event) => {
        reject(`Error executing todo task: ${event.target.errorCode}`);

        if (onError) {
          onError();
        }
      };

      request.onerror = onError;
    });
  }

  async getTodos() {
    return await this.execute((store) => store.getAll());
  }

  async addTodo(label) {
    const todo = {
      label,
      done: false,
      createdAt: Date().now,
    };

    return await this.execute(
      (store) => store.add(todo),
      (result) => {
        console.info(`Added todo #${result}: ${label}`);
        this.notify();
      }
    );
  }

  async deleteTodo(id) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.info(`Deleted todo #${id}`);
        this.notify();
        resolve(id);
      };

      request.onerror = (event) => {
        reject(`Error deleting todo: ${event.target.errorCode}`);
      };
    });
  }
}

export const todoStore = new TodoStore();
