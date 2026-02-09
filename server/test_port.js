const http = require('http');
try {
    const server = http.createServer((req, res) => {
        res.writeHead(200);
        res.end('ok');
    });
    server.on('error', (e) => {
        console.error('Server error:', e);
        process.exit(1);
    });
    server.listen(5000, () => {
        console.log('Listening on 5000');
        // Close immediately to clean up
        server.close(() => {
            console.log('Closed 5000');
            process.exit(0);
        });
    });
} catch (e) {
    console.error('Startup error:', e);
}
