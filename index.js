const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./src/db');
const apiRoutes = require('./src/routes/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// WebSocket untuk pembaruan real-time
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Fungsi untuk mengirim pembaruan tempat tidur
function broadcastBedUpdate() {
    db.all('SELECT * FROM Beds', [], (err, rows) => {
        if (!err) {
            io.emit('bedUpdate', rows);
        }
    });
}

// Panggil broadcastBedUpdate saat status tempat tidur berubah
app.use('/api/beds', (req, res, next) => {
    res.on('finish', () => {
        if (req.method === 'PUT') {
            broadcastBedUpdate();
        }
    });
    next();
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});