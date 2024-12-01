const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({ origin: 'http://localhost:3000' })); // Cambiar al dominio del frontend en producción
app.use(express.json()); // Para procesar datos en formato JSON
app.use(express.static(path.join(__dirname, '../frontend'))); // Sirve el frontend estático

// Estado del juego
let gameState = {
    players: {},       // Información de los jugadores
    ballPosition: null, // Posición de la pelota
    obstacles: [...Array(10).keys()].map(row => row * 11 + 5), // Obstáculos en la columna 6
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
app.get('/api/game-state', (req, res) => {
    // Devuelve el estado del juego al frontend
    res.json(gameState);
});

app.post('/api/update-game', (req, res) => {
    // Actualiza el estado del juego basado en datos del frontend
    const { type, username, position, color } = req.body;

    if (type === 'newPlayer' && username && typeof position === 'number' && color) {
        gameState.players[username] = { position, color };
        broadcastGameState();
        res.json({ message: 'Jugador añadido', success: true });
    } else if (type === 'move' && username && gameState.players[username]) {
        gameState.players[username].position = position;
        broadcastGameState();
        res.json({ message: 'Jugador movido', success: true });
    } else {
        res.status(400).json({ message: 'Solicitud inválida', success: false });
    }
});

// WebSocket
wss.on('connection', (ws) => {
    console.log('Nuevo jugador conectado');

    // Envía el estado inicial del juego al cliente
    ws.send(JSON.stringify({
        type: 'updateGameState',
        players: gameState.players,
        ballPosition: gameState.ballPosition,
        obstacles: gameState.obstacles,
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Mensaje recibido:', data);

            switch (data.type) {
                case 'newPlayer':
                    if (data.username && typeof data.position === 'number' && data.color) {
                        gameState.players[data.username] = {
                            position: data.position,
                            color: data.color,
                        };
                        console.log(`Jugador añadido: ${data.username}`);
                        broadcastGameState();
                    }
                    break;

                case 'move':
                    if (data.username && gameState.players[data.username]) {
                        gameState.players[data.username].position = data.position;
                        console.log(`Jugador movido: ${data.username}`);
                        broadcastGameState();
                    }
                    break;

                default:
                    console.warn('Mensaje desconocido:', data);
            }
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });

    ws.on('close', () => {
        console.log('Jugador desconectado');
    });
});

// Función para enviar el estado del juego a todos los clientes
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

// Configuración del servidor
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