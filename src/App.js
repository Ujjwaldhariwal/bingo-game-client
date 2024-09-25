import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';

const socket = io('https://bingo-game-client.vercel.app/'); // Replace with your actual server URL

const BingoCard = ({ numbers, markedNumbers, onNumberClick, isCurrentTurn }) => (
  <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
    {numbers.map((number, index) => (
      <button
        key={index}
        className={`aspect-square flex items-center justify-center text-lg font-bold rounded-full
          ${markedNumbers.includes(number) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-800'}
          ${isCurrentTurn && !markedNumbers.includes(number) ? 'hover:bg-blue-200' : 'cursor-not-allowed'}`}
        onClick={() => onNumberClick(number)}
        disabled={!isCurrentTurn || markedNumbers.includes(number)}
      >
        {number}
      </button>
    ))}
  </div>
);

const App = () => {
  const [gameCode, setGameCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [gameState, setGameState] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    socket.on('gameCreated', ({ gameCode, playerId }) => {
      setGameCode(gameCode);
      setPlayerId(playerId);
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 3000);
    });

    socket.on('gameJoined', ({ gameCode, playerId }) => {
      setGameCode(gameCode);
      setPlayerId(playerId);
    });

    socket.on('gameState', (state) => {
      setGameState(state);
    });

    socket.on('gameWon', ({ winnerId }) => {
      alert(winnerId === playerId ? 'You won!' : 'You lost!');
    });

    socket.on('gameEnded', ({ message }) => {
      alert(message);
      setGameCode('');
      setGameState(null);
    });

    socket.on('joinError', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('gameCreated');
      socket.off('gameJoined');
      socket.off('gameState');
      socket.off('gameWon');
      socket.off('gameEnded');
      socket.off('joinError');
    };
  }, [playerId]);

  const handleCreateGame = () => {
    socket.emit('createGame');
  };

  const handleJoinGame = () => {
    socket.emit('joinGame', { gameCode: inputCode });
  };

  const handleNumberClick = (number) => {
    socket.emit('markNumber', { gameCode, number });
  };

  const playerData = gameState?.players.find(p => p.id === playerId);

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto w-full px-4 sm:px-0">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">Bingo Game</h1>
          <AnimatePresence>
            {showAnimation && (
              <motion.div
                className="mb-4 text-center text-green-500 font-bold"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                Game Created! Code: {gameCode}
              </motion.div>
            )}
          </AnimatePresence>
          {!gameCode ? (
            <div className="space-y-4">
              <button
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition duration-200"
                onClick={handleCreateGame}
              >
                Create Game
              </button>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter game code"
                  className="flex-grow border p-2 rounded-full text-center"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                />
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition duration-200"
                  onClick={handleJoinGame}
                >
                  Join
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center font-semibold">Game Code: {gameCode}</p>
              {gameState && (
                <>
                  <p className="text-center font-medium">
                    {gameState.currentTurn === playerId
                      ? "It's your turn"
                      : "Waiting for opponent's turn"}
                  </p>
                  <div className="bg-gray-100 p-2 rounded-lg max-h-20 overflow-y-auto">
                    <p className="text-sm text-center">
                      Called Numbers: {gameState.calledNumbers.join(', ')}
                    </p>
                  </div>
                  <BingoCard
                    numbers={playerData.card}
                    markedNumbers={playerData.markedNumbers}
                    onNumberClick={handleNumberClick}
                    isCurrentTurn={gameState.currentTurn === playerId}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
