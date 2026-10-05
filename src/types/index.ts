export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';
export type GameMode = 'flashcard' | 'mathminute';

export interface User {
  id: string;
  name: string;
  createdAt: string;
}

export interface SessionSettings {
  mode: GameMode;
  operations: Operation[];
  focusNumbers: number[];
  rangeMin: number;
  rangeMax: number;
  deckSize: number;        // flashcard mode only
  timeLimit: number;       // seconds, mathminute mode only
  perCardLimit: number | null; // seconds per card, null = off
  repeatWindow: number;    // N for missed-card requeue
}

export interface Card {
  id: string;
  focusNumber: number;
  rangeValue: number;
  operation: Operation;
  answer: number;
  isRepeat: boolean;
}

export interface CardResult {
  question: string;
  answer: number;
  userAnswer: number | null;
  correct: boolean;
  timedOut: boolean;
  timeMs: number;
  isRepeat: boolean;
}

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: string;
  mode: GameMode;
  operations: Operation[];
  focusNumbers: number[];
  rangeMin: number;
  rangeMax: number;
  deckSize: number;
  timeLimit: number;
  perCardLimit: number | null;
  repeatWindow: number;
  totalTime: number;
  cardsAttempted: number;
  cardsCorrect: number;
  accuracy: number;
  avgTimePerCard: number;
  cards: CardResult[];
}

export const defaultSettings: SessionSettings = {
  mode: 'flashcard',
  operations: ['multiplication'],
  focusNumbers: [7],
  rangeMin: 1,
  rangeMax: 12,
  deckSize: 20,
  timeLimit: 60,
  perCardLimit: 5,
  repeatWindow: 3,
};