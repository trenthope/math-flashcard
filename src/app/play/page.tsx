'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useHistoryStore } from '@/store/historyStore';
import { buildQuestion } from '@/lib/game';
import { SessionRecord } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';

const NUM_PAD_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['←', '0', '✓'],
];

export default function PlayPage() {
  const router = useRouter();
  const {
    settings,
    deck,
    currentIndex,
    cardsAnswered,
    streak,
    isActive,
    recordAnswer,
    recordTimeout,
    advanceCard,
    endSession,
  } = useGameStore();
  const { saveSession } = useHistoryStore();

  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(settings.timeLimit);

  const [reveal, setReveal] = useState<{
    correctAnswer: number;
    wasTimeout: boolean;
  } | null>(null);

  const cardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionEndedRef = useRef(false);
  // Stable ref so the keyboard handler always calls the latest handleSubmit
  const submitRef = useRef<() => void>(() => {});

  const isFlashcard = settings.mode === 'flashcard';
  const currentCard = deck[currentIndex];
  const question = currentCard ? buildQuestion(currentCard) : '';
  const progress = isFlashcard
    ? Math.min((cardsAnswered / settings.deckSize) * 100, 100)
    : ((settings.timeLimit - sessionTimeLeft) / settings.timeLimit) * 100;

  // Redirect if no active session
  useEffect(() => {
    if (!isActive || deck.length === 0) {
      router.push('/settings');
    }
  }, []);

  // Per-card timer — only runs when not in reveal state
  useEffect(() => {
    if (!currentCard || reveal) return;
    if (cardTimerRef.current) clearInterval(cardTimerRef.current);

    if (settings.perCardLimit) {
      setTimeLeft(settings.perCardLimit);
      cardTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(cardTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(null);
    }

    return () => {
      if (cardTimerRef.current) clearInterval(cardTimerRef.current);
    };
  }, [currentIndex, reveal]);

  // Handle timeout when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && !reveal) {
      handleTimeout();
    }
  }, [timeLeft]);

  // Session timer for Math Minute
  useEffect(() => {
    if (isFlashcard) return;
    setSessionTimeLeft(settings.timeLimit);

    sessionTimerRef.current = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(sessionTimerRef.current!);
          handleEndSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, []);

  // Check if flashcard deck is complete
  useEffect(() => {
    if (reveal) return;
    if (isFlashcard && cardsAnswered >= settings.deckSize) {
      handleEndSession();
    }
  }, [cardsAnswered, reveal]);

  // Enter key advances from reveal screen
  useEffect(() => {
    if (!reveal) return;
    let armed = false;
    const raf = requestAnimationFrame(() => { armed = true; });
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && armed && !e.repeat) handleAdvance();
    };
    window.addEventListener('keydown', handler);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handler);
    };
  }, [reveal]);

  // Desktop keyboard support during answer phase
  useEffect(() => {
    if (reveal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key >= '0' && e.key <= '9') {
        setInput((prev) => prev + e.key);
      } else if (e.key === 'Backspace') {
        setInput((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        submitRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reveal]);

  const handleTimeout = () => {
    const { answer } = recordTimeout();
    setInput('');
    setReveal({ correctAnswer: answer, wasTimeout: true });
  };

  const handleSubmit = () => {
    if (!input.trim() || !currentCard) return;
    const num = Number(input);
    if (isNaN(num)) return;

    if (cardTimerRef.current) clearInterval(cardTimerRef.current);

    const { correct, confetti: shouldConfetti, answer } = recordAnswer(num);

    if (shouldConfetti) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }

    setInput('');

    if (correct) {
      advanceCard();
    } else {
      setReveal({ correctAnswer: answer, wasTimeout: false });
    }
  };

  // Keep submitRef current on every render
  submitRef.current = handleSubmit;

  const handleAdvance = () => {
    setReveal(null);
    setInput('');
    advanceCard();
  };

  const handleEndSession = () => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (cardTimerRef.current) clearInterval(cardTimerRef.current);

    const stats = endSession();
    const { settings: s, cardResults } = useGameStore.getState();

    const record: SessionRecord = {
      id: uuidv4(),
      userId: '',
      createdAt: new Date().toISOString(),
      mode: s.mode,
      operations: s.operations,
      focusNumbers: s.focusNumbers,
      rangeMin: s.rangeMin,
      rangeMax: s.rangeMax,
      deckSize: s.deckSize,
      timeLimit: s.timeLimit,
      perCardLimit: s.perCardLimit,
      repeatWindow: s.repeatWindow,
      ...stats,
      cards: cardResults,
    };

    saveSession(record);
    setTimeout(() => router.push('/results'), 0);
  };

  const handlePadPress = (key: string) => {
    if (key === '←') {
      setInput((prev) => prev.slice(0, -1));
    } else if (key === '✓') {
      handleSubmit();
    } else {
      setInput((prev) => prev + key);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center p-4 gap-3">

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-sm mb-2">
          {isFlashcard ? (
            <>
              <span className="text-gray-500 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                Card {Math.min(cardsAnswered + 1, settings.deckSize)} of {settings.deckSize}
              </span>
              <span className="text-2xl" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {streak >= 5 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak > 0 ? '🔥' : ''}
                {streak > 0 && <span className="text-orange-500 font-bold text-lg ml-1">{streak}</span>}
              </span>
            </>
          ) : (
            <>
              <span className="text-gray-500 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>{sessionTimeLeft}s left</span>
              <span className="text-2xl" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {streak >= 5 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak > 0 ? '🔥' : ''}
                {streak > 0 && <span className="text-orange-500 font-bold text-lg ml-1">{streak}</span>}
              </span>
            </>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden border-2 border-gray-300">
          <div
            className="h-4 rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #EF4444, #F97316, #EAB308, #22C55E)',
            }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className={`w-full max-w-md rounded-3xl p-6 transition-all duration-300 ${
          reveal
            ? 'border-3 border-red-300 shadow-xl shadow-red-200/50'
            : 'border-3 border-gray-200 shadow-2xl'
        }`}
        style={{ background: reveal ? '#FEF2F2' : '#FFFEF7' }}
      >
        {/* Per-card timer */}
        {timeLeft !== null && !reveal && (
          <div className="text-center mb-3">
            <span
              className={`text-3xl font-bold transition-colors ${timeLeft <= 3 ? 'text-red-500' : 'text-gray-400'}`}
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              &#x23F0; {timeLeft}s
            </span>
          </div>
        )}

        {/* Question */}
        <div
          className="text-center text-5xl md:text-6xl font-bold text-gray-800 mb-4"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          {question}
        </div>

        {reveal ? (
          /* Reveal state */
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg text-red-400 font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {reveal.wasTimeout ? "⏰ Time's up!" : '❌'}
              </p>
              <p className="text-base text-gray-500 font-semibold">The answer is</p>
              <p className="text-8xl font-bold text-green-500 mt-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {reveal.correctAnswer}
              </p>
            </div>
            <button
              onClick={handleAdvance}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all duration-200 text-xl shadow-lg shadow-blue-300/50 border-b-4 border-blue-700 active:scale-[0.98] active:border-b-0"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Next Card &#x27A1;&#xFE0F;
            </button>
          </div>
        ) : (
          /* Answer display — replaces the native input */
          <div className="rounded-2xl px-6 py-3 text-center bg-yellow-50 border-3 border-yellow-300 min-h-[72px] flex items-center justify-center">
            {input ? (
              <span className="text-5xl font-bold text-gray-800" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {input}
              </span>
            ) : (
              <span className="text-5xl font-bold text-gray-300" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                ?
              </span>
            )}
          </div>
        )}
      </div>

      {/* Number pad — only during answer phase */}
      {!reveal && (
        <div className="w-full max-w-md grid grid-cols-3 gap-2">
          {NUM_PAD_ROWS.flat().map((key) => {
            const isConfirm = key === '✓';
            const isBackspace = key === '←';

            let btnClass =
              'py-4 rounded-2xl font-bold text-2xl border-2 transition-all duration-100 active:scale-[0.92] select-none ';

            if (isConfirm) {
              btnClass +=
                'bg-green-500 border-green-600 border-b-4 border-b-green-700 text-white shadow-lg shadow-green-300/50 hover:bg-green-600';
            } else if (isBackspace) {
              btnClass +=
                'bg-red-50 border-red-200 border-b-4 border-b-red-300 text-red-500 hover:bg-red-100';
            } else {
              btnClass +=
                'bg-white border-gray-200 border-b-4 border-b-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm';
            }

            return (
              <button
                key={key}
                onPointerDown={(e) => {
                  e.preventDefault(); // prevents focus steal / mobile zoom
                  handlePadPress(key);
                }}
                className={btnClass}
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                {key}
              </button>
            );
          })}
        </div>
      )}

      {/* Quit */}
      <button
        onClick={() => router.push('/settings')}
        className="text-sm text-gray-400 hover:text-gray-600 font-semibold transition-colors"
      >
        Quit session
      </button>

    </main>
  );
}
