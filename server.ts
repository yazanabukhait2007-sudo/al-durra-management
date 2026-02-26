import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.sqlite");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    target_quantity INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    total_score REAL NOT NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
  );

  CREATE TABLE IF NOT EXISTS task_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    score REAL NOT NULL,
    FOREIGN KEY (evaluation_id) REFERENCES daily_evaluations(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Workers
  app.get("/api/workers", (req, res) => {
    const workers = db.prepare("SELECT * FROM workers").all();
    res.json(workers);
  });

  app.post("/api/workers", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    try {
      const info = db.prepare("INSERT INTO workers (name) VALUES (?)").run(name);
      res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
      res.status(400).json({ error: "Worker already exists or invalid data" });
    }
  });

  app.delete("/api/workers/:id", (req, res) => {
    const { id } = req.params;
    
    const transaction = db.transaction(() => {
      // Find all evaluations for this worker
      const evals = db.prepare("SELECT id FROM daily_evaluations WHERE worker_id = ?").all(id) as any[];
      
      // Delete task entries for those evaluations
      for (const ev of evals) {
        db.prepare("DELETE FROM task_entries WHERE evaluation_id = ?").run(ev.id);
      }
      
      // Delete evaluations
      db.prepare("DELETE FROM daily_evaluations WHERE worker_id = ?").run(id);
      
      // Delete worker
      db.prepare("DELETE FROM workers WHERE id = ?").run(id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete worker:", err);
      res.status(500).json({ error: "Failed to delete worker" });
    }
  });

  // Tasks
  app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    res.json(tasks);
  });

  app.post("/api/tasks", (req, res) => {
    const { name, target_quantity } = req.body;
    if (!name || !target_quantity) return res.status(400).json({ error: "Name and target_quantity are required" });
    try {
      const info = db.prepare("INSERT INTO tasks (name, target_quantity) VALUES (?, ?)").run(name, target_quantity);
      res.json({ id: info.lastInsertRowid, name, target_quantity });
    } catch (err) {
      res.status(400).json({ error: "Task already exists or invalid data" });
    }
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    
    const transaction = db.transaction(() => {
      // Delete task entries
      db.prepare("DELETE FROM task_entries WHERE task_id = ?").run(id);
      // Delete task
      db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete task:", err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Evaluations
  app.post("/api/evaluations", (req, res) => {
    const { worker_id, date, entries } = req.body;
    if (!worker_id || !date || !entries || !entries.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if evaluation already exists for this worker on this date
    const existing = db.prepare("SELECT id FROM daily_evaluations WHERE worker_id = ? AND date = ?").get(worker_id, date);
    if (existing) {
      return res.status(400).json({ error: "Evaluation already exists for this worker on this date" });
    }

    const tasks = db.prepare("SELECT * FROM tasks").all() as any[];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    let totalScoreSum = 0;
    const processedEntries = [];

    for (const entry of entries) {
      const task = taskMap.get(entry.task_id);
      if (!task) return res.status(400).json({ error: `Task ID ${entry.task_id} not found` });
      
      const score = (entry.quantity / task.target_quantity) * 100;
      totalScoreSum += score;
      processedEntries.push({ ...entry, score });
    }

    // Average score for the day based on tasks performed
    const dailyTotalScore = totalScoreSum / processedEntries.length;

    const insertEval = db.prepare("INSERT INTO daily_evaluations (worker_id, date, total_score) VALUES (?, ?, ?)");
    const insertEntry = db.prepare("INSERT INTO task_entries (evaluation_id, task_id, quantity, score) VALUES (?, ?, ?, ?)");

    const transaction = db.transaction(() => {
      const evalInfo = insertEval.run(worker_id, date, dailyTotalScore);
      const evalId = evalInfo.lastInsertRowid;
      for (const entry of processedEntries) {
        insertEntry.run(evalId, entry.task_id, entry.quantity, entry.score);
      }
      return evalId;
    });

    try {
      const newEvalId = transaction();
      res.json({ success: true, evaluation_id: newEvalId, daily_score: dailyTotalScore });
    } catch (err) {
      res.status(500).json({ error: "Failed to save evaluation" });
    }
  });

  app.get("/api/evaluations", (req, res) => {
    const { month } = req.query; // format: YYYY-MM
    let query = `
      SELECT e.*, w.name as worker_name 
      FROM daily_evaluations e
      JOIN workers w ON e.worker_id = w.id
    `;
    let params: any[] = [];

    if (month) {
      query += " WHERE e.date LIKE ?";
      params.push(`${month}-%`);
    }

    query += " ORDER BY e.date DESC";

    const evaluations = db.prepare(query).all(...params);
    res.json(evaluations);
  });

  app.get("/api/evaluations/:id", (req, res) => {
    const { id } = req.params;
    const evaluation = db.prepare(`
      SELECT e.*, w.name as worker_name 
      FROM daily_evaluations e
      JOIN workers w ON e.worker_id = w.id
      WHERE e.id = ?
    `).get(id);

    if (!evaluation) return res.status(404).json({ error: "Not found" });

    const entries = db.prepare(`
      SELECT te.*, t.name as task_name, t.target_quantity
      FROM task_entries te
      JOIN tasks t ON te.task_id = t.id
      WHERE te.evaluation_id = ?
    `).all(id);

    res.json({ ...evaluation, entries });
  });

  app.delete("/api/evaluations/:id", (req, res) => {
    const { id } = req.params;
    
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM task_entries WHERE evaluation_id = ?").run(id);
      db.prepare("DELETE FROM daily_evaluations WHERE id = ?").run(id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete evaluation" });
    }
  });

  app.put("/api/evaluations/:id", (req, res) => {
    const { id } = req.params;
    const { entries } = req.body;
    
    if (!entries || !entries.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const tasks = db.prepare("SELECT * FROM tasks").all() as any[];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    let totalScoreSum = 0;
    const processedEntries = [];

    for (const entry of entries) {
      const task = taskMap.get(entry.task_id);
      if (!task) return res.status(400).json({ error: `Task ID ${entry.task_id} not found` });
      
      const score = (entry.quantity / task.target_quantity) * 100;
      totalScoreSum += score;
      processedEntries.push({ ...entry, score });
    }

    // Average score for the day based on tasks performed
    const dailyTotalScore = totalScoreSum / processedEntries.length;

    const transaction = db.transaction(() => {
      db.prepare("UPDATE daily_evaluations SET total_score = ? WHERE id = ?").run(dailyTotalScore, id);
      db.prepare("DELETE FROM task_entries WHERE evaluation_id = ?").run(id);
      
      const insertEntry = db.prepare("INSERT INTO task_entries (evaluation_id, task_id, quantity, score) VALUES (?, ?, ?, ?)");
      for (const entry of processedEntries) {
        insertEntry.run(id, entry.task_id, entry.quantity, entry.score);
      }
    });

    try {
      transaction();
      res.json({ success: true, daily_score: dailyTotalScore });
    } catch (err) {
      res.status(500).json({ error: "Failed to update evaluation" });
    }
  });

  app.get("/api/reports/monthly", (req, res) => {
    const { month } = req.query; // format: YYYY-MM
    if (!month) return res.status(400).json({ error: "Month is required (YYYY-MM)" });

    const report = db.prepare(`
      SELECT 
        w.id as worker_id,
        w.name as worker_name,
        COUNT(e.id) as days_worked,
        AVG(e.total_score) as average_score
      FROM workers w
      LEFT JOIN daily_evaluations e ON w.id = e.worker_id AND e.date LIKE ?
      GROUP BY w.id
    `).all(`${month}-%`);

    res.json(report);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
