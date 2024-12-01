const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

// Configuración inicial
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json()); // Para manejar JSON en las solicitudes
app.use(cors({
    origin: 'http://localhost:3000', // Cambiar a la URL del frontend en producción
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// Estado del juego
let gameState = {
    players: {},
    ballPosition: null,
    obstacles: [...Array(10).keys()].map(row => row * 11 + 5), // Obstáculos de ejemplo
};

// Inicializa la posición de la pelota
function initializeBallPosition() {
    let validPositionFound = false;

    while (!validPositionFound) {
        const randomPosition = Math.floor(Math.random() * 110); // Tamaño del grid (10x11)
        if (!gameState.obstacles.includes(randomPosition)) {
            gameState.ballPosition = randomPosition;
            validPositionFound = true;
        }
    }

    console.log(`Pelota inicial colocada en la posición: ${gameState.ballPosition}`);
}
initializeBallPosition();

// Rutas de API
app.post('/api/data', (req, res) => {
    console.log('Datos recibidos:', req.body);
    res.json({ message: 'Datos procesados correctamente' });
});

// WebSocket
wss.on('connection', (ws) => {
    console.log('Nuevo jugador conectado');

    ws.send(JSON.stringify({
        type: 'updateGameState',
        players: gameState.players,
        ballPosition: gameState.ballPosition,
        obstacles: gameState.obstacles,
    }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log('Mensaje recibido:', data);

        if (data.type === 'newPlayer') {
            gameState.players[data.username] = {
                position: data.position,
                color: data.color,
            };
        }

        broadcastGameState();
    });

    ws.on('close', () => {
        console.log('Jugador desconectado');
    });
});

function broadcastGameState() {
    const message = {
        type: 'updateGameState',
        players: gameState.players,
        ballPosition: gameState.ballPosition,
        obstacles: gameState.obstacles,
    };

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Configuración del puerto
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

/* ACA SI FUNCIONA EL REALTIME 
function broadcastGameState() {
    // Limpia jugadores inválidos antes de enviar
    gameState.players = Object.fromEntries(
        Object.entries(gameState.players).filter(([key, value]) => key && value && key.trim())
    );

    console.log("Estado del juego enviado:", gameState);

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'updatePlayers', // Agregar el campo de tipo
                players: gameState.players,
                ballPosition: gameState.ballPosition,
                obstacles: gameState.obstacles
            }));
        }
    });
}
*/