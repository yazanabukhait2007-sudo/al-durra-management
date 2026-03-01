import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.sqlite");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-durra-app";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    alt_phone TEXT,
    address TEXT,
    skills TEXT,
    last_workplace TEXT,
    current_job TEXT,
    salary REAL,
    has_social_security INTEGER DEFAULT 0,
    national_id TEXT,
    age INTEGER,
    notes TEXT
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

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    role TEXT NOT NULL DEFAULT 'user',
    permissions TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS worker_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'salary', 'bonus', 'deduction', 'payment'
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    notes TEXT,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance(worker_id, date);

  CREATE TABLE IF NOT EXISTS departures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    notes TEXT,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
  );
`);

// Add columns if they don't exist (for existing databases)
try { db.exec("ALTER TABLE workers ADD COLUMN national_id TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE workers ADD COLUMN age INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE workers ADD COLUMN notes TEXT"); } catch (e) {}

// Create default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
const hashedAdmin = bcrypt.hashSync("Durra@2026", 10);

if (!adminExists) {
  db.prepare("INSERT INTO users (username, email, password, status, role, permissions) VALUES (?, ?, ?, ?, ?, ?)").run(
    "admin", 
    "admin@example.com",
    hashedAdmin, 
    "approved", 
    "admin", 
    JSON.stringify(["manage_workers", "manage_tasks", "manage_evaluations", "view_reports", "manage_users", "view_audit_logs"])
  );
} else {
  // Force update password and email to a stronger one to avoid browser warnings
  db.prepare("UPDATE users SET password = ?, email = ? WHERE username = 'admin'").run(hashedAdmin, "admin@example.com");
  
  // Update admin permissions to include view_audit_logs if missing
  try {
    const adminUser = adminExists as any;
    const perms = JSON.parse(adminUser.permissions || '[]');
    if (!perms.includes('view_audit_logs')) {
      perms.push('view_audit_logs');
      db.prepare("UPDATE users SET permissions = ? WHERE id = ?").run(JSON.stringify(perms), adminUser.id);
    }
  } catch (e) {}
}

// Helper for logging
const logAction = (req: any, action: string, entityType?: string, entityId?: number, details?: string) => {
  try {
    const userId = req.user ? req.user.id : null;
    const username = req.user ? req.user.username : 'system';
    db.prepare("INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)").run(
      userId, username, action, entityType, entityId, details
    );
  } catch (e) {
    console.error("Failed to log action:", e);
  }
};

// MIGRATION: Recalculate all daily evaluation scores to be SUM instead of AVG
try {
  const evals = db.prepare("SELECT id FROM daily_evaluations").all() as any[];
  const updateEval = db.prepare("UPDATE daily_evaluations SET total_score = ? WHERE id = ?");
  const getEntries = db.prepare("SELECT quantity, task_id FROM task_entries WHERE evaluation_id = ?");
  const getTask = db.prepare("SELECT target_quantity FROM tasks WHERE id = ?");

  const migrateTransaction = db.transaction(() => {
    for (const ev of evals) {
      const entries = getEntries.all(ev.id) as any[];
      let totalScore = 0;
      for (const entry of entries) {
        const task = getTask.get(entry.task_id) as any;
        if (task && task.target_quantity > 0) {
          totalScore += (entry.quantity / task.target_quantity) * 100;
        }
      }
      updateEval.run(totalScore, ev.id);
    }
  });
  
  migrateTransaction();
  console.log("Migration: Recalculated daily evaluation scores (SUM logic).");
} catch (err) {
  console.error("Migration failed:", err);
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

const requirePermission = (permission: string) => {
  return (req: any, res: any, next: any) => {
    if (req.user.role === 'admin') return next();
    let perms = [];
    try {
      perms = JSON.parse(req.user.permissions || '[]');
    } catch (e) {}
    if (perms.includes(permission)) return next();
    res.status(403).json({ error: "Access denied" });
  };
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Auth
  app.post("/api/auth/signup", (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Username, email, and password are required" });
    
    try {
      const hashed = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)").run(username, email, hashed);
      
      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        message: "Account created successfully.",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          permissions: JSON.parse(user.permissions)
        }
      });
    } catch (err) {
      res.status(400).json({ error: "Username or email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (user.status === 'rejected') {
        return res.status(403).json({ error: "Your account has been rejected." });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Log login
      logAction({ user }, "LOGIN", "user", user.id, "User logged in");

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          permissions: JSON.parse(user.permissions || '[]')
        }
      });
    } catch (err) {
      console.error("Login route error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, username, email, role, permissions, status FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: JSON.parse(user.permissions || '[]'),
      status: user.status
    });
  });

  // Update Profile (Email)
  app.put("/api/auth/profile", authenticateToken, (req: any, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    try {
      const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id) as any;
      if (user.email === email) {
        return res.json({ success: true, message: "No changes made" });
      }

      // Check if email is taken by another user
      const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, req.user.id);
      if (existing) return res.status(400).json({ error: "Email already in use" });

      db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email, req.user.id);
      logAction(req, "UPDATE_PROFILE", "user", req.user.id, `Updated email to ${email}`);
      res.json({ success: true, message: "Profile updated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Update Password
  app.put("/api/auth/password", authenticateToken, (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new password are required" });

    try {
      const user = db.prepare("SELECT password FROM users WHERE id = ?").get(req.user.id) as any;
      if (!bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ error: "Incorrect current password" });
      }

      const hashed = bcrypt.hashSync(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, req.user.id);
      logAction(req, "UPDATE_PASSWORD", "user", req.user.id, "Updated password");
      res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  // Admin Users Management
  app.get("/api/admin/audit-logs", authenticateToken, requirePermission("view_audit_logs"), (req, res) => {
    try {
      const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500").all();
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/admin/users", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const users = db.prepare("SELECT id, username, email, status, role, permissions FROM users WHERE role != 'admin'").all();
    res.json(users.map((u: any) => ({ ...u, permissions: JSON.parse(u.permissions || '[]') })));
  });

  app.put("/api/admin/users/:id/permissions", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const { id } = req.params;
    const { permissions } = req.body; // Array of strings
    try {
      db.prepare("UPDATE users SET permissions = ? WHERE id = ?").run(JSON.stringify(permissions || []), id);
      logAction(req, "UPDATE_PERMISSIONS", "user", parseInt(id), `Updated permissions: ${permissions.join(", ")}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      logAction(req, "DELETE_USER", "user", parseInt(id), "Deleted user");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Workers
  app.get("/api/workers", authenticateToken, requirePermission("manage_workers"), (req, res) => {
    const workers = db.prepare("SELECT * FROM workers").all();
    res.json(workers);
  });

  app.post("/api/workers", authenticateToken, requirePermission("manage_workers"), (req, res) => {
    const { name, phone, alt_phone, address, national_id, age, last_workplace, current_job, salary, has_social_security, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    try {
      const info = db.prepare(`
        INSERT INTO workers (name, phone, alt_phone, address, national_id, age, last_workplace, current_job, salary, has_social_security, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, 
        phone || null, 
        alt_phone || null, 
        address || null, 
        national_id || null,
        age || null,
        last_workplace || null, 
        current_job || null, 
        salary || null, 
        has_social_security ? 1 : 0,
        notes || null
      );
      logAction(req, "CREATE_WORKER", "worker", Number(info.lastInsertRowid), `Created worker: ${name}`);
      res.json({ id: info.lastInsertRowid, name, phone, alt_phone, address, national_id, age, last_workplace, current_job, salary, has_social_security, notes });
    } catch (err) {
      res.status(400).json({ error: "Worker already exists or invalid data" });
    }
  });

  app.put("/api/workers/:id", authenticateToken, requirePermission("manage_workers"), (req, res) => {
    const { id } = req.params;
    const { name, phone, alt_phone, address, national_id, age, last_workplace, current_job, salary, has_social_security, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    try {
      const oldWorker = db.prepare("SELECT * FROM workers WHERE id = ?").get(id) as any;
      if (oldWorker) {
        const hasChanges = 
          oldWorker.name !== name ||
          oldWorker.phone !== (phone || null) ||
          oldWorker.alt_phone !== (alt_phone || null) ||
          oldWorker.address !== (address || null) ||
          oldWorker.national_id !== (national_id || null) ||
          oldWorker.age !== (age || null) ||
          oldWorker.last_workplace !== (last_workplace || null) ||
          oldWorker.current_job !== (current_job || null) ||
          oldWorker.salary !== (salary || null) ||
          oldWorker.has_social_security !== (has_social_security ? 1 : 0) ||
          oldWorker.notes !== (notes || null);
        
        if (!hasChanges) {
          return res.json({ success: true, message: "No changes made" });
        }
      }

      db.prepare(`
        UPDATE workers 
        SET name = ?, phone = ?, alt_phone = ?, address = ?, national_id = ?, age = ?, last_workplace = ?, current_job = ?, salary = ?, has_social_security = ?, notes = ?
        WHERE id = ?
      `).run(
        name, 
        phone || null, 
        alt_phone || null, 
        address || null, 
        national_id || null,
        age || null,
        last_workplace || null, 
        current_job || null, 
        salary || null, 
        has_social_security ? 1 : 0,
        notes || null,
        id
      );
      logAction(req, "UPDATE_WORKER", "worker", parseInt(id), `Updated worker: ${name}`);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Failed to update worker" });
    }
  });

  app.delete("/api/workers/:id", authenticateToken, requirePermission("manage_workers"), (req, res) => {
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
      
      // Delete transactions
      db.prepare("DELETE FROM worker_transactions WHERE worker_id = ?").run(id);

      // Delete worker
      db.prepare("DELETE FROM workers WHERE id = ?").run(id);
    });

    try {
      transaction();
      logAction(req, "DELETE_WORKER", "worker", parseInt(id), "Deleted worker and related data");
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete worker:", err);
      res.status(500).json({ error: "Failed to delete worker" });
    }
  });

  // Worker Transactions
  app.get("/api/workers/:id/transactions", authenticateToken, requirePermission("manage_workers"), (req, res) => {
    const { id } = req.params;
    const { month } = req.query; // format: YYYY-MM
    
    let query = "SELECT * FROM worker_transactions WHERE worker_id = ?";
    const params: any[] = [id];
    
    if (month) {
      query += " AND date LIKE ?";
      params.push(`${month}%`);
    }
    
    query += " ORDER BY date DESC, id DESC";
    
    try {
      const transactions = db.prepare(query).all(...params);
      res.json(transactions);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/workers/:id/transactions", authenticateToken, requirePermission("manage_workers"), (req, res) => {
    const { id } = req.params;
    const { type, amount, date, description } = req.body;
    
    if (!type || amount === undefined || !date) {
      return res.status(400).json({ error: "Type, amount, and date are required" });
    }
    
    try {
      const info = db.prepare(`
        INSERT INTO worker_transactions (worker_id, type, amount, date, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, type, amount, date, description || null);
      
      logAction(req, "CREATE_TRANSACTION", "transaction", Number(info.lastInsertRowid), `Added ${type} of ${amount} for worker ${id}`);

      res.json({ 
        id: info.lastInsertRowid, 
        worker_id: parseInt(id), 
        type, 
        amount, 
        date, 
        description 
      });
    } catch (err) {
      console.error("Failed to add transaction:", err);
      res.status(500).json({ error: "Failed to add transaction" });
    }
  });

  app.delete("/api/transactions/:id", authenticateToken, requirePermission("manage_workers"), (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM worker_transactions WHERE id = ?").run(id);
      logAction(req, "DELETE_TRANSACTION", "transaction", parseInt(id), "Deleted transaction");
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Tasks
  app.get("/api/tasks", authenticateToken, requirePermission("manage_tasks"), (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    res.json(tasks);
  });

  app.post("/api/tasks", authenticateToken, requirePermission("manage_tasks"), (req, res) => {
    const { name, target_quantity } = req.body;
    if (!name || !target_quantity) return res.status(400).json({ error: "Name and target_quantity are required" });
    try {
      const info = db.prepare("INSERT INTO tasks (name, target_quantity) VALUES (?, ?)").run(name, target_quantity);
      logAction(req, "CREATE_TASK", "task", Number(info.lastInsertRowid), `Created task: ${name}`);
      res.json({ id: info.lastInsertRowid, name, target_quantity });
    } catch (err) {
      res.status(400).json({ error: "Task already exists or invalid data" });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, requirePermission("manage_tasks"), (req, res) => {
    const { id } = req.params;
    const { name, target_quantity } = req.body;
    if (!name || !target_quantity) return res.status(400).json({ error: "Name and target_quantity are required" });
    try {
      db.prepare("UPDATE tasks SET name = ?, target_quantity = ? WHERE id = ?").run(name, target_quantity, id);
      logAction(req, "UPDATE_TASK", "task", parseInt(id), `Updated task: ${name}`);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Failed to update task or name already exists" });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, requirePermission("manage_tasks"), (req, res) => {
    const { id } = req.params;
    
    const transaction = db.transaction(() => {
      // Delete task entries
      db.prepare("DELETE FROM task_entries WHERE task_id = ?").run(id);
      // Delete task
      db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    });

    try {
      transaction();
      logAction(req, "DELETE_TASK", "task", parseInt(id), "Deleted task");
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete task:", err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Evaluations
  app.post("/api/evaluations", authenticateToken, requirePermission("manage_evaluations"), (req, res) => {
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

    // Sum of scores for the day based on tasks performed
    const dailyTotalScore = totalScoreSum;

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
      logAction(req, "CREATE_EVALUATION", "evaluation", Number(newEvalId), `Created evaluation for worker ${worker_id} on ${date}`);
      res.json({ success: true, evaluation_id: newEvalId, daily_score: dailyTotalScore });
    } catch (err) {
      res.status(500).json({ error: "Failed to save evaluation" });
    }
  });

  app.get("/api/evaluations", authenticateToken, requirePermission("manage_evaluations"), (req, res) => {
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

  app.get("/api/workers/:id/evaluations", authenticateToken, requirePermission("view_work_logs"), (req, res) => {
    const { id } = req.params;
    const { month } = req.query; // format: YYYY-MM
    
    let query = "SELECT * FROM daily_evaluations WHERE worker_id = ?";
    const params: any[] = [id];

    if (month) {
      query += " AND date LIKE ?";
      params.push(`${month}-%`);
    }
    
    query += " ORDER BY date DESC";
    
    const evaluations = db.prepare(query).all(...params) as any[];
    
    // For each evaluation, get the entries
    const result = evaluations.map(ev => {
      const entries = db.prepare(`
        SELECT te.*, t.name as task_name, t.target_quantity
        FROM task_entries te
        JOIN tasks t ON te.task_id = t.id
        WHERE te.evaluation_id = ?
      `).all(ev.id);
      return { ...ev, entries };
    });

    res.json(result);
  });

  app.get("/api/evaluations/:id", authenticateToken, requirePermission("manage_evaluations"), (req, res) => {
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

  app.delete("/api/evaluations/:id", authenticateToken, requirePermission("manage_evaluations"), (req, res) => {
    const { id } = req.params;
    
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM task_entries WHERE evaluation_id = ?").run(id);
      db.prepare("DELETE FROM daily_evaluations WHERE id = ?").run(id);
    });

    try {
      transaction();
      logAction(req, "DELETE_EVALUATION", "evaluation", parseInt(id), "Deleted evaluation");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete evaluation" });
    }
  });

  app.put("/api/evaluations/:id", authenticateToken, requirePermission("manage_evaluations"), (req, res) => {
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

    // Sum of scores for the day based on tasks performed
    const dailyTotalScore = totalScoreSum;

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
      logAction(req, "UPDATE_EVALUATION", "evaluation", parseInt(id), "Updated evaluation");
      res.json({ success: true, daily_score: dailyTotalScore });
    } catch (err) {
      res.status(500).json({ error: "Failed to update evaluation" });
    }
  });

  app.get("/api/reports/monthly", authenticateToken, requirePermission("view_reports"), (req, res) => {
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

  // Attendance Routes
  app.get("/api/attendance", authenticateToken, requirePermission("view_attendance"), (req, res) => {
    const { date, start_date, end_date } = req.query;

    try {
      if (date) {
        const records = db.prepare(`
          SELECT 
            w.id as worker_id, 
            w.name as worker_name, 
            a.id as attendance_id, 
            a.status, 
            a.date,
            a.check_in, 
            a.check_out, 
            a.notes
          FROM workers w
          LEFT JOIN attendance a ON w.id = a.worker_id AND a.date = ?
          ORDER BY w.name
        `).all(date);
        res.json(records);
      } else if (start_date && end_date) {
        const records = db.prepare(`
          SELECT 
            a.worker_id, 
            w.name as worker_name, 
            a.id as attendance_id, 
            a.status, 
            a.date,
            a.check_in, 
            a.check_out, 
            a.notes
          FROM attendance a
          JOIN workers w ON a.worker_id = w.id
          WHERE a.date BETWEEN ? AND ?
          ORDER BY a.date DESC
        `).all(start_date, end_date);
        res.json(records);
      } else {
        res.status(400).json({ error: "Date or date range (start_date & end_date) is required" });
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/attendance", authenticateToken, requirePermission("manage_attendance"), (req, res) => {
    const { worker_id, date, status, check_in, check_out, notes } = req.body;
    if (!worker_id || !date || !status) return res.status(400).json({ error: "Missing fields" });

    const transaction = db.transaction(() => {
      const existing = db.prepare("SELECT id FROM attendance WHERE worker_id = ? AND date = ?").get(worker_id, date) as any;
      
      if (existing) {
        db.prepare(`
          UPDATE attendance 
          SET status = ?, check_in = ?, check_out = ?, notes = ?
          WHERE id = ?
        `).run(status, check_in || null, check_out || null, notes || null, existing.id);
      } else {
        db.prepare(`
          INSERT INTO attendance (worker_id, date, status, check_in, check_out, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(worker_id, date, status, check_in || null, check_out || null, notes || null);
      }

      // Handle Account Statement (Transactions)
      const worker = db.prepare("SELECT salary FROM workers WHERE id = ?").get(worker_id) as any;
      const salary = worker?.salary || 0;
      const deductionAmount = salary > 0 ? Number((salary / 30).toFixed(2)) : 0;
      const description = `غياب - ${date}`;

      if (status === 'absent') {
        if (deductionAmount > 0) {
          // Check if transaction already exists
          const existingTrans = db.prepare("SELECT id FROM worker_transactions WHERE worker_id = ? AND description = ?").get(worker_id, description);
          if (!existingTrans) {
            db.prepare(`
              INSERT INTO worker_transactions (worker_id, type, amount, date, description)
              VALUES (?, 'deduction', ?, ?, ?)
            `).run(worker_id, deductionAmount, date, description);
          }
        }
      } else {
        // If status changed from absent to something else, remove the deduction
        db.prepare("DELETE FROM worker_transactions WHERE worker_id = ? AND description = ?").run(worker_id, description);
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to save attendance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Departures Routes
  app.get("/api/departures", authenticateToken, requirePermission("view_attendance"), (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });

    try {
      const records = db.prepare(`
        SELECT 
          d.*, 
          w.name as worker_name
        FROM departures d
        JOIN workers w ON d.worker_id = w.id
        WHERE d.date = ?
        ORDER BY d.start_time
      `).all(date);
      res.json(records);
    } catch (error) {
      console.error("Failed to fetch departures:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/departures", authenticateToken, requirePermission("manage_attendance"), (req, res) => {
    const { worker_id, date, type, start_time, end_time, notes } = req.body;
    if (!worker_id || !date || !type || !start_time) return res.status(400).json({ error: "Missing fields" });

    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO departures (worker_id, date, type, start_time, end_time, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(worker_id, date, type, start_time, end_time || null, notes || null);

      if (start_time && end_time) {
        const [h1, m1] = start_time.split(':').map(Number);
        const [h2, m2] = end_time.split(':').map(Number);
        let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMinutes < 0) diffMinutes += 24 * 60;
        
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        
        let durationStr = "مغادرة: ";
        if (hours > 0) durationStr += `${hours} ساعة `;
        if (mins > 0) durationStr += `${mins} دقيقة`;
        
        // Update attendance notes
        const existingAttendance = db.prepare("SELECT id, notes FROM attendance WHERE worker_id = ? AND date = ?").get(worker_id, date) as any;
        
        if (existingAttendance) {
          const newNotes = existingAttendance.notes 
            ? `${existingAttendance.notes} | ${durationStr}`
            : durationStr;
          
          db.prepare("UPDATE attendance SET notes = ? WHERE id = ?").run(newNotes, existingAttendance.id);
        } else {
          // Create attendance record if it doesn't exist, default to present? 
          // Or just create it with the note.
          db.prepare(`
            INSERT INTO attendance (worker_id, date, status, notes)
            VALUES (?, ?, 'present', ?)
          `).run(worker_id, date, durationStr);
        }
      }

      return info.lastInsertRowid;
    });

    try {
      const id = transaction();
      res.json({ success: true, id });
    } catch (error) {
      console.error("Failed to add departure:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/departures/:id", authenticateToken, requirePermission("manage_attendance"), (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM departures WHERE id = ?").run(id);
      // logAudit(req.user.id, req.user.username, "DELETE", "departure", id, `Deleted departure ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete departure:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
