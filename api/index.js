const app = require('../server/server.js');
const { initializeDatabase } = require('../server/database');

let isDbInitialized = false;

module.exports = async (req, res) => {
    try {
        if (!isDbInitialized) {
            await initializeDatabase();
            isDbInitialized = true;
        }
        // App is an Express instance, which can be called as a function (req, res)
        return app(req, res);
    } catch (err) {
        console.error('Vercel Entry Point Error:', err);
        res.status(500).json({ 
            error: 'Server Initialization Failed', 
            details: err.message,
            tip: 'Check your MONGODB_URI environment variable in Vercel settings.'
        });
    }
};
