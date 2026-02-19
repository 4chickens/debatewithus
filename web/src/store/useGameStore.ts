import { create } from 'zustand';

export type MatchPhase = 'Lobby' | 'Opening_P1' | 'Opening_P2' | 'Rebuttal_P1' | 'Rebuttal_P2' | 'Crossfire' | 'Closing_P1' | 'Closing_P2' | 'Results';

interface Player {
  id: string;
  name: string;
  avatar: string;
  volume: number;
}

interface GameState {
  momentum: number; // 0 to 100, 50 is center
  player1: Player;
  player2: Player;
  phase: MatchPhase;
  timeLeft: number;
  setMomentum: (value: number) => void;
  updateVolume: (playerNum: 1 | 2, volume: number) => void;
  setPhase: (phase: MatchPhase) => void;
  setTimeLeft: (time: number | ((prev: number) => number)) => void;
}

export const useGameStore = create<GameState>((set) => ({
  momentum: 50,
  player1: {
    id: '1',
    name: 'GLITCH_KING',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    volume: 0,
  },
  player2: {
    id: '2',
    name: 'NEON_SOUL',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya',
    volume: 0,
  },
  phase: 'Lobby',
  timeLeft: 120,
  setMomentum: (value) => set({ momentum: value }),
  updateVolume: (playerNum, volume) =>
    set((state) => ({
      player1: playerNum === 1 ? { ...state.player1, volume } : state.player1,
      player2: playerNum === 2 ? { ...state.player2, volume } : state.player2,
    })),
  setPhase: (phase) => set({ phase }),
  setTimeLeft: (timeOrFn) => set((state) => ({
    timeLeft: typeof timeOrFn === 'function' ? timeOrFn(state.timeLeft) : timeOrFn
  })),
}));
