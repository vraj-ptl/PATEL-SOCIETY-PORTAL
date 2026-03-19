const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'patel-society-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes (loaded after DB init)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/members'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server after DB initialization
async function start() {
    const { initializeDatabase } = require('./database');
    await initializeDatabase();

    app.listen(PORT, () => {
        console.log(`\n  🏛️  Patel Society Portal Server`);
        console.log(`  ═══════════════════════════════`);
        console.log(`  🌐 Running at: http://localhost:${PORT}`);
        console.log(`  👤 Admin Login: admin / admin123`);
        console.log(`  📁 Database: data/society.db\n`);
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
