import { create } from 'zustand';
import { Card, CardResult, SessionSettings, defaultSettings } from '@/types';
import {
  generateDeck,
  requeueMissed,
  checkAnswer,
  calculateSessionStats,
  buildQuestion,
  normalizeSettings,
} from '@/lib/game';

// Math Minute has no fixed deck size, so cards are generated in batches
// and topped up as the player gets close to the end of the deck.
const MATH_MINUTE_BATCH = 50;
const MATH_MINUTE_REFILL_AT = 10;

interface GameState {
  settings: SessionSettings;
  deck: Card[];
  currentIndex: number;
  cardsAnswered: number;
  cardResults: CardResult[];
  streak: number;
  sessionStart: number | null;
  cardStart: number | null;
  isActive: boolean;
  lastSession: ReturnType<typeof calculateSessionStats> | null;

  // Actions
  updateSettings: (settings: Partial<SessionSettings>) => void;
  startSession: () => void;
  recordAnswer: (input: number) => { correct: boolean; confetti: boolean; answer: number };
  recordTimeout: () => { answer: number };
  advanceCard: () => void;
  endSession: () => ReturnType<typeof calculateSessionStats>;
  quitSession: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  settings: defaultSettings,
  deck: [],
  currentIndex: 0,
  cardsAnswered: 0,
  cardResults: [],
  streak: 0,
  sessionStart: null,
  cardStart: null,
  isActive: false,
  lastSession: null,

  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  startSession: () => {
    const settings = normalizeSettings(get().settings);
    const deck = generateDeck(
      settings.mode === 'mathminute'
        ? { ...settings, deckSize: MATH_MINUTE_BATCH }
        : settings
    );
    set({
      settings,
      deck,
      currentIndex: 0,
      cardsAnswered: 0,
      cardResults: [],
      streak: 0,
      sessionStart: Date.now(),
      cardStart: Date.now(),
      isActive: true,
      lastSession: null,
    });
  },

  // Records answer but does NOT advance — play page calls advanceCard() after reveal
  recordAnswer: (input: number) => {
    const { deck, currentIndex, cardResults, streak, settings } = get();
    const card = deck[currentIndex];
    const timeMs = Date.now() - (get().cardStart ?? Date.now());
    const correct = checkAnswer(card, input);

    const result: CardResult = {
      question: buildQuestion(card),
      answer: card.answer,
      userAnswer: input,
      correct,
      timedOut: false,
      timeMs,
      isRepeat: card.isRepeat,
    };

    let newDeck = [...deck];
    if (!correct) {
      newDeck = requeueMissed(newDeck, currentIndex, settings.repeatWindow);
    }

    const newStreak = correct ? streak + 1 : 0;
    const shouldConfetti = correct && newStreak % 5 === 0;

    set((state) => ({
      deck: newDeck,
      cardResults: [...cardResults, result],
      streak: newStreak,
      cardsAnswered: state.cardsAnswered + 1,
    }));

    return { correct, confetti: shouldConfetti, answer: card.answer };
  },

  // Records timeout but does NOT advance
  recordTimeout: () => {
    const { deck, currentIndex, cardResults, settings } = get();
    const card = deck[currentIndex];
    const timeMs = Date.now() - (get().cardStart ?? Date.now());

    const result: CardResult = {
      question: buildQuestion(card),
      answer: card.answer,
      userAnswer: null,
      correct: false,
      timedOut: true,
      timeMs,
      isRepeat: card.isRepeat,
    };

    const newDeck = requeueMissed([...deck], currentIndex, settings.repeatWindow);

    set((state) => ({
      deck: newDeck,
      cardResults: [...cardResults, result],
      streak: 0,
      cardsAnswered: state.cardsAnswered + 1,
    }));

    return { answer: card.answer };
  },

  // Advances to next card — called by play page after reveal is dismissed
  advanceCard: () => {
    set((state) => {
      const currentIndex = state.currentIndex + 1;
      let deck = state.deck;
      if (
        state.settings.mode === 'mathminute' &&
        deck.length - currentIndex <= MATH_MINUTE_REFILL_AT
      ) {
        const last = deck[deck.length - 1];
        deck = [
          ...deck,
          ...generateDeck(
            { ...state.settings, deckSize: MATH_MINUTE_BATCH },
            last?.rangeValue ?? null
          ),
        ];
      }
      return { deck, currentIndex, cardStart: Date.now() };
    });
  },

  endSession: () => {
    const { cardResults, sessionStart } = get();
    const totalTimeMs = Date.now() - (sessionStart ?? Date.now());
    const stats = calculateSessionStats(cardResults, totalTimeMs);
    set({ isActive: false, lastSession: stats });
    return stats;
  },

  // Abandons the session without recording it
  quitSession: () => set({ isActive: false }),
}));