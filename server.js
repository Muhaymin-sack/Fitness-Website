const crypto = require("crypto");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const cors = require("cors");
const session = require("express-session");

const app = express();
const PORT = 5000;
const BASE_DIR = __dirname;
const DB_PATH = path.join(BASE_DIR, "Fitness.db");
const SESSION_MAX_AGE_MS = 30 * 60 * 1000;

const db = new sqlite3.Database(DB_PATH);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(BASE_DIR));

app.use(
  session({
    name: "fitness.sid",
    secret: "fitness-website-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: SESSION_MAX_AGE_MS,
    },
  })
);

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ ok: false, message: "Not logged in." });
  }
  next();
}

function redirectByRole(role) {
  const map = {
    members: "home_page.html",
    trainers: "home_page.html",
    managers: "admin_dashboard.html",
  };
  return map[role] || "home_page.html";
}

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
  const requiredColumns = {
    Email: "TEXT",
    Password_hash: "TEXT",
    Phone: "TEXT",
    DateOfBirth: "TEXT",
    Address: "TEXT",
    EmergencyContactName: "TEXT",
    EmergencyContactPhone: "TEXT",
    HealthNotes: "TEXT",
    Specialization: "TEXT",
    YearsOfExperience: "INTEGER",
    Bio: "TEXT",
    EmployeeID: "TEXT",
    Department: "TEXT",
  };

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

    for (const [name, type] of Object.entries(requiredColumns)) {
      if (!columns.includes(name)) {
        await run(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
      }
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

function calculateAgeFromDob(dobIso) {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

app.post("/api/register", async (req, res) => {
  const body = req.body || {};
  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const role = (body.role || "members").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const dateOfBirth = (body.dateOfBirth || "").trim();
  const gender = (body.gender || "").trim();
  const address = (body.address || "").trim();
  const emergencyContactName = (body.emergencyContactName || "").trim();
  const emergencyContactPhone = (body.emergencyContactPhone || "").trim();
  const healthNotes = (body.healthNotes || "").trim();
  const specialization = (body.specialization || "").trim();
  const yearsOfExperienceRaw = body.yearsOfExperience;
  const bio = (body.bio || "").trim();
  const employeeID = (body.employeeID || "").trim();
  const department = (body.department || "").trim();

  if (!fullName || !email || !password) {
    return res.status(400).json({ ok: false, message: "Full name, email and password are required." });
  }
  if (!["members", "trainers", "managers"].includes(role)) {
    return res.status(400).json({ ok: false, message: "Invalid role selected." });
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, message: "Password must be at least 8 characters." });
  }

  if (!phone || !PHONE_PATTERN.test(phone)) {
    return res.status(400).json({ ok: false, message: "Please enter a valid phone number." });
  }
  if (!dateOfBirth) {
    return res.status(400).json({ ok: false, message: "Date of birth is required." });
  }
  const age = calculateAgeFromDob(dateOfBirth);
  if (age === null || age < 0 || age > 120) {
    return res.status(400).json({ ok: false, message: "Please enter a valid date of birth." });
  }
  if (age < 16) {
    return res.status(400).json({ ok: false, message: "You must be at least 16 years old to register." });
  }

  let yearsOfExperience = null;
  if (role === "members") {
    if (!emergencyContactName || !emergencyContactPhone) {
      return res.status(400).json({ ok: false, message: "Emergency contact name and phone are required for gym safety." });
    }
    if (!PHONE_PATTERN.test(emergencyContactPhone)) {
      return res.status(400).json({ ok: false, message: "Please enter a valid emergency contact phone." });
    }
  } else if (role === "trainers") {
    if (!specialization) {
      return res.status(400).json({ ok: false, message: "Specialization is required for trainers." });
    }
    if (yearsOfExperienceRaw === undefined || yearsOfExperienceRaw === null || yearsOfExperienceRaw === "") {
      return res.status(400).json({ ok: false, message: "Years of experience is required for trainers." });
    }
    yearsOfExperience = Number.parseInt(yearsOfExperienceRaw, 10);
    if (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 70) {
      return res.status(400).json({ ok: false, message: "Years of experience must be between 0 and 70." });
    }
  } else if (role === "managers") {
    if (!department) {
      return res.status(400).json({ ok: false, message: "Department is required for managers." });
    }
    if (!employeeID) {
      return res.status(400).json({ ok: false, message: "Employee ID is required for managers." });
    }
  }

  try {
    if (await emailExistsInAnyRole(email)) {
      return res.status(409).json({ ok: false, message: "This email is already registered." });
    }

    const table = roleToTable(role);
    const passwordHash = hashPassword(password);

    if (role === "members") {
      await run(
        `INSERT INTO ${table} (Name, Age, Gender, Email, Password_hash, Phone, DateOfBirth, Address, EmergencyContactName, EmergencyContactPhone, HealthNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fullName, age, gender || null, email, passwordHash, phone, dateOfBirth, address || null, emergencyContactName, emergencyContactPhone, healthNotes || null]
      );
    } else if (role === "trainers") {
      await run(
        `INSERT INTO ${table} (Name, Age, Gender, Email, Password_hash, Phone, DateOfBirth, Address, Specialization, YearsOfExperience, Bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fullName, age, gender || null, email, passwordHash, phone, dateOfBirth, address || null, specialization, yearsOfExperience, bio || null]
      );
    } else {
      await run(
        `INSERT INTO ${table} (Name, Age, Gender, Email, Password_hash, Phone, DateOfBirth, Address, EmployeeID, Department) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fullName, age, gender || null, email, passwordHash, phone, dateOfBirth, address || null, employeeID, department]
      );
    }

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

    req.session.user = { name: row.Name, email: row.Email, role };

    return res.json({
      ok: true,
      message: `Welcome ${row.Name}! Login successful.`,
      user: req.session.user,
      redirect: redirectByRole(role),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Server error." });
  }
});

app.get("/api/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ ok: false, message: "Not logged in." });
  }
  return res.json({ ok: true, user: req.session.user });
});

app.post("/api/logout", (req, res) => {
  if (!req.session) {
    res.clearCookie("fitness.sid");
    return res.json({ ok: true, message: "Logged out." });
  }
  req.session.destroy(() => {
    res.clearCookie("fitness.sid");
    return res.json({ ok: true, message: "Logged out successfully." });
  });
});

app.get("/api/protected-example", requireAuth, (req, res) => {
  res.json({
    ok: true,
    message: `Hello ${req.session.user.name}, you are authenticated as ${req.session.user.role}.`,
  });
});

app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const { email, role } = req.session.user;
    const table = roleToTable(role);
    const row = await get(
      `SELECT Name, Age, Gender, Email, Phone, DateOfBirth, Address,
              EmergencyContactName, EmergencyContactPhone, HealthNotes,
              Specialization, YearsOfExperience, Bio,
              EmployeeID, Department
       FROM ${table} WHERE lower(Email) = ?`,
      [email]
    );
    if (!row) {
      return res.status(404).json({ ok: false, message: "Profile not found." });
    }
    return res.json({ ok: true, profile: { ...row, role } });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load profile." });
  }
});

app.put("/api/profile", requireAuth, async (req, res) => {
  try {
    const { email, role } = req.session.user;
    const body = req.body || {};
    const fullName = (body.fullName || "").trim();
    const phone = (body.phone || "").trim();
    const dateOfBirth = (body.dateOfBirth || "").trim();
    const gender = (body.gender || "").trim();
    const address = (body.address || "").trim();

    if (!fullName) {
      return res.status(400).json({ ok: false, message: "Full name is required." });
    }
    if (!phone || !PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ ok: false, message: "Please enter a valid phone number." });
    }
    if (!dateOfBirth) {
      return res.status(400).json({ ok: false, message: "Date of birth is required." });
    }
    const age = calculateAgeFromDob(dateOfBirth);
    if (age === null || age < 16 || age > 120) {
      return res.status(400).json({ ok: false, message: "Please enter a valid date of birth (16+)." });
    }

    const table = roleToTable(role);

    if (role === "members") {
      const emergencyContactName = (body.emergencyContactName || "").trim();
      const emergencyContactPhone = (body.emergencyContactPhone || "").trim();
      const healthNotes = (body.healthNotes || "").trim();
      if (!emergencyContactName || !emergencyContactPhone) {
        return res.status(400).json({ ok: false, message: "Emergency contact name and phone are required." });
      }
      if (!PHONE_PATTERN.test(emergencyContactPhone)) {
        return res.status(400).json({ ok: false, message: "Please enter a valid emergency contact phone." });
      }
      await run(
        `UPDATE ${table} SET Name=?, Age=?, Gender=?, Phone=?, DateOfBirth=?, Address=?,
         EmergencyContactName=?, EmergencyContactPhone=?, HealthNotes=?
         WHERE lower(Email)=?`,
        [fullName, age, gender || null, phone, dateOfBirth, address || null,
         emergencyContactName, emergencyContactPhone, healthNotes || null, email]
      );
    } else if (role === "trainers") {
      const specialization = (body.specialization || "").trim();
      const yearsOfExperienceRaw = body.yearsOfExperience;
      const bio = (body.bio || "").trim();
      if (!specialization) {
        return res.status(400).json({ ok: false, message: "Specialization is required." });
      }
      let yearsOfExperience = null;
      if (yearsOfExperienceRaw !== "" && yearsOfExperienceRaw !== null && yearsOfExperienceRaw !== undefined) {
        yearsOfExperience = Number.parseInt(yearsOfExperienceRaw, 10);
        if (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 70) {
          return res.status(400).json({ ok: false, message: "Years of experience must be between 0 and 70." });
        }
      }
      await run(
        `UPDATE ${table} SET Name=?, Age=?, Gender=?, Phone=?, DateOfBirth=?, Address=?,
         Specialization=?, YearsOfExperience=?, Bio=?
         WHERE lower(Email)=?`,
        [fullName, age, gender || null, phone, dateOfBirth, address || null,
         specialization, yearsOfExperience, bio || null, email]
      );
    } else if (role === "managers") {
      const employeeID = (body.employeeID || "").trim();
      const department = (body.department || "").trim();
      if (!employeeID || !department) {
        return res.status(400).json({ ok: false, message: "Employee ID and department are required." });
      }
      await run(
        `UPDATE ${table} SET Name=?, Age=?, Gender=?, Phone=?, DateOfBirth=?, Address=?,
         EmployeeID=?, Department=?
         WHERE lower(Email)=?`,
        [fullName, age, gender || null, phone, dateOfBirth, address || null,
         employeeID, department, email]
      );
    }

    req.session.user.name = fullName;

    return res.json({ ok: true, message: "Profile updated successfully." });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update profile." });
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
