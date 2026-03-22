const { initializeDatabase } = require('../server/database');

// Cache the initialization promise so it only runs once across warm starts
let dbReady = null;

module.exports = async (req, res) => {
    try {
        // Initialize the database ONCE, then reuse for all subsequent requests
        if (!dbReady) {
            dbReady = initializeDatabase();
        }
        await dbReady;

        // Now load the app AFTER the database is connected
        const app = require('../server/server');
        return app(req, res);
    } catch (err) {
        // Reset so it retries on next request
        dbReady = null;
        console.error('Vercel API Error:', err);
        res.status(500).json({
            error: 'Database Connection Failed',
            message: err.message,
            fix: 'Add MONGODB_URI to your Vercel Project Settings > Environment Variables, then Redeploy.'
        });
    }
};
