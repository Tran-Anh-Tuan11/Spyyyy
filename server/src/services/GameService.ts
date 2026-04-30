import { v4 as uuidv4 } from "uuid";
import type { Player, Room } from "../types/index.js";

const WORD_BANK = [
  "Chuối", "Táo", "Cam", "Dâu", "Xoài",
  "Bàn", "Ghế", "Bóng", "Sách", "Bút",
  "Mèo", "Chó", "Chim", "Cá", "Gà",
  "Máy bay", "Tàu", "Ô tô", "Xe máy", "Đạp xe",
  "Biển", "Núi", "Rừng", "Sông", "Hồ",
  "Mưa", "Nắng", "Gió", "Sương", "Tuyết",
];

export class GameService {
  static generateWordPair(): { dân: string; spy: string } {
    const shuffled = WORD_BANK.sort(() => Math.random() - 0.5);
    return {
      dân: shuffled[0],
      spy: shuffled[1],
    };
  }

  static assignRoles(players: Player[], spyCount: number): Player[] {
    const shuffled = players.sort(() => Math.random() - 0.5);
    shuffled.forEach((player, idx) => {
      player.role = idx < spyCount ? "spy" : "dân";
      player.turnIndex = idx;
    });
    return shuffled;
  }

  static validateDescription(
    description: string,
    dânWord: string,
    spyWord: string
  ): { valid: boolean; error?: string } {
    const desc = description.toLowerCase().trim();
    const words = [dânWord.toLowerCase(), spyWord.toLowerCase()];

    // Check word existence and variants
    const forbidden = words.flatMap((w) => [
      w,
      ...w.split(" "),
      // Add English variations if needed
    ]);

    for (const word of forbidden) {
      if (desc.includes(word)) {
        return {
          valid: false,
          error: `Mô tả không được chứa từ "${word}"`,
        };
      }
    }

    if (description.trim().length < 2) {
      return {
        valid: false,
        error: "Mô tả phải có ít nhất 2 ký tự",
      };
    }

    return { valid: true };
  }

  static determineRoundWinner(votes: Map<string, string>): string {
    const voteCount = new Map<string, number>();

    votes.forEach((votedFor) => {
      voteCount.set(votedFor, (voteCount.get(votedFor) || 0) + 1);
    });

    let maxVotes = 0;
    let winner = "";

    voteCount.forEach((count, playerId) => {
      if (count > maxVotes) {
        maxVotes = count;
        winner = playerId;
      }
    });

    return winner;
  }

  static checkGameEnd(
    players: Player[]
  ): { ended: boolean; winner?: string; reason?: string } {
    const alivePlayers = players.filter((p) => p.isAlive);
    const aliveSpies = alivePlayers.filter((p) => p.role === "spy");
    const aliveDân = alivePlayers.filter((p) => p.role === "dân");

    // Spies win if they equal or outnumber civilians
    if (aliveSpies.length >= aliveDân.length && aliveSpies.length > 0) {
      return {
        ended: true,
        winner: "spy",
        reason: "Spy thắng: Số lượng bằng nhau",
      };
    }

    // Civilians win if all spies are eliminated
    if (aliveSpies.length === 0) {
      return {
        ended: true,
        winner: "dân",
        reason: "Dân thắng: Đã loại bỏ tất cả spy",
      };
    }

    return { ended: false };
  }
}
