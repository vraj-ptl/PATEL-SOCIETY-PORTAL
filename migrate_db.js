const { MongoClient } = require('mongodb');

const oldUri = 'mongodb://vrx260805_db_user:jeemains%402608@ac-31earb8-shard-00-00.8kpd1jx.mongodb.net:27017,ac-31earb8-shard-00-02.8kpd1jx.mongodb.net:27017,ac-31earb8-shard-00-01.8kpd1jx.mongodb.net:27017/society?ssl=true&replicaSet=atlas-12lga5-shard-0&authSource=admin&retryWrites=true&w=majority';
const newUri = 'mongodb://vraj26082005_db_user:vraj%23patel26@ac-leif7na-shard-00-00.fondpnu.mongodb.net:27017,ac-leif7na-shard-00-01.fondpnu.mongodb.net:27017,ac-leif7na-shard-00-02.fondpnu.mongodb.net:27017/society?ssl=true&replicaSet=atlas-6u3bbm-shard-0&authSource=admin&retryWrites=true&w=majority';

async function migrate() {
    try {
        console.log("⏳ Connecting to Old Local/Atlas DB...");
        const clientOld = new MongoClient(oldUri);
        await clientOld.connect();
        const dbOld = clientOld.db('society');

        console.log("⏳ Connecting to New Atlas DB...");
        const clientNew = new MongoClient(newUri);
        await clientNew.connect();
        const dbNew = clientNew.db('society');

        const collections = await dbOld.listCollections().toArray();
        for (let c of collections) {
            const colName = c.name;
            if (colName === 'system.profile') continue;
            console.log(`\n📦 Processing collection: ${colName}`);
            
            const docs = await dbOld.collection(colName).find({}).toArray();
            console.log(`--> Found ${docs.length} documents in old DB's '${colName}'`);
            
            if (docs.length > 0) {
                // Try dropping the new collection to avoid duplicate _id errors
                try {
                    await dbNew.collection(colName).drop();
                    console.log(`--> Cleared existing data in new DB for '${colName}'.`);
                } catch (err) {
                    // Ignore if doesn't exist
                }
                
                await dbNew.collection(colName).insertMany(docs);
                console.log(`--> ✅ Successfully copied ${docs.length} documents to new DB!`);
            }
        }

        await clientOld.close();
        await clientNew.close();
        console.log("\n🚀 Migration fully complete! Your new DB is ready.");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrate();
