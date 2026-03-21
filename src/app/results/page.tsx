'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';

export default function ResultsPage() {
  const router = useRouter();
  const { lastSession, settings } = useGameStore();

  useEffect(() => {
    if (!lastSession) {
      router.push('/settings');
    }
  }, []);

  if (!lastSession) return null;

  const { cardsAttempted, cardsCorrect, accuracy, totalTime, avgTimePerCard } = lastSession;
  const isFlashcard = settings.mode === 'flashcard';
  const accPct = Math.round(accuracy * 100);

  const emoji = accPct >= 90 ? '&#x1F31F;' : accPct >= 70 ? '&#x1F44D;' : '&#x1F4AA;';
  const heading = accPct >= 90 ? 'Amazing Work!' : accPct >= 70 ? 'Great Effort!' : 'Keep Practicing!';
  const accBg = accPct >= 90 ? 'bg-green-100 border-green-300' : accPct >= 70 ? 'bg-yellow-100 border-yellow-300' : 'bg-red-100 border-red-300';
  const accText = accPct >= 90 ? 'text-green-600' : accPct >= 70 ? 'text-yellow-600' : 'text-red-500';

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-6xl mb-2" dangerouslySetInnerHTML={{ __html: emoji }} />
          <h1 className="text-4xl font-bold text-gray-800" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            {heading}
          </h1>
          <p className="text-lg text-gray-500 font-semibold">Session complete</p>
        </div>

        {/* Big accuracy hero */}
        <div className={`${accBg} border-3 rounded-3xl p-8 text-center shadow-lg`}>
          <div className={`text-8xl font-bold ${accText}`} style={{ fontFamily: "'Fredoka', sans-serif" }}>
            {accPct}%
          </div>
          <div className="text-gray-500 mt-2 text-lg font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Accuracy</div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-100 border-2 border-blue-200 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-blue-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              {cardsCorrect}/{cardsAttempted}
            </div>
            <div className="text-sm text-blue-500 mt-1 font-bold">Correct</div>
          </div>
          {isFlashcard ? (
            <>
              <div className="bg-purple-100 border-2 border-purple-200 rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-purple-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {(totalTime / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-purple-500 mt-1 font-bold">Total Time</div>
              </div>
              <div className="bg-orange-100 border-2 border-orange-200 rounded-2xl p-5 text-center col-span-2">
                <div className="text-3xl font-bold text-orange-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {(avgTimePerCard / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-orange-500 mt-1 font-bold">Avg per Card</div>
              </div>
            </>
          ) : (
            <div className="bg-purple-100 border-2 border-purple-200 rounded-2xl p-5 text-center">
              <div className="text-3xl font-bold text-purple-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {cardsAttempted}
              </div>
              <div className="text-sm text-purple-500 mt-1 font-bold">Cards Done</div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => {
              useGameStore.getState().startSession();
              router.push('/play');
            }}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl transition-all duration-200 text-xl shadow-lg shadow-green-300/50 border-b-4 border-green-700"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            Play Again! &#x1F504;
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="w-full bg-blue-100 hover:bg-blue-200 border-2 border-blue-200 text-blue-600 font-bold py-4 rounded-2xl transition-all duration-200 text-lg"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            Change Settings &#x2699;&#xFE0F;
          </button>
          <button
            onClick={() => router.push('/history')}
            className="w-full bg-purple-100 hover:bg-purple-200 border-2 border-purple-200 text-purple-600 font-bold py-4 rounded-2xl transition-all duration-200 text-lg"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            View History &#x1F4CA;
          </button>
        </div>

      </div>
    </main>
  );
}
