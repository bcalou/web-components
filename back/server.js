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
      done INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

  ws.on("message", (data) => onMessage(data, ws));

  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });
});

// Get all todos and send them to the client
function getAll(ws) {
  db.all("SELECT * FROM todos ORDER BY created_at", (error, rows) => {
    if (error) {
      ws.send(JSON.stringify({ error: `Failed to fetch items: ${error}` }));
    }

    console.log(`Sending todo list (${rows.length} item(s))`);
    ws.send(JSON.stringify({ action: "setAll", payload: { todos: rows } }));
  });
}

// Interpret a received message
function onMessage(data, ws) {
  const message = JSON.parse(data);
  console.log("Received message: ", message);

  const { action, payload } = message;

  setTimeout(() => {
    let request;

    switch (action) {
      case "add":
        request = add(payload);
        break;
      case "updateByIds":
        request = updateByIds(payload);
        break;
      case "deleteByIds":
        request = deleteByIds(payload);
        break;
      default:
        ws.send(JSON.stringify({ error: `Unknown action: ${action}` }));
        return;
    }

    request.then(
      // If the request was successful, pass the message to other clients
      () => notify(message, ws),
      // If not, send the error to the requesting client
      (error) => {
        console.error(error);
        ws.send(JSON.stringify({ error }));
      }
    );
  }, SIMULATED_LATENCY_MS);
}

function notify(message, excludeClient) {
  console.log("Sending message:", message);

  clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
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
function updateByIds(payload) {
  const { ids, changes } = payload;

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

  return new Promise((resolve, reject) => {
    db.run(query, args, function (error) {
      if (error) {
        reject(`Failed to update item(s) ${ids}: ${error})`);
      }
      resolve();
    });
  });
}

// Delete the given ids
function deleteByIds(payload) {
  const { ids } = payload;

  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM todos WHERE id IN (${ids.map(() => "?").join(", ")})`,
      [...ids],
      function (error) {
        if (error) {
          reject(`Failed to delete item(s) ${id}:, ${error}`);
        }
        resolve();
      }
    );
  });
}

console.log("WebSocket server is running on ws://localhost:8080");
