import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useGameStore } from '../store/gameStore.js';
import type { Socket } from 'socket.io-client';
import type { Room as RoomType } from '../types/index.js';

interface RoomProps {
  socket: Socket | null;
}

export default function Room({ socket }: RoomProps) {
  const { room, playerId, setRoom, setCurrentPlayer, setMyRole, setMyWord } = useGameStore();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualWords, setManualWords] = useState({ dân: '', spy: '' });
  const [copied, setCopied] = useState(false);
  const [spyCount, setSpyCount] = useState<number | null>(null);
  const [dânCount, setDânCount] = useState<number | null>(null);
  const [discussionTime, setDiscussionTime] = useState<number | null>(null);

  const isHost = playerId === room?.hostId;
  const roomUrl = `${window.location.origin}?code=${room?.code}`;
  const totalPlayersNeeded = (room?.spyCount || 0) + (room?.dânCount || 0);
  const currentPlayers = room?.players.length || 0;
  const canStartGame = currentPlayers >= totalPlayersNeeded;

  useEffect(() => {
    if (room?.code) {
      QRCode.toDataURL(roomUrl, {
        width: 200,
        margin: 1,
      }).then(setQrCodeUrl);
    }
  }, [room?.code, roomUrl]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdated = (updatedRoom: RoomType) => {
      setRoom(updatedRoom);
    };

    const handleGameStarted = (data: any) => {
      setRoom(data.room);
      const currentPlayer =
        data.currentPlayer ||
        data.room?.players?.find((player: RoomType['players'][number]) => player.turnIndex === data.room?.currentTurnIndex) ||
        data.room?.players?.[0] ||
        null;
      const selfPlayer = data.room?.players?.find((player: RoomType['players'][number]) => player.id === playerId);
      setCurrentPlayer(currentPlayer);
      setMyRole(selfPlayer?.role ?? null);
      setMyWord(selfPlayer?.word ?? '');
    };

    socket.on('room:updated', handleRoomUpdated);
    socket.on('game:started', handleGameStarted);

    return () => {
      socket.off('room:updated', handleRoomUpdated);
      socket.off('game:started', handleGameStarted);
    };
  }, [socket, playerId, setRoom, setCurrentPlayer, setMyRole, setMyWord]);

  const handleUpdateConfig = (newSpyCount?: number, newDânCount?: number, newDiscussionTime?: number) => {
    if (!socket || !isHost) return;

    const spy = newSpyCount ?? room?.spyCount;
    const dân = newDânCount ?? room?.dânCount;
    const time = newDiscussionTime ?? room?.discussionTime;

    console.log('[Room] Host cập nhật config:', { spy, dân, discussionTime: time });
    socket.emit('room:updateConfig', { spyCount: spy, dânCount: dân, discussionTime: time }, (response: any) => {
      console.log('[Room] Callback room:updateConfig:', response);
      if (!response.success) {
        console.error('[Room] Lỗi cập nhật config:', response.error);
        alert(response.error || 'Lỗi cập nhật cấu hình');
      }
    });
  };

  const handleStartGame = () => {
    if (!socket) {
      console.error('[Room] Socket null khi bắt đầu game');
      return;
    }

    let words = undefined;
    if (room?.wordMode === 'manual') {
      if (!manualWords.dân.trim() || !manualWords.spy.trim()) {
        console.error('[Room] Chưa nhập cả 2 từ manual');
        alert('Vui lòng nhập cả 2 từ');
        return;
      }
      words = {
        dân: manualWords.dân.trim(),
        spy: manualWords.spy.trim(),
      };
    }

    console.log('[Room] Emit game:start', { words, wordMode: room?.wordMode });
    socket.emit('game:start', { words }, (response: any) => {
      console.log('[Room] Callback game:start:', response);
      if (!response.success) {
        console.error('[Room] Lỗi bắt đầu game:', response.error);
        alert(response.error || 'Lỗi khi bắt đầu game');
      } else {
        console.log('[Room] Bắt đầu game thành công');
      }
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(room?.code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!room) return null;

  return (
    <div className="max-w-4xl mx-auto pt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">📍 Phòng</h2>

          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm">Mã phòng</p>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={room.code}
                  disabled
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Quét QR</p>
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-40 h-40 mx-auto border border-slate-700 p-2 bg-white rounded"
                />
              </div>
            )}

            <div>
              <p className="text-slate-400 text-sm">Link</p>
              <p className="text-xs text-blue-400 break-all mt-1">{roomUrl}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">👥 Người chơi ({room.players.length})</h2>

          <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
            {room.players.map((player) => (
              <div
                key={player.id}
                className="bg-slate-800 rounded px-3 py-2 flex items-center gap-2"
              >
                <span>{player.id === room.hostId ? '👑' : '🎮'}</span>
                <span className="flex-1">{player.name}</span>
                {player.id === playerId && (
                  <span className="text-xs bg-purple-700 text-purple-100 px-2 py-1 rounded">Bạn</span>
                )}
              </div>
            ))}
          </div>

          <div className="bg-slate-800 rounded p-4 mb-4">
            <p className="text-sm text-slate-400 mb-2">
              Cấu hình: {room.spyCount} Spy + {room.dânCount} Dân (Tổng cộng: {totalPlayersNeeded} người)
            </p>
            <p className={`text-sm font-semibold ${
              canStartGame ? 'text-green-400' : 'text-yellow-400'
            }`}>
              Số người hiện tại: {currentPlayers} / {totalPlayersNeeded}
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Phát từ: {room.wordMode === 'random' ? 'Random' : 'Manual'}
            </p>
            <p className="text-sm text-slate-400">
              ⏱️ Thời gian thảo luận: {room.discussionTime} phút
            </p>


            {isHost && (
              <div className="mt-4 space-y-3 border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400">Host có thể chỉnh số spy/dân:</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400">Spy</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={spyCount ?? room.spyCount}
                        onChange={(e) => setSpyCount(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        max="10"
                        className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                      />
                      <button
                        onClick={() => {
                          const newSpy = spyCount ?? room.spyCount;
                          handleUpdateConfig(newSpy, undefined);
                          setSpyCount(null);
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                      >
                        Cập nhật
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400">Dân</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={dânCount ?? room.dânCount}
                        onChange={(e) => setDânCount(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        max="20"
                        className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                      />
                      <button
                        onClick={() => {
                          const newDân = dânCount ?? room.dânCount;
                          handleUpdateConfig(undefined, newDân);
                          setDânCount(null);
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                      >
                        Cập nhật
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700">
                  <label className="text-xs text-slate-400">Thời gian thảo luận (phút)</label>
                  <div className="flex gap-1 mt-1">
                    <input
                      type="number"
                      value={discussionTime ?? room.discussionTime}
                      onChange={(e) => setDiscussionTime(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      max="10"
                      className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    />
                    <button
                      onClick={() => {
                        const newTime = discussionTime ?? room.discussionTime;
                        handleUpdateConfig(undefined, undefined, newTime);
                        setDiscussionTime(null);
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                    >
                      Cập nhật
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isHost && (
            <div className="space-y-4">
              {room.wordMode === 'manual' && (
                <div>
                  <label className="block text-sm mb-2">Từ Dân</label>
                  <input
                    type="text"
                    value={manualWords.dân}
                    onChange={(e) => setManualWords({ ...manualWords, dân: e.target.value })}
                    placeholder="VD: Cam"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  />

                  <label className="block text-sm mt-3 mb-2">Từ Spy</label>
                  <input
                    type="text"
                    value={manualWords.spy}
                    onChange={(e) => setManualWords({ ...manualWords, spy: e.target.value })}
                    placeholder="VD: Quýt"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  />
                </div>
              )}

              <button
                onClick={() => {
                  console.log('[Room] Host bắt đầu game, players:', room.players.length, '/', totalPlayersNeeded);
                  handleStartGame();
                }}
                disabled={!canStartGame}
                className={`w-full py-3 rounded font-semibold transition-all ${
                  canStartGame
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-slate-600 cursor-not-allowed opacity-50'
                }`}
                title={!canStartGame ? `Chờ người chơi (${currentPlayers}/${totalPlayersNeeded})` : 'Bắt đầu game'}
              >
                {canStartGame ? '🎮 Bắt đầu Game' : `🔒 Bắt đầu Game (${currentPlayers}/${totalPlayersNeeded})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}