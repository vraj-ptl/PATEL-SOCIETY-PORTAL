const dns = require('dns');
const fs = require('fs');

// Force Google DNS to bypass the mobile hotspot DNS filtering
dns.setServers(['8.8.8.8']);

const srv = '_mongodb._tcp.cluster0.8kpd1jx.mongodb.net';
const txt = 'cluster0.8kpd1jx.mongodb.net';

console.log('Resolving DNS via 8.8.8.8...');

dns.resolveSrv(srv, (err, addresses) => {
    if (err) {
        console.error('Failed to resolve SRV. Error:', err);
        return;
    }
    
    dns.resolveTxt(txt, (err, records) => {
        if (err) {
            console.error('Failed to resolve TXT. Error:', err);
            return;
        }
        
        const replStr = records[0].join('');
        const replMatches = replStr.match(/replicaSet=([^&]+)/);
        const repl = replMatches ? replMatches[1] : 'atlas-8kpd1jx-shard-0';
        
        const hosts = addresses.map(n => n.name + ':' + n.port).join(',');
        const newUri = `mongodb://vrx260805_db_user:jeemains%402608@${hosts}/society?ssl=true&replicaSet=${repl}&authSource=admin&retryWrites=true&w=majority`;
        
        const envPath = '.env';
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            envContent = envContent.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI=${newUri}`);
            fs.writeFileSync(envPath, envContent);
            console.log('\n✅ SUCCESS! Replaced MONGODB_URI in your .env with the direct node string.');
        } else {
            console.log('No .env file found.');
        }
    });
});
