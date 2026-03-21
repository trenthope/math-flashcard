'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useHistoryStore } from '@/store/historyStore';
import { buildQuestion } from '@/lib/game';
import { SessionRecord } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';

export default function PlayPage() {
  const router = useRouter();
  const {
    settings,
    deck,
    currentIndex,
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

  const inputRef = useRef<HTMLInputElement>(null);
  const cardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionEndedRef = useRef(false);

  const isFlashcard = settings.mode === 'flashcard';
  const currentCard = deck[currentIndex];
  const question = currentCard ? buildQuestion(currentCard) : '';
  const progress = isFlashcard
    ? Math.min((currentIndex / deck.length) * 100, 100)
    : ((settings.timeLimit - sessionTimeLeft) / settings.timeLimit) * 100;

  // Redirect if no active session
  useEffect(() => {
    if (!isActive || deck.length === 0) {
      router.push('/settings');
    }
  }, []);

  // Focus input when not in reveal state
  useEffect(() => {
    if (!reveal) {
      inputRef.current?.focus();
    }
  }, [currentIndex, reveal]);

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
    if (isFlashcard && currentIndex >= deck.length && currentIndex > 0) {
      handleEndSession();
    }
  }, [currentIndex, reveal]);

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

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 gap-8">

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-sm mb-2">
          {isFlashcard ? (
            <>
              <span className="text-gray-500 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                Card {Math.min(currentIndex + 1, deck.length)} of {deck.length}
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
      <div className={`w-full max-w-md rounded-3xl p-10 transition-all duration-300 ${
        reveal
          ? 'bg-red-50 border-3 border-red-300 shadow-xl shadow-red-200/50'
          : 'bg-white border-3 border-gray-200 shadow-2xl'
      }`} style={{ background: reveal ? '#FEF2F2' : '#FFFEF7' }}>

        {/* Per-card timer */}
        {timeLeft !== null && !reveal && (
          <div className="text-center mb-6">
            <span className={`text-3xl font-bold transition-colors ${
              timeLeft <= 3 ? 'text-red-500' : 'text-gray-400'
            }`} style={{ fontFamily: "'Fredoka', sans-serif" }}>
              &#x23F0; {timeLeft}s
            </span>
          </div>
        )}

        {/* Question */}
        <div className="text-center text-6xl font-bold text-gray-800 mb-10" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          {question}
        </div>

        {/* Reveal state */}
        {reveal ? (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-red-400 font-bold mb-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {reveal.wasTimeout ? "⏰ Time's up!" : '❌ Oops!'}
              </p>
              <p className="text-lg text-gray-500 font-semibold">The answer is</p>
              <p className="text-8xl font-bold text-green-500 mt-3" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {reveal.correctAnswer}
              </p>
            </div>
            <button
              onClick={handleAdvance}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all duration-200 text-xl shadow-lg shadow-blue-300/50 border-b-4 border-blue-700"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Next Card &#x27A1;&#xFE0F;
            </button>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.nativeEvent.stopPropagation();
                  handleSubmit();
                }
              }}
              className="w-full text-center text-5xl bg-yellow-50 border-3 border-yellow-300 text-gray-800 rounded-2xl p-5 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all placeholder-gray-300"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
              placeholder="?"
            />
            <button
              onClick={handleSubmit}
              className="mt-5 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl transition-all duration-200 text-xl shadow-lg shadow-green-300/50 border-b-4 border-green-700"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Submit! &#x2705;
            </button>
          </>
        )}
      </div>

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
