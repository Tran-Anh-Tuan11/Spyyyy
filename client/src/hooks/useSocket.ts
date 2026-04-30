import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (socketRef.current) return; // Already initialized

    console.log('[useSocket] Khởi tạo socket ở:', SOCKET_URL);
    const socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
    });
    socketRef.current = socketInstance;
    setSocket(socketInstance); // Trigger re-render

    const handleConnect = () => {
      console.log('[useSocket] Socket connected!');

      const { playerId, room, setRoom, setCurrentPlayer, setMyRole, setMyWord } = useGameStore.getState();

      if (playerId && room?.code) {
        console.log('[useSocket] Reconnect với playerId:', playerId, 'roomCode:', room.code);
        socketInstance.emit('player:reconnect', {
          playerId,
          roomCode: room.code,
        }, (response: any) => {
          console.log('[useSocket] Reconnect response:', response);
          if (response.success) {
            setRoom(response.room);
            const player = response.player;
            const currentPlayer =
              response.room.players.find(
                (p: { turnIndex: number }) => p.turnIndex === response.room.currentTurnIndex
              ) || response.room.players[0] || null;
            setCurrentPlayer(currentPlayer);
            setMyRole(player.role);
            setMyWord(player.word);
          }
        });
      } else {
        console.log('[useSocket] Không có playerId hoặc room code, bỏ qua reconnect');
      }
    };

    socketInstance.on('connect_error', (error: Error) => {
      console.error('[useSocket] Connect error:', error.message);
    });

    socketInstance.on('connect', handleConnect);

    return () => {
      console.log('[useSocket] Cleanup: ngắt kết nối');
      socketInstance.off('connect', handleConnect);
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socket;
}

export function useSocketListener(event: string, callback: (...args: any[]) => void, dependencies: any[] = []) {
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socket.current) {
      socket.current = io(SOCKET_URL);
    }

    socket.current.on(event, callback);

    return () => {
      socket.current?.off(event, callback);
    };
  }, [event, ...dependencies]);

  return socket.current;
}
