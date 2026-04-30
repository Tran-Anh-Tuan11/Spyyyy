import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore.js';
import { useSocket } from './hooks/useSocket.js';
import Lobby from './pages/Lobby.tsx';
import Room from './pages/Room.tsx';
import Game from './pages/Game.tsx';
import './index.css';

function App() {
  const { room, playerId, reset } = useGameStore();
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError('');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (error: Error) => {
      setIsConnected(false);
      setConnectionError(error.message);
    };

    setIsConnected(socket.connected);
    if (socket.connected) {
      setConnectionError('');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket]);

  const renderPage = () => {
    if (!socket) {
      return <div className="text-center text-gray-400 py-8">Kết nối...</div>;
    }
    if (!room) return <Lobby socket={socket} />;
    if (room.status === 'lobby') return <Room socket={socket} />;
    return <Game socket={socket} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-purple-400">🕵️ Spy & Duel</h1>
        <div className="flex items-center gap-4">
          <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          {connectionError && <span className="text-xs text-red-300 max-w-xs truncate">{connectionError}</span>}
          {room && playerId && (
            <button
              onClick={reset}
              className="px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700 rounded"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
