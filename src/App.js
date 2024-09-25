import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('https://bingo-game-client-m69e7ru5f-ujjwal-dhariwals-projects.vercel.app/');

const BingoCard = ({ numbers, markedNumbers, onNumberClick, isCurrentTurn }) => (
  <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto mt-4">
    {numbers.map((number, index) => (
      <button
        key={index}
        className={`aspect-square flex items-center justify-center text-xl font-bold rounded-full
          ${markedNumbers.includes(number)
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 text-gray-800'}
          ${isCurrentTurn && !markedNumbers.includes(number)
            ? 'hover:bg-blue-300 transition-all duration-200 transform hover:scale-105'
            : 'cursor-not-allowed'}
        `}
        onClick={() => onNumberClick(number)}
        disabled={!isCurrentTurn || markedNumbers.includes(number)}
        aria-label={`Number ${number} ${markedNumbers.includes(number) ? 'marked' : ''}`}
      >
        {number}
      </button>
    ))}
  </div>
);

const BingoGame = () => {
  const [gameCode, setGameCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [gameState, setGameState] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false); // State for loading

  useEffect(() => {
    socket.on('gameCreated', ({ gameCode, playerId }) => {
      setGameCode(gameCode);
      setPlayerId(playerId);
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
    setLoading(true);
    socket.emit('createGame');
    setLoading(false);
  };

  const handleJoinGame = () => {
    setLoading(true);
    socket.emit('joinGame', { gameCode: inputCode });
    setLoading(false);
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
          {!gameCode ? (
            <div className="space-y-4">
              <button
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition duration-200 shadow-md"
                onClick={handleCreateGame}
              >
                {loading ? 'Creating Game...' : 'Create Game'}
              </button>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter game code"
                  className="flex-grow border p-2 rounded-full text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  aria-label="Game code input"
                />
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition duration-200 shadow-md"
                  onClick={handleJoinGame}
                >
                  {loading ? 'Joining...' : 'Join'}
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

export default BingoGame;
