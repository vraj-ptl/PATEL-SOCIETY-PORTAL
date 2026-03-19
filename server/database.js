const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'society.db');
const dataDir = path.join(__dirname, '..', 'data');

let db = null;

// Save to disk periodically
function saveToDisk() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

async function initializeDatabase() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const SQL = await initSqlJs();

    // Load existing DB or create new
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');

    db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_no TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            village TEXT NOT NULL,
            phone TEXT NOT NULL,
            position INTEGER NOT NULL CHECK(position >= 1 AND position <= 6),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
            UNIQUE(account_id, position)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
            account_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            principal INTEGER NOT NULL CHECK(principal IN (50000, 100000)),
            time_period_years INTEGER NOT NULL CHECK(time_period_years IN (1, 2)),
            interest INTEGER NOT NULL,
            total_amount INTEGER NOT NULL,
            total_installments INTEGER NOT NULL,
            start_month INTEGER NOT NULL,
            start_year INTEGER NOT NULL,
            remaining_balance INTEGER NOT NULL,
            total_paid INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS installments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loan_id INTEGER NOT NULL,
            installment_no INTEGER NOT NULL,
            month_label TEXT NOT NULL,
            default_amount INTEGER NOT NULL,
            paid_amount INTEGER NOT NULL DEFAULT 0,
            is_paid INTEGER NOT NULL DEFAULT 0,
            paid_date TEXT,
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
            UNIQUE(loan_id, installment_no)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS society_balance (
            id INTEGER PRIMARY KEY CHECK(id = 1),
            total_balance INTEGER NOT NULL DEFAULT 0,
            total_pending_loans INTEGER NOT NULL DEFAULT 0
        )
    `);

    // Initialize society balance row if not exists
    const balanceRow = db.exec('SELECT id FROM society_balance WHERE id = 1');
    if (balanceRow.length === 0) {
        db.run('INSERT INTO society_balance (id, total_balance, total_pending_loans) VALUES (1, 0, 0)');
    }

    // Create default admin user if not exists
    const adminUser = db.exec("SELECT id FROM users WHERE username = 'admin'");
    if (adminUser.length === 0) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.run("INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')", [hash]);
    }

    saveToDisk();
    console.log('  ✅ Database initialized');
    return db;
}

// Helper functions to mimic better-sqlite3 API
function getDB() {
    return db;
}

// get one row
function getOne(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        stmt.free();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        return row;
    }
    stmt.free();
    return null;
}

// get all rows
function getAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    const cols = stmt.getColumnNames();
    while (stmt.step()) {
        const vals = stmt.get();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        rows.push(row);
    }
    stmt.free();
    return rows;
}

// run (insert/update/delete) — returns { lastInsertRowid, changes }
function runQuery(sql, params = []) {
    db.run(sql, params);
    const lastId = db.exec('SELECT last_insert_rowid() as id');
    const changes = db.exec('SELECT changes() as c');
    saveToDisk();
    return {
        lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
        changes: changes.length > 0 ? changes[0].values[0][0] : 0
    };
}

// exec multiple statements
function execSQL(sql) {
    db.exec(sql);
    saveToDisk();
}

module.exports = {
    initializeDatabase,
    getDB,
    getOne,
    getAll,
    runQuery,
    execSQL,
    saveToDisk
};
