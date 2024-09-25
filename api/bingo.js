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

// Create HTTP server
const httpServer = createServer((req, res) => {
  res.writeHead(404);
  res.end();
});

// Setup Socket.io server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: "https://bingo-game-client-3vq6rgpva-ujjwal-dhariwals-projects.vercel.app", // Change to your actual client URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
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
    for (const [gameCode, game] of games) {
      if (game.hostId === socket.id || game.players.some(p => p.id === socket.id)) {
        games.delete(gameCode);
        io.emit('gameEnded', { message: 'The game has ended due to a player leaving.' });
      }
    }
  });
});

// Check win condition
function checkWinCondition(gameCode) {
  const game = games.get(gameCode);
  if (!game) return;

  // Implement win checking logic here (e.g., check if a player has a winning combination)
  // If a player wins:
  // io.to(gameCode).emit('gameWon', { winnerId: playerId });
}

// Start the server
httpServer.listen(3000, () => {
  console.log('Server is running on port 3000');
});
