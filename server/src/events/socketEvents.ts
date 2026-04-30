import type { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { roomService } from "../services/RoomService.js";
import type { Room } from "../types/index.js";

// Helper to convert Room with Map to serializable object
function serializeRoom(room: Room | undefined) {
  if (!room) return room;
  return {
    ...room,
    descriptions: room.descriptions ? Object.fromEntries(room.descriptions) : {},
    votes: room.votes ? Object.fromEntries(room.votes) : {},
  };
}

export function setupSocketEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Create room
    socket.on("room:create", (data: { spyCount: number; dânCount: number; wordMode: "manual" | "random"; hostName: string }, callback) => {
      const playerId = uuidv4();
      const room = roomService.createRoom(playerId, data.spyCount, data.dânCount, data.wordMode);
      roomService.addPlayerToRoom(room.id, playerId, data.hostName || "Host", socket.id);

      socket.join(room.code);
      socket.data.playerId = playerId;
      socket.data.roomCode = room.code;
      socket.data.roomId = room.id;

      callback({
        success: true,
        room,
        playerId,
      });
    });

    // Join room by code
    socket.on("room:join", (data: { code: string; name: string }, callback) => {
      const room = roomService.getRoomByCode(data.code);

      if (!room) {
        callback({ success: false, error: "Phòng không tồn tại" });
        return;
      }

      const playerId = uuidv4();
      const result = roomService.addPlayerToRoom(room.id, playerId, data.name, socket.id);

      if (!result.success) {
        callback({ success: false, error: result.error });
        return;
      }

      socket.join(room.code);
      socket.data.playerId = playerId;
      socket.data.roomCode = room.code;
      socket.data.roomId = room.id;

      io.to(room.code).emit("room:updated", serializeRoom(result.room));

      callback({
        success: true,
        room: result.room,
        playerId,
      });
    });

    // Start game
    socket.on(
      "game:start",
      (data: { words?: { dân: string; spy: string } }, callback) => {
        if (!socket.data.roomId) {
          callback({ success: false, error: "Không tìm thấy phòng" });
          return;
        }

        const result = roomService.startGame(socket.data.roomId, data.words);

        if (!result.success) {
          callback({ success: false, error: result.error });
          return;
        }

        const room = roomService.getRoomById(socket.data.roomId);
        io.to(socket.data.roomCode).emit("game:started", {
          room: serializeRoom(room),
          currentPlayer: room?.players[0],
        });

        callback({ success: true });
      }
    );

    // Submit description
    socket.on(
      "round:submitDescription",
      (data: { description: string }, callback) => {
        if (!socket.data.roomId) {
          callback({ success: false, error: "Không tìm thấy phòng" });
          return;
        }

        const result = roomService.submitDescription(
          socket.data.roomId,
          socket.data.playerId,
          data.description
        );

        if (!result.success) {
          callback({ success: false, error: result.error });
          return;
        }

        const room = roomService.getRoomById(socket.data.roomId);
        
        io.to(socket.data.roomCode).emit("round:descriptionSubmitted", {
          room: serializeRoom(room),
          playerId: socket.data.playerId,
          description: data.description,
        });

        // If all alive players have submitted, auto-transition to voting
        if (result.allSubmitted) {
          const updateResult = roomService.moveToVoting(socket.data.roomId);
          if (updateResult.success) {
            const updatedRoom = roomService.getRoomById(socket.data.roomId);
            io.to(socket.data.roomCode).emit("round:votingStarted", { room: serializeRoom(updatedRoom) });
          }
        }

        callback({ success: true });
      }
    );

    // Move to voting
    socket.on("round:finishDiscussion", (_, callback) => {
      if (!socket.data.roomId) {
        callback({ success: false, error: "Không tìm thấy phòng" });
        return;
      }

      const result = roomService.moveToVoting(socket.data.roomId);

      if (!result.success) {
        callback({ success: false, error: result.error });
        return;
      }

      const room = roomService.getRoomById(socket.data.roomId);
      io.to(socket.data.roomCode).emit("round:votingStarted", { room: serializeRoom(room) });

      callback({ success: true });
    });

    // Submit vote
    socket.on(
      "round:submitVote",
      (data: { votedForId: string }, callback) => {
        if (!socket.data.roomId) {
          callback({ success: false, error: "Không tìm thấy phòng" });
          return;
        }

        const result = roomService.submitVote(
          socket.data.roomId,
          socket.data.playerId,
          data.votedForId
        );

        if (!result.success) {
          callback({ success: false, error: result.error });
          return;
        }

        const room = roomService.getRoomById(socket.data.roomId);
        io.to(socket.data.roomCode).emit("round:voteSubmitted", { room: serializeRoom(room) });

        callback({ success: true });
      }
    );

    // Finish round
    socket.on("round:finish", (_, callback) => {
      if (!socket.data.roomId) {
        callback({ success: false, error: "Không tìm thấy phòng" });
        return;
      }

      const result = roomService.finishRound(socket.data.roomId);

      if (!result.success) {
        callback({ success: false, error: result.error });
        return;
      }

      const room = roomService.getRoomById(socket.data.roomId);

      if (result.gameEnded) {
        io.to(socket.data.roomCode).emit("game:ended", {
          room: serializeRoom(room),
          winner: result.winner,
          eliminated: result.eliminated,
        });
      } else {
        io.to(socket.data.roomCode).emit("round:finished", {
          room: serializeRoom(room),
          eliminated: result.eliminated,
        });
      }

      callback({ success: true });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);

      if (socket.data.roomId) {
        // Give player 30 seconds to reconnect before removing
        const roomId = socket.data.roomId;
        const roomCode = socket.data.roomCode;
        const playerId = socket.data.playerId;
        
        setTimeout(() => {
          const room = roomService.getRoomById(roomId);
          if (room) {
            const player = room.players.find((p) => p.id === playerId);
            if (player) {
              console.log(`[Timeout] Removing disconnected player ${playerId} from room ${roomId}`);
              roomService.removePlayerFromRoom(roomId, playerId);
              // Get updated room after player removal
              const updatedRoom = roomService.getRoomById(roomId);
              io.to(roomCode).emit("room:updated", serializeRoom(updatedRoom));
            }
          }
        }, 30000);
      }
    });

    // Reconnect
    socket.on("player:reconnect", (data: { playerId: string; roomCode: string }, callback) => {
      console.log(`[Reconnect] Player ${data.playerId} attempting to rejoin room ${data.roomCode}`);
      const room = roomService.getRoomByCode(data.roomCode);

      if (!room) {
        console.error(`[Reconnect] Room ${data.roomCode} not found`);
        callback({ success: false, error: "Phòng không tồn tại" });
        return;
      }

      const player = room.players.find((p) => p.id === data.playerId);

      if (!player) {
        console.error(`[Reconnect] Player ${data.playerId} not found in room ${room.id}`);
        console.log(`[Reconnect] Available players: ${room.players.map((p) => p.id).join(", ")}`);
        callback({ success: false, error: "Người chơi không tồn tại" });
        return;
      }

      socket.join(room.code);
      socket.data.playerId = data.playerId;
      socket.data.roomCode = room.code;
      socket.data.roomId = room.id;

      roomService.updatePlayerSocketId(room.id, data.playerId, socket.id);
      console.log(`[Reconnect] Player ${data.playerId} successfully rejoined room ${room.id}`);

      callback({ success: true, room, player });
    });
  });
}
