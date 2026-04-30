export interface Player {
  id: string;
  name: string;
  role?: "dân" | "spy";
  word: string;
  description: string;
  isAlive: boolean;
  turnIndex: number;
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
  descriptions: Record<string, string>;
  votes: Record<string, string>;
  gameResult?: {
    winner: string;
    reason: string;
    stats: any;
  };
}

export interface GameStore {
  playerId: string | null;
  room: Room | null;
  currentPlayer: Player | null;
  myRole: "dân" | "spy" | null;
  myWord: string;
  roundSummary: Array<{ playerId: string; playerName: string; description: string }>;
  showRoundSummary: boolean;

  setPlayerId: (id: string) => void;
  setRoom: (room: Room) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setMyRole: (role: "dân" | "spy" | null) => void;
  setMyWord: (word: string) => void;
  setRoundSummary: (summary: Array<{ playerId: string; playerName: string; description: string }>) => void;
  setShowRoundSummary: (show: boolean) => void;
  reset: () => void;
}
