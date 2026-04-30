import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import type { Socket } from 'socket.io-client';
import type { Room as RoomType, Player } from '../types/index.js';

interface GameProps {
  socket: Socket | null;
}

export default function Game({ socket }: GameProps) {
  const { room, playerId, currentPlayer, myWord, setRoom, setCurrentPlayer, setRoundSummary, setMyRole, setMyWord } = useGameStore();
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [myDescription, setMyDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [myVote, setMyVote] = useState<string | null>(null);
  const [roundSummary, setLocalRoundSummary] = useState<
    Array<{ playerId: string; playerName: string; description: string }>
  >([]);
  const [discussionTimeLeft, setDiscussionTimeLeft] = useState(0);
  const [isDiscussionActive, setIsDiscussionActive] = useState(false);

  // Timer countdown cho discussion phase
  useEffect(() => {
    if (!isDiscussionActive || discussionTimeLeft <= 0) return;

    const timer = setTimeout(() => {
      setDiscussionTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime === 0) {
          handleFinishDiscussion();
        }
        return newTime;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [isDiscussionActive, discussionTimeLeft]);

  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data: any) => {
      setRoom(data.room);
      const activePlayer =
        data.currentPlayer ||
        data.room?.players?.find((player: RoomType['players'][number]) => player.turnIndex === data.room?.currentTurnIndex) ||
        data.room?.players?.[0] ||
        null;
      const selfPlayer = data.room?.players?.find((player: RoomType['players'][number]) => player.id === playerId);
      setCurrentPlayer(activePlayer);
      setMyRole(selfPlayer?.role ?? null);
      setMyWord(selfPlayer?.word ?? '');
      
      // Initialize descriptions from server
      const serverDescriptions: Record<string, string> = {};
      if (data.room?.descriptions && typeof data.room.descriptions === 'object') {
        Object.keys(data.room.descriptions).forEach((key) => {
          serverDescriptions[key] = data.room.descriptions[key];
        });
      }
      setDescriptions(serverDescriptions);
      
      setMyDescription('');
      setDescriptionError('');
      setMyVote(null);
      setVotes({});
      setIsDiscussionActive(false);
      setDiscussionTimeLeft(0);
    };

    const handleDescriptionSubmitted = (data: any) => {
      console.log('[Game] handleDescriptionSubmitted:', {
        currentTurnIndex: data.room?.currentTurnIndex,
        playersCount: data.room?.players?.length,
        playerId: data.playerId,
        roomDescriptions: data.room?.descriptions,
      });
      setRoom(data.room);
      
      // Sync descriptions from server room.descriptions
      const serverDescriptions: Record<string, string> = {};
      if (data.room?.descriptions && typeof data.room.descriptions === 'object') {
        Object.keys(data.room.descriptions).forEach((key) => {
          serverDescriptions[key] = data.room.descriptions[key];
        });
      }
      
      setDescriptions((prev) => ({
        ...serverDescriptions,
        [data.playerId]: data.description,
      }));
      console.log('[Game] Updated descriptions:', serverDescriptions);
      
      // Update current player based on the new turn index
      const nextPlayer =
        data.room?.players?.find((p: RoomType['players'][number]) => p.turnIndex === data.room?.currentTurnIndex) ||
        data.room?.players?.[0] ||
        null;
      console.log('[Game] Next player:', nextPlayer?.id, 'turnIndex:', nextPlayer?.turnIndex);
      setCurrentPlayer(nextPlayer);
    };

    const handleDiscussionStarted = (data: any) => {
      setRoom(data.room);
      setIsDiscussionActive(true);
      setDiscussionTimeLeft((data.room?.discussionTime || 5) * 60);
    };

    const handleVotingStarted = (data: any) => {
      setRoom(data.room);
      setIsDiscussionActive(false);
      setDiscussionTimeLeft(0);
      const summaryData = Array.from(Object.entries(descriptions)).map(
        ([playerId, desc]) => {
          const player = data.room.players.find((p: Player) => p.id === playerId);
          return {
            playerId,
            playerName: player?.name || 'Unknown',
            description: desc,
          };
        }
      );
      setLocalRoundSummary(summaryData);
      setRoundSummary(summaryData);
      setDescriptions({});
    };

    const handleVoteSubmitted = (data: any) => {
      setRoom(data.room);
    };

    const handleRoundFinished = (data: any) => {
      setRoom(data.room);
      setMyDescription('');
      setDescriptionError('');
      setMyVote(null);
      setVotes({});
      setDescriptions({});
      setIsDiscussionActive(false);
      setDiscussionTimeLeft(0);
    };

    const handleGameEnded = (data: any) => {
      setRoom(data.room);
    };

    if (!socket) return;

    socket.on('game:started', handleGameStarted);
    socket.on('round:descriptionSubmitted', handleDescriptionSubmitted);
    socket.on('round:discussionStarted', handleDiscussionStarted);
    socket.on('round:votingStarted', handleVotingStarted);
    socket.on('round:voteSubmitted', handleVoteSubmitted);
    socket.on('round:finished', handleRoundFinished);
    socket.on('game:ended', handleGameEnded);

    return () => {
      socket.off('game:started', handleGameStarted);
      socket.off('round:descriptionSubmitted', handleDescriptionSubmitted);
      socket.off('round:discussionStarted', handleDiscussionStarted);
      socket.off('round:votingStarted', handleVotingStarted);
      socket.off('round:voteSubmitted', handleVoteSubmitted);
      socket.off('round:finished', handleRoundFinished);
      socket.off('game:ended', handleGameEnded);
    };
  }, [socket, playerId, setRoom, setCurrentPlayer, setRoundSummary, setMyRole, setMyWord]);

  if (!room) return null;

  const handleSubmitDescription = () => {
    if (!socket || !myDescription.trim()) {
      setDescriptionError('Vui lòng nhập mô tả');
      return;
    }

    const desc = myDescription.toLowerCase();
    if (
      desc.includes(room.words.dân.toLowerCase()) ||
      desc.includes(room.words.spy.toLowerCase())
    ) {
      setDescriptionError('Mô tả không được chứa từ gốc');
      return;
    }

    console.log('[Game] Submitting description:', { myDescription, roomId: room.id, playerId });
    socket.emit('round:submitDescription', { description: myDescription }, (response: any) => {
      console.log('[Game] Submit callback:', response);
      if (!response.success) {
        setDescriptionError(response.error || 'Lỗi submit');
        return;
      }
      setMyDescription('');
      setDescriptionError('');
    });
  };

  const handleFinishDiscussion = () => {
    if (!socket || !room) return;
    socket.emit('round:finishDiscussion', {}, (response: any) => {
      if (!response.success) {
        alert(response.error || 'Lỗi');
      }
    });
  };

  const handleVote = (votedForId: string) => {
    if (!socket) return;
    socket.emit('round:submitVote', { votedForId }, (response: any) => {
      if (response.success) {
        setMyVote(votedForId);
      }
    });
  };

  const handleFinishVoting = () => {
    if (!socket) return;
    socket.emit('round:finish', {}, (response: any) => {
      if (!response.success) {
        alert(response.error || 'Lỗi');
      }
    });
  };
console.log(currentPlayer, playerId);

  const isMyTurn = currentPlayer?.id === playerId;
  const alivePlayers = room.players.filter((p) => p.isAlive);
  const canVote = room.status === 'voting' && !myVote;
  const allVoted = votes && Object.keys(votes).length === alivePlayers.length;

  return (
    <div className="max-w-6xl mx-auto pt-4">
      <div className="bg-slate-900 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm">Vòng {room.currentRound}</p>
            <p className="text-lg font-semibold">
              {room.status === 'discussion' && '💬 Thảo luận'}
              {room.status === 'voting' && '🗳️ Bỏ phiếu'}
              {room.status === 'round_end' && '🎯 Kết thúc vòng'}
              {room.status === 'game_end' && '🎉 Kết thúc trò chơi'}
            </p>
          </div>
          <div className="text-right">
            {isDiscussionActive && (
              <div className="mb-2">
                <p className="text-slate-400 text-sm">⏱️ Thời gian còn lại</p>
                <p className="text-3xl font-bold text-red-400">
                  {String(Math.floor(discussionTimeLeft / 60)).padStart(2, '0')}:
                  {String(discussionTimeLeft % 60).padStart(2, '0')}
                </p>
              </div>
            )}
            <p className="text-slate-400 text-sm">Từ của bạn</p>
            <p className="text-2xl font-bold text-purple-400">{myWord}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="font-bold mb-3">👥 Người chơi</h3>
          <div className="space-y-2">
            {alivePlayers.map((player, idx) => (
              <div
                key={player.id}
                className={`rounded p-2 text-sm ${
                  player.id === currentPlayer?.id ? 'bg-blue-600' : 'bg-slate-800'
                } ${player.id === playerId ? 'ring-2 ring-purple-500' : ''}`}
              >
                <p className="font-semibold">
                  #{idx + 1} {player.name}
                </p>
                {room.status === 'discussion' && player.id in descriptions && (
                  <p className="text-xs text-green-400">✓ Đã ghi</p>
                )}
                {room.status === 'voting' && player.id in votes && (
                  <p className="text-xs text-yellow-400">✓ Đã vote</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          {room.status === 'discussion' && (
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">📝 Mô tả</h3>
                {isDiscussionActive && (
                  <span className="text-sm bg-red-900 text-red-200 px-3 py-1 rounded">
                    ⏱️ {String(Math.floor(discussionTimeLeft / 60)).padStart(2, '0')}:
                    {String(discussionTimeLeft % 60).padStart(2, '0')}
                  </span>
                )}
              </div>

              <div className="bg-slate-800 rounded p-4 mb-4 max-h-64 overflow-y-auto border border-slate-700">
                {Object.entries(descriptions).length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Chưa có mô tả nào</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(descriptions).map(([pId, desc]) => {
                      const player = room.players.find((p) => p.id === pId);
                      return (
                        <div key={pId} className="bg-slate-700 rounded p-3">
                          <p className="font-semibold text-blue-300 text-sm mb-1">{player?.name} 🎯</p>
                          <p className="text-gray-200">{desc}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-400 mb-2">
                  Tiến độ: {Object.keys(descriptions).length} / {alivePlayers.length} người
                </p>
                <div className="w-full bg-slate-800 rounded-full h-2 border border-slate-700">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(Object.keys(descriptions).length / alivePlayers.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {isMyTurn && !descriptions[playerId!] ? (
                <div className="space-y-2">
                  <p className="text-sm text-yellow-400 font-semibold">⭐ Đến lượt bạn mô tả!</p>
                  <textarea
                    value={myDescription}
                    onChange={(e) => {
                      setMyDescription(e.target.value);
                      setDescriptionError('');
                    }}
                    placeholder="Nhập mô tả về từ của bạn (không được chứa từ gốc)..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white h-24 resize-none"
                  />
                  {descriptionError && (
                    <p className="text-red-400 text-sm">{descriptionError}</p>
                  )}
                  <button
                    onClick={handleSubmitDescription}
                    className="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-semibold"
                  >
                    ✓ Gửi mô tả
                  </button>
                </div>
              ) : isMyTurn && descriptions[playerId!] ? (
                <div className="bg-green-900 border border-green-700 rounded p-3 text-center">
                  <p className="text-green-300">✓ Bạn đã ghi mô tả</p>
                </div>
              ) : descriptions[playerId!] ? (
                <div className="bg-blue-900 border border-blue-700 rounded p-3 text-center">
                  <p className="text-blue-300">✓ Bạn đã ghi mô tả. Chờ những người khác...</p>
                </div>
              ) : (
                <div className="bg-slate-800 border border-slate-700 rounded p-3 text-center text-slate-400">
                  <p>Chờ người chơi khác mô tả...</p>
                </div>
              )}

              {Object.keys(descriptions).length >= alivePlayers.length && (
                <button
                  onClick={handleFinishDiscussion}
                  className="mt-4 w-full bg-orange-600 hover:bg-orange-700 py-2 rounded font-semibold"
                >
                  ⏭️ Kết thúc thảo luận
                </button>
              )}
            </div>
          )}

          {room.status === 'voting' && (
            <div className="bg-slate-900 rounded-lg p-4">
              <h3 className="font-bold mb-4">🗳️ Bỏ phiếu</h3>

              {roundSummary.length > 0 && (
                <div className="bg-slate-800 rounded p-4 mb-4">
                  <h4 className="font-semibold mb-2">Tóm tắt mô tả:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {roundSummary.map((item) => (
                      <div key={item.playerId} className="text-sm">
                        <p className="font-semibold text-blue-400">{item.playerName}:</p>
                        <p className="text-gray-300 ml-2">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {alivePlayers
                  .filter((p) => p.id !== playerId)
                  .map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleVote(player.id)}
                      disabled={!canVote}
                      className={`w-full p-3 rounded text-left transition-colors ${
                        myVote === player.id
                          ? 'bg-yellow-600'
                          : canVote
                            ? 'bg-slate-800 hover:bg-slate-700'
                            : 'bg-slate-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{player.name}</span>
                        {myVote === player.id && <span>✓ Đã vote</span>}
                      </div>
                    </button>
                  ))}
              </div>

              {myVote && (
                <div className="mt-4 bg-green-900 border border-green-700 rounded p-3 text-center">
                  <p className="text-green-300">✓ Bạn đã bỏ phiếu</p>
                </div>
              )}

              {allVoted && (
                <button
                  onClick={handleFinishVoting}
                  className="mt-4 w-full bg-orange-600 hover:bg-orange-700 py-2 rounded font-semibold"
                >
                  Kết thúc bỏ phiếu
                </button>
              )}
            </div>
          )}

          {room.status === 'round_end' && (
            <div className="bg-slate-900 rounded-lg p-4 text-center">
              <h3 className="font-bold mb-4 text-2xl">🎯 Kết thúc vòng</h3>
              <p className="text-slate-300">Đang chờ vòng tiếp theo...</p>
            </div>
          )}

          {room.status === 'game_end' && room.gameResult && (
            <div className="bg-slate-900 rounded-lg p-6">
              <h3 className="font-bold mb-4 text-2xl text-center">🎉 Kết quả game</h3>

              <div className="bg-slate-800 rounded p-4 mb-4 text-center">
                <p className="text-3xl font-bold text-purple-400 mb-2">
                  {room.gameResult.winner}
                </p>
                <p className="text-slate-300">{room.gameResult.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-900 border border-green-700 rounded p-4 text-center">
                  <p className="text-sm text-green-300">Dân thắng</p>
                  <p className="text-2xl font-bold">{room.gameResult.stats.dânWins}</p>
                </div>
                <div className="bg-red-900 border border-red-700 rounded p-4 text-center">
                  <p className="text-sm text-red-300">Spy thắng</p>
                  <p className="text-2xl font-bold">{room.gameResult.stats.spyWins}</p>
                </div>
              </div>

              <div className="bg-slate-800 rounded p-4">
                <h4 className="font-semibold mb-2">Thống kê:</h4>
                <p className="text-sm text-slate-300">Tổng số vòng: {room.gameResult.stats.totalRounds}</p>
                <p className="text-sm text-slate-300">Spy bị bắt: {room.gameResult.stats.spyCaught}</p>
                <p className="text-sm text-slate-300">Dân sống sót: {room.gameResult.stats.dânSurvived}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}