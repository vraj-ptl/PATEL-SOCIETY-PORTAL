/**
 * Patel Society Portal — Admin CLI Tool
 * 
 * Usage:
 *   node admin-tool.js list-users           — Show all users
 *   node admin-tool.js reset-password <username> <newpassword>  — Reset a user's password
 *   node admin-tool.js add-admin <username> <password>          — Create a new admin user
 *   node admin-tool.js delete-user <username>                   — Delete a user
 *   node admin-tool.js list-accounts        — Show all accounts with members
 *   node admin-tool.js list-loans           — Show all loans
 *   node admin-tool.js set-balance <amount> — Set society balance
 *   node admin-tool.js sql "<query>"        — Run any SQL query directly
 * 
 * IMPORTANT: Stop the server before running this tool!
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'society.db');

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log(`
  🏛️  Patel Society Portal — Admin CLI Tool
  ══════════════════════════════════════════

  Commands:
    list-users                              Show all users
    reset-password <username> <newpass>      Reset a user's password
    add-admin <username> <password>          Create new admin user
    delete-user <username>                   Delete a user
    list-accounts                           Show all accounts with members
    list-loans                              Show all loans
    set-balance <amount>                    Set society balance
    sql "<query>"                           Run any SQL query

  Example:
    node admin-tool.js reset-password admin newpass123
    node admin-tool.js sql "SELECT * FROM users"
        `);
        return;
    }

    if (!fs.existsSync(DB_PATH)) {
        console.error('❌ Database not found at:', DB_PATH);
        console.error('   Run the server at least once first to create the database.');
        return;
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(fileBuffer);

    function save() {
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
    }

    function query(sql, params = []) {
        const results = db.exec(sql);
        if (results.length === 0) return [];
        const cols = results[0].columns;
        return results[0].values.map(row => {
            const obj = {};
            cols.forEach((c, i) => obj[c] = row[i]);
            return obj;
        });
    }

    switch (command) {
        case 'list-users': {
            const users = query('SELECT id, username, role, account_id, created_at FROM users');
            console.log('\n  👤 Users:\n');
            if (users.length === 0) {
                console.log('  (no users found)');
            } else {
                console.table(users);
            }
            break;
        }

        case 'reset-password': {
            const username = args[1];
            const newPassword = args[2];
            if (!username || !newPassword) {
                console.error('  Usage: reset-password <username> <newpassword>');
                return;
            }
            const hash = bcrypt.hashSync(newPassword, 10);
            db.run('UPDATE users SET password_hash = ? WHERE username = ?', [hash, username]);
            save();
            console.log(`  ✅ Password reset for "${username}"`);
            break;
        }

        case 'add-admin': {
            const username = args[1];
            const password = args[2];
            if (!username || !password) {
                console.error('  Usage: add-admin <username> <password>');
                return;
            }
            const hash = bcrypt.hashSync(password, 10);
            try {
                db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')", [username, hash]);
                save();
                console.log(`  ✅ Admin user "${username}" created`);
            } catch (e) {
                console.error(`  ❌ Error: ${e.message}`);
            }
            break;
        }

        case 'delete-user': {
            const username = args[1];
            if (!username) {
                console.error('  Usage: delete-user <username>');
                return;
            }
            db.run('DELETE FROM users WHERE username = ?', [username]);
            save();
            console.log(`  ✅ User "${username}" deleted`);
            break;
        }

        case 'list-accounts': {
            const accounts = query(`
                SELECT a.id, a.account_no, m.name, m.village, m.phone, m.position
                FROM accounts a
                LEFT JOIN members m ON m.account_id = a.id
                ORDER BY a.account_no, m.position
            `);
            console.log('\n  🏦 Accounts & Members:\n');
            console.table(accounts);
            break;
        }

        case 'list-loans': {
            const loans = query(`
                SELECT l.id, a.account_no, l.principal, l.time_period_years, 
                       l.interest, l.total_amount, l.total_paid, l.remaining_balance, l.status
                FROM loans l
                JOIN accounts a ON a.id = l.account_id
                ORDER BY l.id
            `);
            console.log('\n  💰 Loans:\n');
            if (loans.length === 0) {
                console.log('  (no loans found)');
            } else {
                console.table(loans);
            }
            break;
        }

        case 'set-balance': {
            const amount = parseInt(args[1]);
            if (isNaN(amount)) {
                console.error('  Usage: set-balance <amount>');
                return;
            }
            db.run('UPDATE society_balance SET total_balance = ? WHERE id = 1', [amount]);
            save();
            console.log(`  ✅ Society balance set to ₹${amount.toLocaleString('en-IN')}`);
            break;
        }

        case 'sql': {
            const sqlQuery = args[1];
            if (!sqlQuery) {
                console.error('  Usage: sql "<query>"');
                return;
            }
            try {
                const results = db.exec(sqlQuery);
                if (results.length > 0) {
                    const cols = results[0].columns;
                    const rows = results[0].values.map(row => {
                        const obj = {};
                        cols.forEach((c, i) => obj[c] = row[i]);
                        return obj;
                    });
                    console.table(rows);
                } else {
                    save(); // Save in case it was an INSERT/UPDATE/DELETE
                    console.log('  ✅ Query executed (no rows returned)');
                }
            } catch (e) {
                console.error(`  ❌ SQL Error: ${e.message}`);
            }
            break;
        }

        default:
            console.error(`  ❌ Unknown command: "${command}". Run without arguments to see help.`);
    }

    db.close();
}

main().catch(console.error);
