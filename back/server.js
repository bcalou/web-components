const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();
const SIMULATED_LATENCY_MS = 2000;

const db = new sqlite3.Database("todos.db", (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      done INTEGER DEFAULT 0
    )`);
    console.log("Table created");
  }
});

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("Client connected");
  clients.add(ws);

  setTimeout(() => {
    // Send current todos to the new client
    getAll(ws);
  }, SIMULATED_LATENCY_MS);

  ws.on("message", (data) => {
    const message = JSON.parse(data);
    console.log("Received message: ", message);

    const { action, payload } = message;

    let result;

    setTimeout(() => {
      switch (action) {
        case "getAll":
          getAll(ws);
          break;
        case "add":
          add(payload).then(
            () => notify(message, ws),
            (error) => ws.send(JSON.stringify({ error }))
          );
          break;
        case "updateByIds":
          updateByIds(ws, message);
          break;
        case "deleteByIds":
          deleteByIds(ws, message);
          break;
        default:
          sendError(ws, `Unknown action: ${message.action}`);
      }
    }, SIMULATED_LATENCY_MS);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });
});

function notify(message, excludeClient) {
  console.log("Sending message:", message);

  clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function sendError(ws, error) {
  console.error(error);

  ws.send(JSON.stringify({ error }));
}

// Get all todos and directly send them to the client
function getAll(ws) {
  db.all("SELECT * FROM todos", (error, rows) => {
    if (error) {
      return sendError(ws, `Failed to fetch items: ${error}`);
    }

    console.log(`Sending todo list (${rows.length} item(s))`);
    ws.send(JSON.stringify({ action: "setAll", payload: { todos: rows } }));
  });
}

// Add a todo
function add(payload) {
  const { todo } = payload;

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO todos (id, label, done) VALUES (?, ?, ?)",
      [todo.id, todo.label, todo.done],
      function (error) {
        if (error) {
          reject(`Failed to add item #"${todo.id}": ${error}`);
        }
        resolve();
      }
    );
  });
}

// Update the given ids with the given changes
function updateByIds(ws, message) {
  const { ids, changes } = message.payload;

  let query = "UPDATE todos SET ";
  const args = [];

  // Compute the changes query
  Object.keys(changes).forEach((field, index) => {
    query += `${field} = ?`;

    if (index < Object.keys(changes).length - 1) {
      query += ", ";
    }

    args.push(changes[field]);
  });

  query += ` WHERE id IN (${ids.map(() => "?").join(", ")})`;
  args.push(...ids);

  db.run(query, args, function (error) {
    if (error) {
      return sendError(ws, `Failed to update item(s) ${ids}: `, error);
    }

    // Notify other clients
    notify(message, ws);
  });
}

// Delete the given ids
function deleteByIds(ws, message) {
  const { ids } = message.payload;

  db.run(
    `DELETE FROM todos WHERE id IN (${ids.map(() => "?").join(", ")})`,
    [...idsToDelete],
    function (error) {
      if (error) {
        return sendError(ws, `Failed to delete item(s) ${id}:`, error);
      }

      // Notify other clients
      notify(message, ws);
    }
  );
}

console.log("WebSocket server is running on ws://localhost:8080");
