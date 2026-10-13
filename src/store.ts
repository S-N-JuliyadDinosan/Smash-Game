import { create } from "zustand";
export type ToolId =
  | "hammer"
  | "glove"
  | "ball"
  | "wind"
  | "spring"
  | "hand"
  | "gravity"
  | "banana"
  | "confetti";
export const TOOLS: {
  id: ToolId;
  name: string;
  hint: string;
  key: string;
  power: number;
  points: number;
  icon: string;
}[] = [
  {
    id: "hammer",
    name: "Foam hammer",
    hint: "Big bonk energy",
    key: "1",
    power: 5,
    points: 120,
    icon: "🔨",
  },
  {
    id: "glove",
    name: "Boxing glove",
    hint: "A punch of personality",
    key: "2",
    power: 8,
    points: 150,
    icon: "🥊",
  },
  {
    id: "ball",
    name: "Rubber ball",
    hint: "Let it bounce",
    key: "3",
    power: 4,
    points: 100,
    icon: "🎾",
  },
  {
    id: "wind",
    name: "Wind blaster",
    hint: "A very breezy exit",
    key: "4",
    power: 3,
    points: 80,
    icon: "💨",
  },
  {
    id: "spring",
    name: "Spring launcher",
    hint: "Defy your expectations",
    key: "5",
    power: 10,
    points: 180,
    icon: "🚀",
  },
  {
    id: "hand",
    name: "Inflatable hand",
    hint: "An oversized high five",
    key: "6",
    power: 6,
    points: 130,
    icon: "✋",
  },
  {
    id: "gravity",
    name: "Gravity control",
    hint: "Three seconds of float",
    key: "7",
    power: 3,
    points: 100,
    icon: "🪐",
  },
  {
    id: "banana",
    name: "Banana peel",
    hint: "A classic slippery move",
    key: "8",
    power: 4,
    points: 140,
    icon: "🍌",
  },
  {
    id: "confetti",
    name: "Confetti blaster",
    hint: "Celebrate the chaos",
    key: "9",
    power: 2,
    points: 90,
    icon: "🎉",
  },
];
type State = {
  tool: ToolId;
  score: number;
  combo: number;
  best: number;
  lastHit: number;
  sound: boolean;
  setTool: (tool: ToolId) => void;
  hit: () => void;
  resetScore: () => void;
  toggleSound: () => void;
};
export const useGame = create<State>((set, get) => ({
  tool: "hammer",
  score: 0,
  combo: 0,
  best: 0,
  lastHit: 0,
  sound: false,
  setTool: (tool) => set({ tool }),
  hit: () => {
    const now = Date.now(),
      combo = now - get().lastHit < 2200 ? Math.min(get().combo + 1, 10) : 1;
    const points = TOOLS.find((t) => t.id === get().tool)!.points * combo;
    set({
      combo,
      score: get().score + points,
      best: Math.max(get().best, combo),
      lastHit: now,
    });
  },
  resetScore: () => set({ score: 0, combo: 0, best: 0, lastHit: 0 }),
  toggleSound: () => set({ sound: !get().sound }),
}));
let audio: AudioContext | undefined;
export function playBonk(tool: ToolId) {
  if (!useGame.getState().sound) return;
  audio ??= new AudioContext();
  void audio.resume();
  const oscillator = audio.createOscillator(),
    gain = audio.createGain();
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.type = tool === "wind" ? "sawtooth" : "sine";
  const now = audio.currentTime;
  oscillator.frequency.setValueAtTime(
    tool === "spring" ? 240 : tool === "confetti" ? 700 : 150,
    now,
  );
  oscillator.frequency.exponentialRampToValueAtTime(
    tool === "spring" ? 650 : 55,
    now + 0.18,
  );
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  oscillator.start();
  oscillator.stop(now + 0.25);
}
