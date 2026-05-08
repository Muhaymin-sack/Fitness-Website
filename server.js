const crypto = require("crypto");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;
const BASE_DIR = __dirname;
const DB_PATH = path.join(BASE_DIR, "Fitness.db");

const db = new sqlite3.Database(DB_PATH);

app.use(cors());
app.use(express.json());
app.use(express.static(BASE_DIR));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

async function ensureRoleAuthColumns() {
  const roleTables = ["User_table", "Trainer_table", "Admin_table"];
  for (const table of roleTables) {
    const columns = await new Promise((resolve, reject) => {
      db.all(`PRAGMA table_info(${table})`, [], (error, rows) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(rows.map((row) => row.name));
      });
    });

    if (!columns.includes("Email")) {
      await run(`ALTER TABLE ${table} ADD COLUMN Email TEXT`);
    }
    if (!columns.includes("Password_hash")) {
      await run(`ALTER TABLE ${table} ADD COLUMN Password_hash TEXT`);
    }
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${table.toLowerCase()}_email ON ${table}(Email)`);
  }
}

function hashPassword(password, saltHex = null) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const digest = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  return `${salt.toString("hex")}:${digest.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [saltHex, digestHex] = storedHash.split(":");
  const checkDigestHex = hashPassword(password, saltHex).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(checkDigestHex, "hex"), Buffer.from(digestHex, "hex"));
}

function roleToTable(role) {
  const map = {
    members: "User_table",
    trainers: "Trainer_table",
    managers: "Admin_table",
  };
  return map[role];
}

async function emailExistsInAnyRole(email) {
  const tables = ["User_table", "Trainer_table", "Admin_table"];
  for (const table of tables) {
    const row = await get(`SELECT 1 AS ok FROM ${table} WHERE lower(Email) = ? LIMIT 1`, [email]);
    if (row) return true;
  }
  return false;
}

app.post("/api/register", async (req, res) => {
  const fullName = (req.body?.fullName || "").trim();
  const email = (req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password || "";
  const role = (req.body?.role || "members").trim().toLowerCase();

  if (!fullName || !email || !password) {
    return res.status(400).json({ ok: false, message: "Full name, email and password are required." });
  }
  if (!["members", "trainers", "managers"].includes(role)) {
    return res.status(400).json({ ok: false, message: "Invalid role selected." });
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, message: "Password must be at least 8 characters." });
  }

  try {
    if (await emailExistsInAnyRole(email)) {
      return res.status(409).json({ ok: false, message: "This email is already registered." });
    }

    const table = roleToTable(role);
    const passwordHash = hashPassword(password);
    await run(
      `INSERT INTO ${table} (Name, Age, Gender, Email, Password_hash) VALUES (?, NULL, NULL, ?, ?)`,
      [fullName, email, passwordHash]
    );

    return res.status(201).json({ ok: true, message: "Registration successful. Please login." });
  } catch (error) {
    if (String(error.message || "").toLowerCase().includes("unique")) {
      return res.status(409).json({ ok: false, message: "This email is already registered." });
    }
    return res.status(500).json({ ok: false, message: "Failed to register account." });
  }
});

app.post("/api/login", async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password || "";
  const role = (req.body?.role || "").trim().toLowerCase();

  if (!email || !password || !role) {
    return res.status(400).json({ ok: false, message: "Role, email and password are required." });
  }
  if (!["members", "trainers", "managers"].includes(role)) {
    return res.status(400).json({ ok: false, message: "Invalid role selected." });
  }

  try {
    const table = roleToTable(role);
    const row = await get(`SELECT Name, Email, Password_hash FROM ${table} WHERE lower(Email) = ?`, [email]);
    if (!row || !verifyPassword(password, row.Password_hash)) {
      return res.status(401).json({ ok: false, message: "Incorrect account type, email or password." });
    }

    return res.json({
      ok: true,
      message: `Welcome ${row.Name}! Login successful.`,
      user: { name: row.Name, email: row.Email, role },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Server error." });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(BASE_DIR, "index.html"));
});

ensureRoleAuthColumns()
  .then(() => {
    app.listen(PORT, "127.0.0.1", () => {
      console.log(`Node backend is running on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database columns:", error.message);
    process.exit(1);
  });
