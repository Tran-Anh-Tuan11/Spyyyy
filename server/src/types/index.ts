export interface Player {
  id: string;
  name: string;
  socketId: string;
  role: "dân" | "spy";
  word: string;
  turnIndex: number;
  description: string;
  isAlive: boolean;
  vote?: string;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  status: "lobby" | "game" | "discussion" | "voting" | "round_end" | "game_end";
  currentRound: number;
  currentTurnIndex: number;
  words: { dân: string; spy: string };
  wordMode: "manual" | "random";
  spyCount: number;
  dânCount: number;
  discussionTime: number;
  descriptions: Map<string, string>;
  votes: Map<string, string>;
  gameResult?: {
    winner: string;
    reason: string;
    stats: any;
  };
  createdAt: Date;
}

export interface RoundSummary {
  round: number;
  descriptions: Array<{
    playerId: string;
    playerName: string;
    description: string;
  }>;
  eliminated?: {
    playerId: string;
    playerName: string;
    role: "dân" | "spy";
  };
}
