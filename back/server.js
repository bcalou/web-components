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

    setTimeout(() => {
      switch (message.action) {
        case "add":
          add(ws, message);
          break;
        case "updateById":
          updateById(ws, message);
          break;
        case "deleteById":
          deleteById(ws, message);
          break;
        default:
          ws.send(
            JSON.stringify({ error: "Unknown action: " + message.action })
          );
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

// Get all todos
function getAll(ws) {
  db.all("SELECT * FROM todos", (err, rows) => {
    if (err) {
      if (ws) {
        ws.send(JSON.stringify({ error: "Failed to fetch items", err }));
      } else {
        console.error("Failed to fetch items", err);
      }

      return;
    }

    console.log(`Sending todo list (${rows.length} item(s))`);
    ws.send(JSON.stringify({ action: "getAll", payload: { todos: rows } }));
  });
}

function add(ws, message) {
  const todo = message.payload.todo;

  db.run(
    "INSERT INTO todos (id, label, done) VALUES (?, ?, ?)",
    [todo.id, todo.label, todo.done],
    function (err) {
      if (err) {
        return sendError(
          ws,
          `Failed to add item "${JSON.stringify(todo)}": ${err}`
        );
      }

      // Notify other clients
      notify(message, ws);
    }
  );
}

function updateById(ws, message) {
  const { id, changes } = message.payload;

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

  const idsToUpdate = Array.isArray(id) ? id.map(() => "?").join(", ") : "?";

  query += ` WHERE id IN (${idsToUpdate})`;
  args.push(id);

  db.run(query, args, function (err) {
    if (err) {
      ws.send(
        JSON.stringify({ error: `Failed to update item ${idsToUpdate}` })
      );

      return;
    }

    // Notify other clients
    notify(message, ws);
  });
}

// Delete an id or an array of ids
function deleteById(ws, message) {
  const id = message.payload.id;

  const idsToDelete = Array.isArray(id) ? id.map(() => "?").join(", ") : "?";

  db.run(
    `DELETE FROM todos WHERE id IN (${idsToDelete})`,
    [id],
    function (err) {
      if (err) {
        ws.send(JSON.stringify({ error: `Failed to delete item ${id}` }));

        return;
      }

      // Notify other clients
      notify(message, ws);
    }
  );
}

console.log("WebSocket server is running on ws://localhost:8080");
