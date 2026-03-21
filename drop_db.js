const mongoose = require('mongoose');

async function dropDB() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/society');
        console.log("Connected to DB...");
        
        await mongoose.connection.db.dropDatabase();
        console.log("Database 'society' has been COMPLETELY CLEARED.");
        
    } catch(e) { 
        console.error("Error dropping the database:", e); 
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

dropDB();
