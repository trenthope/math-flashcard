'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useUserStore } from '@/store/userStore';
import { Operation, GameMode } from '@/types';
import { Switch } from '@/components/ui/switch';

const OP_BUTTONS: { value: Operation; symbol: string; label: string; color: string; activeColor: string; shadow: string }[] = [
  { value: 'addition',       symbol: '+', label: 'Addition',       color: 'bg-red-100 border-red-300 text-red-600',     activeColor: 'bg-red-500 border-red-600 text-white',     shadow: 'shadow-red-300/50' },
  { value: 'subtraction',    symbol: '\u2212', label: 'Subtraction', color: 'bg-blue-100 border-blue-300 text-blue-600',   activeColor: 'bg-blue-500 border-blue-600 text-white',   shadow: 'shadow-blue-300/50' },
  { value: 'multiplication', symbol: '\u00d7', label: 'Multiplication', color: 'bg-green-100 border-green-300 text-green-600', activeColor: 'bg-green-500 border-green-600 text-white', shadow: 'shadow-green-300/50' },
  { value: 'division',       symbol: '\u00f7', label: 'Division',      color: 'bg-orange-100 border-orange-300 text-orange-600', activeColor: 'bg-orange-500 border-orange-600 text-white', shadow: 'shadow-orange-300/50' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings, startSession } = useGameStore();
  const { users, currentUserId } = useUserStore();
  const currentUser = users.find((u) => u.id === currentUserId);

  useEffect(() => {
    if (!currentUserId) {
      router.push('/');
    }
  }, [currentUserId, router]);

  const toggleOperation = (op: Operation) => {
    const current = settings.operations;
    if (current.includes(op)) {
      if (current.length <= 1) return;
      updateSettings({ operations: current.filter((o) => o !== op) });
    } else {
      updateSettings({ operations: [...current, op] });
    }
  };

  const handleStart = () => {
    startSession();
    router.push('/play');
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-bold text-gray-800" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            Game Setup &#x2699;&#xFE0F;
          </h1>
          {currentUser && (
            <p className="text-lg text-gray-500 font-semibold">
              Playing as <span className="text-blue-500 font-bold">{currentUser.name}</span>
            </p>
          )}
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 space-y-6 shadow-lg">

          {/* Mode */}
          <section className="space-y-2">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Fredoka', sans-serif" }}>Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {(['flashcard', 'mathminute'] as GameMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateSettings({ mode })}
                  className={`py-3.5 rounded-2xl font-bold text-base transition-all duration-200 border-2 ${
                    settings.mode === mode
                      ? 'bg-blue-500 border-blue-600 text-white shadow-lg shadow-blue-300/50 scale-[1.02]'
                      : 'bg-blue-50 border-blue-200 text-blue-400 hover:bg-blue-100 hover:text-blue-600'
                  }`}
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                  {mode === 'flashcard' ? 'Flashcard' : 'Math Minute'}
                </button>
              ))}
            </div>
          </section>

          <div className="border-t-2 border-dashed border-gray-100" />

          {/* Operations */}
          <section className="space-y-2">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Fredoka', sans-serif" }}>Operations</label>
            <div className="grid grid-cols-4 gap-2">
              {OP_BUTTONS.map(({ value, symbol, label, color, activeColor, shadow }) => {
                const selected = settings.operations.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleOperation(value)}
                    title={label}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-3 py-4 transition-all duration-200 ${
                      selected
                        ? `${activeColor} shadow-lg ${shadow} scale-[1.03]`
                        : `${color} hover:scale-[1.02]`
                    }`}
                  >
                    <span className="text-3xl font-bold leading-none" style={{ fontFamily: "'Fredoka', sans-serif" }}>{symbol}</span>
                    <span className="text-[10px] font-bold leading-none tracking-wide">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="border-t-2 border-dashed border-gray-100" />

          {/* Numbers */}
          <section className="space-y-4">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Fredoka', sans-serif" }}>Numbers</label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-500 font-semibold">Focus Numbers</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateSettings({ focusNumbers: Array.from({ length: 12 }, (_, i) => i + 1) })}
                    className="px-3 py-1.5 rounded-2xl font-bold text-sm border-2 bg-blue-500 border-blue-600 text-white shadow-md shadow-blue-300/50 hover:bg-blue-600 transition-all duration-200"
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (settings.focusNumbers.length > 1) updateSettings({ focusNumbers: [settings.focusNumbers[0]] });
                    }}
                    className="px-3 py-1.5 rounded-2xl font-bold text-sm border-2 bg-blue-50 border-blue-200 text-blue-400 hover:bg-blue-100 hover:text-blue-600 transition-all duration-200"
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  >
                    Deselect all
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                  const selected = settings.focusNumbers.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          if (settings.focusNumbers.length <= 1) return;
                          updateSettings({ focusNumbers: settings.focusNumbers.filter((x) => x !== n) });
                        } else {
                          updateSettings({ focusNumbers: [...settings.focusNumbers, n].sort((a, b) => a - b) });
                        }
                      }}
                      className={`py-3 rounded-2xl font-bold text-lg border-2 transition-all duration-200 ${
                        selected
                          ? 'bg-blue-500 border-blue-600 text-white shadow-md shadow-blue-300/50 scale-[1.05]'
                          : 'bg-blue-50 border-blue-200 text-blue-400 hover:bg-blue-100 hover:text-blue-600'
                      }`}
                      style={{ fontFamily: "'Fredoka', sans-serif" }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-purple-600 font-bold">Range</label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min={1}
                  value={settings.rangeMin}
                  onChange={(e) => updateSettings({ rangeMin: Number(e.target.value) })}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-24 bg-purple-50 border-2 border-purple-300 text-gray-800 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                />
                <span className="text-gray-400 font-bold text-lg" style={{ fontFamily: "'Fredoka', sans-serif" }}>to</span>
                <input
                  type="number"
                  min={1}
                  value={settings.rangeMax}
                  onChange={(e) => updateSettings({ rangeMax: Number(e.target.value) })}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-24 bg-purple-50 border-2 border-purple-300 text-gray-800 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                />
              </div>
            </div>
          </section>

          <div className="border-t-2 border-dashed border-gray-100" />

          {/* Session settings */}
          <section className="space-y-4">
            {settings.mode === 'flashcard' ? (
              <div className="space-y-1.5">
                <label className="text-sm text-green-600 font-bold">Number of Cards</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.deckSize}
                  onChange={(e) => updateSettings({ deckSize: Number(e.target.value) })}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full bg-green-50 border-2 border-green-300 text-gray-800 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-sm text-green-600 font-semibold">Time Limit</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={settings.timeLimit}
                    onChange={(e) => updateSettings({ timeLimit: Number(e.target.value) })}
                    onClick={(e) => e.currentTarget.select()}
                    className="w-24 bg-green-50 border-2 border-green-300 text-gray-800 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  />
                  <span className="text-sm font-bold text-gray-500" style={{ fontFamily: "'Fredoka', sans-serif" }}>seconds</span>
                </div>
              </div>
            )}

            {settings.mode === 'flashcard' && (
              <div className={`rounded-2xl px-4 py-3 border-2 transition-all duration-200 space-y-3 ${
                settings.perCardLimit !== null
                  ? 'bg-orange-50 border-orange-400'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <label className={`text-sm font-bold transition-colors duration-200 ${
                    settings.perCardLimit !== null ? 'text-orange-600' : 'text-gray-500'
                  }`}>
                    ⏱ Per-Card Time Limit
                  </label>
                  <Switch
                    checked={settings.perCardLimit !== null}
                    onCheckedChange={(on) =>
                      updateSettings({ perCardLimit: on ? 5 : null })
                    }
                    className="scale-150 origin-right data-checked:bg-orange-500"
                  />
                </div>
                {settings.perCardLimit !== null && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={settings.perCardLimit}
                      onChange={(e) =>
                        updateSettings({ perCardLimit: Math.max(1, Number(e.target.value)) })
                      }
                      onClick={(e) => e.currentTarget.select()}
                      className="w-24 bg-white border-2 border-orange-300 text-gray-800 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                      style={{ fontFamily: "'Fredoka', sans-serif" }}
                    />
                    <span className="text-sm font-bold text-orange-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>seconds</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-teal-600 font-semibold whitespace-nowrap" style={{ fontFamily: "'Fredoka', sans-serif" }}>Repeat missed cards after</span>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.repeatWindow}
                onChange={(e) => updateSettings({ repeatWindow: Number(e.target.value) })}
                onClick={(e) => e.currentTarget.select()}
                className="w-16 bg-teal-50 border-2 border-teal-300 text-gray-800 rounded-2xl px-3 py-2 text-base font-bold text-center focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              />
              <span className="text-sm text-teal-600 font-semibold" style={{ fontFamily: "'Fredoka', sans-serif" }}>cards</span>
            </div>
          </section>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-5 rounded-3xl transition-all duration-200 text-2xl shadow-xl shadow-green-300/50 hover:shadow-green-400/50 hover:scale-[1.01] active:scale-[0.99] border-b-4 border-green-700"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          Start Playing! &#x1F680;
        </button>

      </div>
    </main>
  );
}
