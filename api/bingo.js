// api/bingo.js
const { Server } = require('socket.io');
const { createServer } = require('http');
const { v4: uuidv4 } = require('uuid');

const games = new Map();

function generateBingoCard() {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers;
}

// This handler is for HTTP requests made to the /api/bingo endpoint
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Bingo API is running!' });
  }
}

// Socket.io server setup
let io;
let httpServer;

if (!io) {
  // We need to create the HTTP server to handle socket.io connections
  httpServer = createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });

  io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    // Handle game creation
    socket.on('createGame', () => {
      const gameCode = uuidv4().substr(0, 5).toUpperCase();
      games.set(gameCode, {
        hostId: socket.id,
        players: [{ id: socket.id, card: generateBingoCard(), markedNumbers: [] }],
        currentTurn: socket.id,
        calledNumbers: []
      });
      socket.join(gameCode);
      socket.emit('gameCreated', { gameCode, playerId: socket.id });
    });

    // Handle joining a game
    socket.on('joinGame', ({ gameCode }) => {
      const game = games.get(gameCode);
      if (game && game.players.length < 2) {
        game.players.push({ id: socket.id, card: generateBingoCard(), markedNumbers: [] });
        socket.join(gameCode);
        socket.emit('gameJoined', { gameCode, playerId: socket.id });
        io.to(gameCode).emit('gameState', game);
      } else {
        socket.emit('joinError', { message: 'Game not found or full' });
      }
    });

    // Handle number marking
    socket.on('markNumber', ({ gameCode, number }) => {
      const game = games.get(gameCode);
      if (game && game.currentTurn === socket.id) {
        const player = game.players.find(p => p.id === socket.id);
        if (player && player.card.includes(number) && !player.markedNumbers.includes(number)) {
          player.markedNumbers.push(number);
          game.calledNumbers.push(number);
          game.currentTurn = game.players.find(p => p.id !== socket.id).id;
          io.to(gameCode).emit('gameState', game);
          checkWinCondition(gameCode);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
      for (const [gameCode, game] of games.entries()) {
        if (game.players.some(p => p.id === socket.id)) {
          games.delete(gameCode);
          io.to(gameCode).emit('gameEnded', { message: 'Opponent disconnected' });
        }
      }
    });
  });

  httpServer.listen(3001, () => {
    console.log('Socket.io server running on port 3001');
  });
}

function checkWinCondition(gameCode) {
  const game = games.get(gameCode);
  const winPatterns = [
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24], // rows
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24], // columns
    [0, 6, 12, 18, 24], [4, 8, 12, 16, 20] // diagonals
  ];

  for (const player of game.players) {
    for (const pattern of winPatterns) {
      if (pattern.every(index => player.markedNumbers.includes(player.card[index]))) {
        io.to(gameCode).emit('gameWon', { winnerId: player.id });
        games.delete(gameCode);
        return;
      }
    }
  }
}
