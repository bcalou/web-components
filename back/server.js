const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();
const SIMULATED_LATENCY_MS = 2000;

const db = new sqlite3.Database("todos.db", (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            done INTEGER DEFAULT 0
        )`);
  }
});

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("Client connected");
  clients.add(ws);

  // Send current todos to the new client
  getAll(ws);

  // On receiving a message from the client
  ws.on("message", (message) => {
    const data = JSON.parse(message);
    const { action, payload } = data;

    // Use this timeout to simulate network latency
    setTimeout(() => {
      switch (action) {
        case "add":
          add(ws, payload.label);
          break;
        case "update":
          update(ws, payload.id, payload.changes);
          break;
        case "markAllAsDone":
          markAllAsDone(ws);
          break;
        case "delete":
          deleteById(ws, payload.id);
          break;
        case "deleteDone":
          deleteDone(ws);
          break;
        default:
          ws.send(JSON.stringify({ error: "Unknown action" }));
      }
    }, SIMULATED_LATENCY_MS);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });
});

// Get all todos
// When called without a specific ws client, it notifies all listeners
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

    const message = JSON.stringify({ action: "items", items: rows });

    if (ws) {
      // Just notify the ws client
      ws.send(message);
    } else {
      // Notify every listener
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });
}

// Base function to write in the table
function write({ ws, query, args, error, success }) {
  if (!ws || !query) {
    console.error("Error calling write: ws and query parameters are required");
    return;
  }

  db.run(query, args, function (err) {
    if (err) {
      ws.send(JSON.stringify({ error: error ?? "Error", err }));
      return;
    }

    console.log(success ?? "Success");

    getAll();
  });
}

function add(ws, label) {
  write({
    ws,
    query: "INSERT INTO todos (label) VALUES (?)",
    args: [label],
    success: `Added item: "${label}"`,
    error: `Failed to add item "${label}"`,
  });
}

function update(ws, id, changes) {
  let query = "UPDATE todos SET ";
  const args = [];

  // Loop over the fields to update and construct the query dynamically
  Object.keys(changes).forEach((field, index) => {
    query += `${field} = ?`;

    if (index < Object.keys(changes).length - 1) {
      query += ", "; // Add a comma if it's not the last field
    }

    args.push(changes[field]);
  });

  query += " WHERE id = ?";
  args.push(id); // Add the id to the values array

  write({
    ws,
    query,
    args,
    success: `Updated item #${id} with changes : ${JSON.stringify(changes)}`,
    error: `Failed to update item ${id}`,
  });
}

function markAllAsDone(ws) {
  write({
    ws,
    query: "UPDATE todos SET done = 1",
    success: "Marked all as done",
    error: "Failed to mark all as done",
  });
}

function deleteById(ws, id) {
  write({
    ws,
    query: "DELETE FROM todos WHERE id = ?",
    args: [id],
    success: `Deleted item #${id}`,
    error: `Failed to delete item ${id}`,
  });
}

function deleteDone(ws) {
  write({
    ws,
    query: "DELETE FROM todos WHERE done = 1",
    success: "Deleted done todos",
    error: "Failed to delete done todos",
  });
}

console.log("WebSocket server is running on ws://localhost:8080");
