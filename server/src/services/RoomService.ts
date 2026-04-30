import { v4 as uuidv4 } from "uuid";
import type { Player, Room } from "../types/index.js";
import { GameService } from "./GameService.js";

export class RoomService {
  private rooms: Map<string, Room> = new Map();

  createRoom(hostId: string, spyCount: number, dânCount: number, wordMode: "manual" | "random", initialWords?: { dân: string; spy: string }): Room {
    const roomId = uuidv4();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const room: Room = {
      id: roomId,
      code,
      hostId,
      players: [],
      status: "lobby",
      currentRound: 0,
      currentTurnIndex: 0,
      words: initialWords || { dân: "", spy: "" },
      wordMode,
      spyCount,
      dânCount,
      discussionTime: 3,
      descriptions: new Map(),
      votes: new Map(),
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoomByCode(code: string): Room | undefined {
    return Array.from(this.rooms.values()).find((r) => r.code === code);
  }

  getRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addPlayerToRoom(
    roomId: string,
    playerId: string,
    playerName: string,
    socketId: string
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: "Phòng không tồn tại" };

    if (room.status !== "lobby") {
      return { success: false, error: "Phòng đang trong trò chơi" };
    }

    if (
      room.players.length >=
      room.spyCount + room.dânCount
    ) {
      return { success: false, error: "Phòng đã đầy" };
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      socketId,
      role: "dân",
      word: "",
      turnIndex: -1,
      description: "",
      isAlive: true,
    };

    room.players.push(player);
    return { success: true, room };
  }

  removePlayerFromRoom(
    roomId: string,
    playerId: string
  ): { success: boolean; room?: Room } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false };

    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    }

    return { success: true, room };
  }

  startGame(roomId: string, words?: { dân: string; spy: string }): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: "Phòng không tồn tại" };

    if (room.players.length < 2) {
      return { success: false, error: "Cần ít nhất 2 người để bắt đầu" };
    }

    // Assign words
    if (room.wordMode === "random") {
      room.words = GameService.generateWordPair();
    } else if (words) {
      room.words = words;
    }

    // Assign roles
    GameService.assignRoles(room.players, room.spyCount);

    // Assign words to players
    room.players.forEach((player) => {
      player.word = player.role === "dân" ? room.words.dân : room.words.spy;
    });

    room.status = "discussion";
    room.currentRound = 1;
    room.currentTurnIndex = 0;
    room.descriptions.clear();
    room.votes.clear();

    return { success: true };
  }

  submitDescription(
    roomId: string,
    playerId: string,
    description: string
  ): { success: boolean; allSubmitted?: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: "Phòng không tồn tại" };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: "Người chơi không tồn tại" };

    // Validate description
    const validation = GameService.validateDescription(
      description,
      room.words.dân,
      room.words.spy
    );

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    player.description = description;
    room.descriptions.set(playerId, description);

    // Advance to next alive player's turn by turnIndex
    const currentPlayer = room.players.find((p) => p.turnIndex === room.currentTurnIndex);
    let nextTurnIndex = room.currentTurnIndex;
    
    // Find next player (by turnIndex) who is alive and hasn't submitted
    let attempts = 0;
    do {
      nextTurnIndex = (nextTurnIndex + 1) % room.players.length;
      const nextPlayer = room.players.find((p) => p.turnIndex === nextTurnIndex);
      if (nextPlayer && nextPlayer.isAlive && !room.descriptions.has(nextPlayer.id)) {
        break;
      }
      attempts++;
    } while (attempts < room.players.length);
    
    const oldTurnIndex = room.currentTurnIndex;
    room.currentTurnIndex = nextTurnIndex;
    console.log(`[Description] Room ${roomId}: Player ${playerId} submitted. Turn advanced: ${oldTurnIndex} -> ${nextTurnIndex}`);

    // Check if all alive players have submitted
    const alivePlayers = room.players.filter((p) => p.isAlive);
    const allSubmitted = alivePlayers.every((p) => room.descriptions.has(p.id));

    return { success: true, allSubmitted };
  }

  moveToVoting(roomId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: "Phòng không tồn tại" };

    room.status = "voting";
    room.votes.clear();

    return { success: true };
  }

  submitVote(
    roomId: string,
    voterId: string,
    votedForId: string
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: "Phòng không tồn tại" };

    room.votes.set(voterId, votedForId);
    return { success: true };
  }

  finishRound(roomId: string): {
    success: boolean;
    eliminated?: { id: string; name: string; role: string };
    gameEnded?: boolean;
    winner?: string;
    error?: string;
  } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: "Phòng không tồn tại" };

    if (room.votes.size === 0) {
      return { success: false, error: "Chưa có ai vote" };
    }

    // Determine eliminated player
    const eliminated = GameService.determineRoundWinner(room.votes);
    const eliminatedPlayer = room.players.find((p) => p.id === eliminated);

    if (!eliminatedPlayer) {
      return { success: false, error: "Lỗi xác định người bị loại" };
    }

    eliminatedPlayer.isAlive = false;

    // Check if game ended
    const endCheck = GameService.checkGameEnd(room.players);

    if (endCheck.ended) {
      room.status = "game_end";
      room.gameResult = {
        winner: endCheck.winner || "",
        reason: endCheck.reason || "",
        stats: {
          totalRounds: room.currentRound,
          eliminated: eliminatedPlayer.name,
        },
      };

      return {
        success: true,
        eliminated: {
          id: eliminatedPlayer.id,
          name: eliminatedPlayer.name,
          role: eliminatedPlayer.role,
        },
        gameEnded: true,
        winner: endCheck.winner,
      };
    }

    // Move to next round
    room.currentRound++;
    room.currentTurnIndex = 0;
    room.descriptions.clear();
    room.votes.clear();
    room.status = "discussion";

    return {
      success: true,
      eliminated: {
        id: eliminatedPlayer.id,
        name: eliminatedPlayer.name,
        role: eliminatedPlayer.role,
      },
    };
  }

  updatePlayerSocketId(roomId: string, playerId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.socketId = socketId;
      }
    }
  }

  updateConfig(
    roomId: string,
    updates: { spyCount?: number; dânCount?: number; discussionTime?: number }
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: "Phòng không tồn tại" };

    if (room.status !== "lobby") {
      return { success: false, error: "Chỉ có thể cập nhật cấu hình khi đang ở lobby" };
    }

    const newSpyCount = updates.spyCount ?? room.spyCount;
    const newDânCount = updates.dânCount ?? room.dânCount;
    const totalNeeded = newSpyCount + newDânCount;

    if (totalNeeded < 2) {
      return { success: false, error: "Cần ít nhất 2 người chơi (1 Spy + 1 Dân)" };
    }

    if (room.players.length > totalNeeded) {
      return { success: false, error: `Số người hiện tại (${room.players.length}) vượt quá cấu hình mới (${totalNeeded})` };
    }

    if (updates.spyCount !== undefined) room.spyCount = newSpyCount;
    if (updates.dânCount !== undefined) room.dânCount = newDânCount;
    if (updates.discussionTime !== undefined) room.discussionTime = Math.max(1, updates.discussionTime);

    return { success: true, room };
  }
}
