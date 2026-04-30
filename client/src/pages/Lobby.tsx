import { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import type { Socket } from 'socket.io-client';

interface LobbyProps {
  socket: Socket | null;
}

export default function Lobby({ socket }: LobbyProps) {
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [spyCount, setSpyCount] = useState(2);
  const [dânCount, setDânCount] = useState(5);
  const [wordMode, setWordMode] = useState<'manual' | 'random'>('random');
  const [discussionTime, setDiscussionTime] = useState(2);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setPlayerId, setRoom } = useGameStore();

  const handleCreateRoom = () => {
    if (!socket) {
      console.error('[Lobby] Socket null khi tạo phòng');
      return;
    }

    if (!hostName.trim()) {
      setError('Vui lòng nhập tên của bạn');
      return;
    }

    console.log('[Lobby] Emit room:create', { spyCount, dânCount, wordMode, discussionTime, hostName });
    setLoading(true);
    setError('');

    socket.emit(
      'room:create',
      { spyCount, dânCount, wordMode, discussionTime, hostName: hostName.trim() },
      (response: any) => {
        console.log('[Lobby] Callback room:create:', response);
        if (response.success) {
          console.log('[Lobby] Tạo phòng thành công, playerId:', response.playerId);
          setPlayerId(response.playerId);
          setRoom(response.room);
        } else {
          console.error('[Lobby] Lỗi tạo phòng:', response.error);
          setError(response.error || 'Lỗi tạo phòng');
        }
        setLoading(false);
      }
    );
  };

  const handleJoinRoom = () => {
    if (!socket || !roomCode.trim() || !playerName.trim()) {
      console.error('[Lobby] Thiếu dữ liệu hoặc socket');
      setError('Vui lòng nhập mã phòng và tên');
      return;
    }

    console.log('[Lobby] Emit room:join', { code: roomCode.toUpperCase(), name: playerName });
    setLoading(true);
    setError('');

    socket.emit(
      'room:join',
      { code: roomCode.trim().toUpperCase(), name: playerName.trim() },
      (response: any) => {
        console.log('[Lobby] Callback room:join:', response);
        if (response.success) {
          console.log('[Lobby] Vào phòng thành công');
          setPlayerId(response.playerId);
          setRoom(response.room);
        } else {
          console.error('[Lobby] Lỗi vào phòng:', response.error);
          setError(response.error || 'Lỗi vào phòng');
        }
        setLoading(false);
      }
    );
  };

  if (!mode) {
    return (
      <div className="max-w-md mx-auto pt-20">
        <div className="bg-slate-900 rounded-lg p-8 space-y-4">
          <h2 className="text-2xl font-bold text-center mb-6">Chào mừng!</h2>
          <button
            onClick={() => setMode('create')}
            className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded font-semibold"
          >
            ➕ Tạo phòng mới
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded font-semibold"
          >
            🚪 Vào phòng có sẵn
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="max-w-md mx-auto pt-20">
        <div className="bg-slate-900 rounded-lg p-8 space-y-4">
          <h2 className="text-2xl font-bold mb-6">Tạo phòng mới</h2>

          <div>
            <label className="block text-sm mb-2">Tên của bạn</label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="VD: Tuấn"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Số Spy</label>
            <input
              type="number"
              value={spyCount}
              onChange={(e) => setSpyCount(Math.max(1, parseInt(e.target.value)))}
              min="1"
              max="10"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Số Dân</label>
            <input
              type="number"
              value={dânCount}
              onChange={(e) => setDânCount(Math.max(1, parseInt(e.target.value)))}
              min="1"
              max="20"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Cách phát từ</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="random"
                  checked={wordMode === 'random'}
                  onChange={() => setWordMode('random')}
                  className="mr-2"
                />
                Random
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="manual"
                  checked={wordMode === 'manual'}
                  onChange={() => setWordMode('manual')}
                  className="mr-2"
                />
                Manual
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Thời gian thảo luận (phút)</label>
            <input
              type="number"
              value={discussionTime}
              onChange={(e) => setDiscussionTime(Math.max(1, parseInt(e.target.value)))}
              min="1"
              max="10"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded font-semibold disabled:opacity-50"
          >
            {loading ? 'Đang tạo...' : 'Tạo phòng'}
          </button>

          <button
            onClick={() => setMode(null)}
            className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-20">
      <div className="bg-slate-900 rounded-lg p-8 space-y-4">
        <h2 className="text-2xl font-bold mb-6">Vào phòng</h2>

        <div>
          <label className="block text-sm mb-2">Mã phòng</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="VD: ABC123"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Tên của bạn</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Tên người chơi"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
          />
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <button
          onClick={handleJoinRoom}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Đang vào...' : 'Vào phòng'}
        </button>

        <button
          onClick={() => setMode(null)}
          className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
}