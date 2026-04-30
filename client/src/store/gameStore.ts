import { create } from 'zustand';
import type { GameStore, Room, Player } from '../types/index.js';

export const useGameStore = create<GameStore>((set) => ({
  playerId: localStorage.getItem('playerId') || null,
  room: (() => {
    const stored = localStorage.getItem('room');
    return stored ? JSON.parse(stored) : null;
  })(),
  currentPlayer: null,
  myRole: localStorage.getItem('myRole') as "dân" | "spy" | null || null,
  myWord: localStorage.getItem('myWord') || '',
  roundSummary: [],
  showRoundSummary: false,

  setPlayerId: (id: string) => {
    localStorage.setItem('playerId', id);
    set({ playerId: id });
  },

  setRoom: (room: Room) => {
    localStorage.setItem('room', JSON.stringify(room));
    set({ room });
  },

  setCurrentPlayer: (player: Player | null) => set({ currentPlayer: player }),

  setMyRole: (role: "dân" | "spy" | null) => {
    if (role) localStorage.setItem('myRole', role);
    set({ myRole: role });
  },

  setMyWord: (word: string) => {
    localStorage.setItem('myWord', word);
    set({ myWord: word });
  },

  setRoundSummary: (summary) => set({ roundSummary: summary }),

  setShowRoundSummary: (show: boolean) => set({ showRoundSummary: show }),

  reset: () => {
    localStorage.removeItem('playerId');
    localStorage.removeItem('room');
    localStorage.removeItem('myRole');
    localStorage.removeItem('myWord');
    set({
      playerId: null,
      room: null,
      currentPlayer: null,
      myRole: null,
      myWord: '',
      roundSummary: [],
      showRoundSummary: false,
    });
  },
}));
