import { Card, CardResult, Operation, SessionSettings, defaultSettings } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// ── Settings Validation ──────────────────────────────────────

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

/** Clamps settings to the ranges the settings page allows. Number inputs
 *  can be cleared or typed out of range, which would otherwise produce
 *  0-second sessions, empty decks, or divide-by-zero progress bars. */
export function normalizeSettings(settings: SessionSettings): SessionSettings {
  let rangeMin = clampInt(settings.rangeMin, 1, 1000, defaultSettings.rangeMin);
  let rangeMax = clampInt(settings.rangeMax, 1, 1000, defaultSettings.rangeMax);
  if (rangeMin > rangeMax) [rangeMin, rangeMax] = [rangeMax, rangeMin];

  return {
    ...settings,
    rangeMin,
    rangeMax,
    deckSize: clampInt(settings.deckSize, 1, 100, defaultSettings.deckSize),
    timeLimit: clampInt(settings.timeLimit, 10, 600, defaultSettings.timeLimit),
    perCardLimit:
      settings.perCardLimit === null ? null : clampInt(settings.perCardLimit, 1, 30, 5),
    repeatWindow: clampInt(settings.repeatWindow, 1, 10, defaultSettings.repeatWindow),
  };
}

// ── Card Generation ──────────────────────────────────────────

export function generateCard(
  settings: SessionSettings,
  lastRangeValue: number | null
): Card {
  const { focusNumbers, rangeMin, rangeMax, operations } = settings;

  // Pick a random focus number and operation from the selected sets
  const focusNumber = focusNumbers[Math.floor(Math.random() * focusNumbers.length)];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  // Build pool excluding last range value (no-consecutive rule)
  const pool: number[] = [];
  for (let i = rangeMin; i <= rangeMax; i++) {
    if (i !== lastRangeValue) pool.push(i);
  }
  // Fallback: if pool is empty (range has only one value), allow repeat
  const validPool = pool.length > 0 ? pool : [rangeMin];
  const rangeValue = validPool[Math.floor(Math.random() * validPool.length)];

  const answer = calculateAnswer(focusNumber, rangeValue, operation);

  return {
    id: uuidv4(),
    focusNumber,
    rangeValue,
    operation,
    answer,
    isRepeat: false,
  };
}

export function calculateAnswer(
  focusNumber: number,
  rangeValue: number,
  operation: Operation
): number {
  switch (operation) {
    case 'addition':       return focusNumber + rangeValue;
    case 'subtraction':    return rangeValue; // minuend = focus + range, answer = range
    case 'multiplication': return focusNumber * rangeValue;
    case 'division':       return rangeValue; // dividend = focus × range, answer = range
  }
}

export function buildQuestion(card: Card): string {
  const { focusNumber, rangeValue, operation } = card;
  switch (operation) {
    case 'addition':       return `${focusNumber} + ${rangeValue} = ?`;
    case 'subtraction':    return `${focusNumber + rangeValue} - ${focusNumber} = ?`;
    case 'multiplication': return `${focusNumber} × ${rangeValue} = ?`;
    case 'division':       return `${focusNumber * rangeValue} ÷ ${focusNumber} = ?`;
  }
}

export function checkAnswer(card: Card, input: number): boolean {
  return input === card.answer;
}

// ── Deck Generation ──────────────────────────────────────────

export function generateDeck(
  settings: SessionSettings,
  lastRangeValue: number | null = null
): Card[] {
  const deck: Card[] = [];

  for (let i = 0; i < settings.deckSize; i++) {
    const card = generateCard(settings, lastRangeValue);
    deck.push(card);
    lastRangeValue = card.rangeValue;
  }

  return deck;
}

// ── Missed Card Requeue ───────────────────────────────────────

export function requeueMissed(
  deck: Card[],
  currentIndex: number,
  repeatWindow: number
): Card[] {
  const missedCard = deck[currentIndex];
  const newDeck = [...deck];
  const repeat: Card = {
    ...missedCard,
    id: uuidv4(),
    isRepeat: true,
  };

  // Target position: exactly N cards after current
  const ideal = currentIndex + repeatWindow;
  const maxPos = newDeck.length; // inserting at length appends

  // Find the closest valid position to `ideal` that doesn't
  // place the card next to another card with the same rangeValue.
  let insertAt = Math.min(ideal, maxPos);

  if (hasRangeConflict(newDeck, insertAt, repeat.rangeValue)) {
    // Search outward from ideal: try +1, -1, +2, -2, …
    let found = false;
    for (let d = 1; d <= maxPos - currentIndex; d++) {
      for (const candidate of [insertAt + d, insertAt - d]) {
        if (candidate <= currentIndex || candidate > maxPos) continue;
        if (!hasRangeConflict(newDeck, candidate, repeat.rangeValue)) {
          insertAt = candidate;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  newDeck.splice(insertAt, 0, repeat);
  return newDeck;
}

/** Returns true if inserting a card with `rangeValue` at `pos` would
 *  create consecutive cards with the same rangeValue. */
function hasRangeConflict(
  deck: Card[],
  pos: number,
  rangeValue: number
): boolean {
  const before = pos > 0 ? deck[pos - 1] : undefined;
  const after = pos < deck.length ? deck[pos] : undefined;
  return (before?.rangeValue === rangeValue) ||
         (after?.rangeValue === rangeValue);
}

// ── Session Summary ───────────────────────────────────────────

export function calculateSessionStats(
  cards: CardResult[],
  totalTimeMs: number
) {
  const correct = cards.filter(c => c.correct).length;
  const accuracy = cards.length > 0 ? correct / cards.length : 0;
  // Average answering time only — excludes time spent on the reveal screen
  const answerTimeMs = cards.reduce((sum, c) => sum + c.timeMs, 0);
  const avgTimePerCard = cards.length > 0 ? answerTimeMs / cards.length : 0;

  return {
    cardsAttempted: cards.length,
    cardsCorrect: correct,
    accuracy,
    totalTime: totalTimeMs,
    avgTimePerCard,
  };
}